class TextGridManager {
  constructor(options = {}) {
    const defaults = {};
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.isLoading = false;
  }

  loadTextGridFromFile(file) {
    if (this.isLoading) return;
    this.isLoading = true;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const data = reader.result;
      const textGridData = TextGrid.textgridToIGT(data);
      this.onTextGridLoad(textGridData);
    });
    reader.readAsText(file);
  }

  onTextGridLoad(data) {
    this.isLoading = false;
    console.log('Loaded TextGrid data');
    console.log(data);
  }
}
