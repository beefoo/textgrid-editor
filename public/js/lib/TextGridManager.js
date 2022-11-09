class TextGridManager {
  constructor(options = {}) {
    const defaults = {};
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.isLoading = false;
    this.isLoaded = false;
    this.$filename = $('.textgrid-filename');
    this.$words = $('#words');
    this.$transcript = $('#transcript');
  }

  loadListeners() {
    this.$transcript.on('click', '.select-word', (e) => this.selectWord(e));
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
    // load transcript
    let html = '';
    data.forEach((word, i) => {
      const text = word.text !== '' ? word.text : '_';
      html += `<button class="word select-word" data-word="${i}">${text}</button>`;
    });
    this.$transcript.html(html);

    // load words and phones
    html = '';
    data.forEach((word, i) => {
      const { start, dur } = word;
      html += `<div class="word" data-word="${i}">`;
      html += ` <button class="word-text" data-word="${i}">${word.text}</button>`;
      html += ' <div class="phones">';
      word.phones.forEach((phone, j) => {
        const width = ((phone.dur) / dur) * 100;
        const left = ((phone.start - start) / dur) * 100;
        const style = `style="width: ${width}%; left: ${left}%"`;
        html += ` <button class="phone-text" data-word="${i}" data-phone="${j}" ${style}>${phone.text}</button>`;
      });
      html += ' </div>';
      html += '</div>';
    });
    this.$words.html(html);
  }

  loadWord(index) {
    $('.select-word').removeClass('selected');
    $(`.select-word[data-word="${index}"]`).addClass('selected');
    const wordCount = this.data.length;
    const wordMargin = 1;
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
    const visibleWords = this.data.filter((word, i) => i >= minIndex && i <= maxIndex);
    $('.word').removeClass('visible active');
    const totalDur = visibleWords.reduce((prev, word) => prev + word.dur, 0);
    const phraseStart = visibleWords[0].start;
    visibleWords.forEach((word, i) => {
      const $word = $(`.word[data-word="${word.index}"]`);
      const width = ((word.dur) / totalDur) * 100;
      const left = ((word.start - phraseStart) / totalDur) * 100;
      $word.css({
        width: `${width}%`,
        left: `${left}%`,
      });
      $word.addClass('visible');
      if (i === 1) $word.addClass('active');
    });
  }

  onTextGridLoad(file, data) {
    this.isLoading = false;
    this.rawData = data;
    this.data = this.constructor.parseData(data);
    if (this.data === false) return;
    this.isLoaded = true;
    // console.log(this.data);
    this.$filename.text(file.name);
    this.loadUI();
    this.loadListeners();
    this.loadWord(0);
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
    this.loadWord(index);
  }
}
