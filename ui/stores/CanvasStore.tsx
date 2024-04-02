import {makeObservable, observable, action} from 'mobx';

export class CanvasStore {
  filePath: string = ""
  saveNodesToFilePath: string = ""

  constructor() {
    makeObservable(this, {
      filePath: observable,
      saveNodesToFilePath: observable,
      setFilePath: action,
      setSaveNodesToFilePath: action
    });
  }

  setFilePath = (newFilePath: string) => {
    this.filePath = newFilePath;
  }

  setSaveNodesToFilePath = (newFilePath: string) => {
    this.saveNodesToFilePath = newFilePath;
  }
}

export const canvasStore = new CanvasStore();
