class AudioManager {
  constructor(options = {}) {
    const defaults = {
      fadeIn: 0.025,
      fadeOut: 0.025,
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.isLoading = false;
    this.isLoaded = false;
    this.isRangeSet = false;
    this.$filename = $('.audio-filename');
    this.loadUI();
    this.loadListeners();
  }

  static formatSeconds(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    if (seconds >= 3600) return date.toISOString().substring(11, 19);
    return date.toISOString().substring(14, 19);
  }

  loadListeners() {
    const delayedResize = _.debounce((e) => this.onResize(), 250);
    $(window).on('resize', delayedResize);
    $('.main').on('mousemove', (e) => this.onMouseMove(e));
  }

  loadSoundFromFile(file) {
    if (this.isLoading) return;
    const { $filename } = this;
    this.audioContext = new AudioContext();
    this.isLoading = true;
    const reader = new FileReader();
    reader.addEventListener('progress', (event) => {
      let progress = 0;
      if (event.total && event.loaded && event.loaded > 0 && event.total > 0) {
        progress = Math.round((event.loaded / event.total) * 100);
      }
      $filename.text(`Loading file: ${progress}% complete`);
    });
    reader.addEventListener('load', () => {
      $filename.text('Processing file...');
      const audioData = reader.result;
      this.audioContext.decodeAudioData(audioData).then((buffer) => {
        this.audioBuffer = buffer;
        this.onSoundLoad(file);
      });
    });
    $filename.text('Loading file: 0% complete');
    reader.readAsArrayBuffer(file);
  }

  loadUI() {
    this.$canvas = $('#waveform');
    this.canvas = this.$canvas[0];
    this.$window = $('#audio-window');
    this.$marker = $('#audio-marker');
    this.onResize();
  }

  onMouseMove(e) {
    if (!this.isLoaded || !this.isRangeSet) return;
    const t = e.clientX / this.windowWidth;
    this.setMarker(t);
  }

  onResize() {
    this.windowWidth = $(window).width();
    const w = this.$canvas.width();
    const h = this.$canvas.height();
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvasCtx = this.canvas.getContext('2d');
    this.canvasCtx.fillStyle = 'white';
    this.render();
  }

  onSoundLoad(file) {
    this.isLoading = false;
    this.isLoaded = true;

    const seconds = this.audioBuffer.duration;
    const formattedTime = this.constructor.formatSeconds(seconds);
    this.duration = seconds;
    this.$filename.text(file.name);
    this.render();
    // console.log(`Loaded ${file.name} with duration ${formattedTime}`);
  }

  playSegment(start, end) {
    if (!this.isLoaded) return;

    const { fadeIn, fadeOut } = this.options;
    const ctx = this.audioContext;
    const dur = end - start + fadeIn + fadeOut;
    const offsetStart = Math.max(0, start - fadeIn);
    const audioSource = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;

    // set audio buffer
    audioSource.buffer = this.audioBuffer;

    // fade in
    gainNode.gain.setValueAtTime(Number.EPSILON, now);
    gainNode.gain.exponentialRampToValueAtTime(1, now + fadeIn);
    // fade out
    gainNode.gain.setValueAtTime(1, now + dur - fadeOut);
    gainNode.gain.exponentialRampToValueAtTime(Number.EPSILON, now + dur);

    // connect and play
    audioSource.connect(gainNode);
    gainNode.connect(ctx.destination);
    audioSource.start(0, offsetStart, dur);
  }

  render() {
    if (!this.isLoaded || !this.isRangeSet) return;
    const ctx = this.canvasCtx;
    const { width, height } = this.canvas;
    const { rangeStart, rangeEnd } = this;
    const data = this.audioBuffer.getChannelData(0);
    const { sampleRate } = this.audioBuffer;
    const sampleStart = Math.round(rangeStart * sampleRate);
    const sampleEnd = Math.floor(rangeEnd * sampleRate);
    const segment = data.slice(sampleStart, sampleEnd);
    const samples = segment.length;

    // https://github.com/meandavejustice/draw-wave/blob/master/index.js
    ctx.clearRect(0, 0, width, height);
    const step = Math.ceil(samples / width);
    const amp = height / 2;
    for (let i = 0; i < width; i += 1) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j += 1) {
        const datum = segment[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      const x = i;
      const y = (1 + min) * amp;
      const w = 1;
      const h = Math.max(1, (max - min) * amp);
      ctx.fillRect(x, y, w, h);
    }
  }

  setMarker(percent) {
    this.$marker.css('left', `${percent * 100}%`);
  }

  setRange(start, end) {
    this.isRangeSet = true;
    this.rangeStart = start;
    this.rangeEnd = end;
    this.render();
  }

  setWindow(start, end) {
    if (!this.isRangeSet) return;
    const { rangeStart, rangeEnd } = this;
    const range = rangeEnd - rangeStart;
    const width = ((end - start) / range) * 100;
    const left = ((start - rangeStart) / range) * 100;
    this.$window.css({
      width: `${width}%`,
      left: `${left}%`,
    });
  }
}
