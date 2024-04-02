import * as fromRust from "../bindings/bindings"

// Base object
export class CanvasElement {
  static parent: HTMLElement //< @warning Should be initialized by Canvas.tsx first
  elem: HTMLElement 
  constructor(elem: HTMLElement) { 
    this.elem = elem; 
    CanvasElement.parent.appendChild(this.elem);
  }
}

// Will hold information regarding decisions / pros / cons / etc. 
export class Node {
  static collectionTitle: string = "";
  static newCollection(title: string) { Node.collectionTitle = title; }

  dataNode: fromRust.Node | undefined = undefined;
  cyNode: any | undefined = undefined; //< TODO - get types for cytoscape.js
}