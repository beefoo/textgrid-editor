class TextGridManager {
  constructor(options = {}) {
    const defaults = {
      minPhoneDuration: 0.01,
      onChangeWord: (word) => console.log(word),
      onClickSegment: (segment) => console.log(segment),
      onLoadWord: (textgrid) => console.log(textgrid),
      secondStep: 0.01,
      wordMargin: 1,
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.isLoading = false;
    this.isLoaded = false;
    this.$filename = $('.textgrid-filename');
    this.$words = $('#words');
    this.$transcript = $('#transcript');
    this.$downloadButton = $('.download-textgrid');
    this.$downloadLink = $('#download-link');
    this.duration = 0;
    this.currentWordIndex = -1;
  }

  download() {
    if (!this.isLoaded) return;
    // console.log(this.rawData);

    const d = this.rawData;
    const eol = '\r\n';
    const sp = '    ';
    const sp2 = `${sp}${sp}`;
    const sp3 = `${sp}${sp}${sp}`;
    let t = '';
    t += `File type = "${d.File_type}"${eol}`;
    t += `Object class = "${d.Object_class}"${eol}`;
    t += eol;
    t += `xmin = ${d.xmin} ${eol}`;
    t += `xmax = ${d.xmax} ${eol}`;
    t += `tiers? <exists> ${eol}`;
    t += `size = ${d.size} ${eol}`;

    t += 'item []: \n';
    d.items.forEach((item, i) => {
      t += `${sp}item [${i + 1}]:${eol}`;
      t += `${sp2}class = "${item.class}" ${eol}`;
      t += `${sp2}name = "${item.name}" ${eol}`;
      t += `${sp2}xmin = ${item.xmin} ${eol}`;
      t += `${sp2}xmax = ${item.xmax} ${eol}`;
      t += `${sp2}intervals: size = ${item.intervals_size} ${eol}`;
      let datum = this.data;
      if (item.name === 'phones') {
        datum = _.pluck(datum, 'phones');
        datum = _.flatten(datum, 1);
      }
      datum.forEach((dd, j) => {
        t += `${sp2}intervals [${j + 1}]:${eol}`;
        t += `${sp3}xmin = ${dd.start} ${eol}`;
        t += `${sp3}xmax = ${dd.end} ${eol}`;
        t += `${sp3}text = "${dd.text}" ${eol}`;
      });
    });

    const uri = `data:application/txt,${encodeURIComponent(t)}`;
    this.$downloadLink.attr('href', uri);
    this.$downloadLink[0].click();
  }

  getCurrentRange() {
    const segment = {};
    if (this.currentWordIndex < 0) return segment;

    const words = this.getVisibleWords(this.currentWordIndex);
    segment.start = words[0].start;
    segment.end = words[2].end;

    return segment;
  }

  getVisibleWords(index) {
    const wordCount = this.data.length;
    const { wordMargin } = this.options;
    let minIndex = index - wordMargin;
    let maxIndex = index + wordMargin;
    if (minIndex < 0) {
      maxIndex -= minIndex;
      minIndex = 0;
    }
    if (maxIndex >= wordCount) {
      minIndex -= (maxIndex - wordCount + 1);
      maxIndex = wordCount - 1;
    }
    return this.data.filter((word, i) => i >= minIndex && i <= maxIndex);
  }

  loadListeners() {
    this.$transcript.on('click', '.select-word', (e) => this.selectWord(e));
    this.$words.on('input', '.phone-start', (e) => this.updatePhoneStart(e));
    this.$words.on('click', '.segment', (e) => this.onClickSegment(e));
    this.$downloadButton.on('click', (e) => {
      this.download();
    });
  }

  loadTextGridFromFile(file) {
    if (this.isLoading) return;
    this.isLoading = true;
    const reader = new FileReader();
    this.$filename.text('Loading...');
    reader.addEventListener('load', () => {
      const data = reader.result;
      const textGridData = TextGrid.textgridToIGT(data);
      this.onTextGridLoad(file, textGridData);
    });
    reader.readAsText(file);
  }

  loadUI() {
    const { data } = this;
    const { secondStep } = this.options;
    // load transcript
    let html = '';
    data.forEach((word, i) => {
      const text = word.text !== '' ? word.text : '_';
      const disabled = i === 0 || i === data.length - 1 ? 'disabled' : '';
      html += `<button class="word select-word" data-word="${i}" ${disabled}>${text}</button>`;
    });
    this.$transcript.html(html);

    // load words and phones
    html = '';
    data.forEach((word, i) => {
      const { start, dur } = word;
      html += `<div class="word-wrapper" data-word="${i}">`;
      html += ' <div class="word">';
      html += `  <button class="word-text segment" data-word="${i}">${word.text}</button>`;
      html += ' </div>';
      html += ' <div class="phones">';
      word.phones.forEach((phone, j) => {
        const width = ((phone.dur) / dur) * 100;
        const left = ((phone.start - start) / dur) * 100;
        const style = `style="width: ${width}%; left: ${left}%"`;
        html += ` <div class="phone" data-word="${i}" data-phone="${j}" ${style}>`;
        html += `  <button class="phone-text segment" data-word="${i}" data-phone="${j}">${phone.text}</button>`;
        html += `  <label for="p${i}-${j}" class="visually-hidden">Audio start value for ${phone.text}</label>`;
        html += `  <input id="p${i}-${j}" type="number" value="${phone.start}" step="${secondStep}" class="phone-start" data-word="${i}" data-phone="${j}" />`;
        html += ' </div>';
      });
      html += ' </div>';
      html += '</div>';
    });
    this.$words.html(html);
  }

  loadWord(index) {
    if (index === this.currentWordIndex) return;
    $('.select-word').removeClass('selected');
    $(`.select-word[data-word="${index}"]`).addClass('selected');
    $('.word-wrapper').removeClass('visible active');
    const visibleWords = this.getVisibleWords(index);
    const totalDur = visibleWords.reduce((prev, word) => prev + word.dur, 0);
    const phraseStart = visibleWords[0].start;
    visibleWords.forEach((word, i) => {
      const $word = $(`.word-wrapper[data-word="${word.index}"]`);
      const width = ((word.dur) / totalDur) * 100;
      const left = ((word.start - phraseStart) / totalDur) * 100;
      $word.css({
        width: `${width}%`,
        left: `${left}%`,
      });
      $word.addClass('visible');
      if (i === 1) $word.addClass('active');
    });
    this.currentWordIndex = index;
    this.options.onLoadWord(this);
    this.options.onChangeWord(visibleWords[1]);
  }

  onClickSegment(e) {
    const $el = $(e.currentTarget);
    let segment = {};
    if ($el.is('[data-word]')) {
      const i = parseInt($el.attr('data-word'), 10);
      if ($el.is('[data-phone]')) {
        const j = parseInt($el.attr('data-phone'), 10);
        segment = this.data[i].phones[j];
      } else {
        segment = this.data[i];
      }
    } else {
      segment = this.getCurrentRange();
    }
    this.options.onClickSegment(segment);
  }

  onTextGridLoad(file, data) {
    this.isLoading = false;
    this.rawData = data;
    this.data = this.constructor.parseData(data);
    if (this.data === false) return;
    this.duration = _.max(this.data, (word) => word.end);
    this.isLoaded = true;
    // console.log(this.data);
    this.$filename.text(file.name);
    this.$downloadLink.attr('download', file.name);
    this.loadUI();
    this.loadListeners();
    this.loadWord(1);
  }

  static parseData(rawData) {
    const rawWords = _.findWhere(rawData.items, { name: 'words' });
    const rawPhones = _.findWhere(rawData.items, { name: 'phones' });
    if (rawWords === undefined) {
      alert('TextGrid must have \'words\' entry');
      return false;
    }
    if (rawPhones === undefined) {
      alert('TextGrid must have \'phones\' entry');
      return false;
    }
    const phones = rawPhones.intervals.map((interval, i) => {
      const phone = _.clone(interval);
      phone.start = parseFloat(interval.xmin);
      phone.end = parseFloat(interval.xmax);
      phone.dur = phone.end - phone.start;
      return phone;
    });
    const words = rawWords.intervals.map((interval, i) => {
      const word = _.clone(interval);
      word.index = i;
      word.start = parseFloat(interval.xmin);
      word.end = parseFloat(interval.xmax);
      word.dur = word.end - word.start;
      word.phones = _.filter(phones, (phone) => phone.start >= word.start && phone.end <= word.end);
      return word;
    });
    return words;
  }

  selectWord(event) {
    const $button = $(event.currentTarget);
    const index = parseInt($button.attr('data-word'), 10);
    if (index <= 0 || index >= this.data.length - 1) return;
    this.loadWord(index);
  }

  updatePhoneStart(event) {
    const { data } = this;
    const { minPhoneDuration, secondStep } = this.options;

    // retrieve input values
    const $input = $(event.currentTarget);
    const i = parseInt($input.attr('data-word'), 10);
    const j = parseInt($input.attr('data-phone'), 10);
    const word = data[i];
    const phone = word.phones[j];
    let newStart = parseFloat($input.val());
    newStart = MathUtil.roundToNearest(newStart, secondStep);

    // calculate bounds
    const prevWord = i > 0 ? data[i - 1] : false;
    const prevWordPhone = prevWord !== false ? _.last(prevWord.phones) : false;
    const prevPhone = j > 0 ? word.phones[j - 1] : prevWordPhone;
    let minStart = prevPhone !== false ? prevPhone.start + minPhoneDuration : 0;
    let maxStart = phone.end - minPhoneDuration;
    minStart = MathUtil.roundToNearest(minStart, secondStep);
    maxStart = MathUtil.roundToNearest(maxStart, secondStep);

    // clamp value to bounds
    if (newStart < minStart) $input.val(minStart);
    if (newStart > maxStart) $input.val(maxStart);
    newStart = MathUtil.clamp(newStart, minStart, maxStart);

    // update data
    this.data[i].phones[j].start = newStart;
    this.data[i].phones[j].dur = phone.end - newStart;
    if (j > 0) {
      this.data[i].phones[j - 1].end = newStart;
      this.data[i].phones[j - 1].dur = newStart - prevPhone.start;
    } else {
      this.data[i].start = newStart;
      this.data[i].dur = word.end - newStart;
      if (i > 0) {
        const prevWordPhoneIndex = this.data[i - 1].phones.length - 1;
        this.data[i - 1].phones[prevWordPhoneIndex].end = newStart;
        this.data[i - 1].phones[prevWordPhoneIndex].dur = newStart - prevPhone.start;
        this.data[i - 1].end = newStart;
        this.data[i - 1].dur = newStart - this.data[i - 1].start;
      }
    }

    // update UI
    const visibleWords = this.getVisibleWords(this.currentWordIndex);
    const totalDur = visibleWords.reduce((prev, w) => prev + w.dur, 0);
    const phraseStart = visibleWords[0].start;
    visibleWords.forEach((w, wi) => {
      const $word = $(`.word-wrapper[data-word="${w.index}"]`).first();
      const width = ((w.dur) / totalDur) * 100;
      const left = ((w.start - phraseStart) / totalDur) * 100;
      $word.css({
        width: `${width}%`,
        left: `${left}%`,
      });
      w.phones.forEach((p, pi) => {
        const $phone = $word.find(`.phone[data-phone="${pi}"]`);
        const pwidth = (p.dur / w.dur) * 100;
        const pleft = ((p.start - w.start) / w.dur) * 100;
        $phone.css({
          width: `${pwidth}%`,
          left: `${pleft}%`,
        });
      });
    });

    this.options.onChangeWord(visibleWords[1]);
  }
}
