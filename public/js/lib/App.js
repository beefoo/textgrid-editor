class App {
  constructor(options = {}) {
    const defaults = {};
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.audioManager = new AudioManager();
    this.textgridManager = new TextGridManager();
    this.loadListeners();
  }

  loadListeners() {
    $('#fileinput').off().on('change', (e) => this.onFileInput(e));
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
}
