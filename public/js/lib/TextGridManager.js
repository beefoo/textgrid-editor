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

  onTextGridLoad(file, data) {
    this.isLoading = false;
    this.isLoaded = true;
    this.$filename.text(file.name);
    console.log(data);
  }
}
