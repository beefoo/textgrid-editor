class App {
  constructor(options = {}) {
    const defaults = {};
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.audioManager = new AudioManager();
    this.textgridManager = new TextGridManager({
      onChangeWord: (word) => this.onChangeWord(word),
      onClickSegment: (segment) => this.onClickSegment(segment),
      onLoadWord: (textgrid) => this.onLoadWord(textgrid),
    });
    this.loadListeners();
  }

  loadListeners() {
    $('#fileinput').off().on('change', (e) => this.onFileInput(e));
  }

  onChangeWord(word) {
    this.audioManager.setWindow(word.start, word.end);
  }

  onClickSegment(segment) {
    this.audioManager.playSegment(segment.start, segment.end);
  }

  onFileInput(event) {
    const el = event.currentTarget;
    if (!el.files || el.files.length <= 0) return false;

    let foundMedia = false;
    let foundTextGrid = false;
    const foundBoth = _.find(el.files, (file) => {
      const isMedia = file.type.startsWith('audio') || file.type.startsWith('video');
      const isTextGrid = file.name.endsWith('TextGrid');
      if (!foundMedia && isMedia) {
        this.audioManager.loadSoundFromFile(file);
        foundMedia = true;
      } else if (!foundTextGrid && isTextGrid) {
        this.textgridManager.loadTextGridFromFile(file);
        foundTextGrid = true;
      }
      return (foundMedia && foundTextGrid);
    });
    return foundBoth;
  }

  onLoadWord(textgrid) {
    const range = textgrid.getCurrentRange();
    this.audioManager.setRange(range.start, range.end);
  }
}
