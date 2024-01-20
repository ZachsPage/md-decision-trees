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
// - Technically a CanvasElement, but not since nothing to display
export class Node {
  static nodes: Node[] = []
  dataNode: fromRust.Node | undefined = undefined;
  cyNode: any | undefined = undefined; //< TODO - get types for cytoscape.js

  constructor() { 
    Node.nodes.push(this);
  }
}