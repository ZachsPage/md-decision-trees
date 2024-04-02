import { makeObservable, observable, action, computed } from 'mobx';

export class ErrorStore {
  errors:string[] = [];
  has_new_errors:boolean = false;

  constructor() {
    makeObservable(this, {
      errors: observable,
      has_new_errors: observable,
      addError: action,
      clearNewErrorFlag: action,
      errorsReversed: computed,
    });
  }

  addError = (newError: string) => {
    console.log(newError);
    this.errors.push(newError);
    this.has_new_errors = true;
  }

  clearNewErrorFlag = () => {
    this.has_new_errors = false;
  }

  get errorsReversed() {
    return this.errors.slice().reverse();
  }
}

export const errorStore = new ErrorStore();