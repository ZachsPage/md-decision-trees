import {makeObservable, observable, action} from 'mobx';
import {setLastOpenedFile} from './PersistedSettings';

export class CanvasStore {
  filePath: string = ""
  saveNodesToFilePath: string = ""
  showKeyboardHelp: boolean = true

  constructor() {
    makeObservable(this, {
      filePath: observable,
      saveNodesToFilePath: observable,
      showKeyboardHelp: observable,
      setFilePath: action,
      setSaveNodesToFilePath: action,
      toggleKeyboardHelp: action,
    });
  }

  setFilePath = (newFilePath: string) => {
    this.filePath = newFilePath;
    if (newFilePath.length > 0 && !newFilePath.startsWith("TEST_FILE:")) { setLastOpenedFile(newFilePath); }
  }

  setSaveNodesToFilePath = (newFilePath: string) => {
    this.saveNodesToFilePath = newFilePath;
  }

  toggleKeyboardHelp = () => {
    this.showKeyboardHelp = !this.showKeyboardHelp;
  }
}

export const canvasStore = new CanvasStore();
