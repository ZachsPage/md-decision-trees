import {makeObservable, observable, action} from 'mobx';

export class CanvasStore {
  filePath: string = ""

  constructor() {
    makeObservable(this, {
      filePath: observable,
      setFilePath: action
    });
  }

  setFilePath = (newFilePath: string) => {
    this.filePath = newFilePath;
    console.log("Updated filePath to ", newFilePath);
  }
}