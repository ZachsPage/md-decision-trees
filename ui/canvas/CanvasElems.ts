import {Point} from "../Utils"
import adjustLine from "./adjustLine"

// Base object
export class CanvasElement {
  static parent: HTMLElement //< @warning Should be initialized by Canvas.tsx first
  elem: HTMLElement 
  constructor(elem: HTMLElement) { 
    this.elem = elem; 
    CanvasElement.parent.appendChild(this.elem);
  }
}

// Will illustrate decisions / pros / cons / etc. 
export class Node extends CanvasElement {
  static newWidth: string = "100px"
  static newHeight: string = "50px"
  static nodes: Node[] = []

  lines: Line[] = []; 

  constructor(position: Point, text: string = "") { 
    let elem = document.createElement('div');
    elem.className = 'node';
    elem.style.left = `${position.x - CanvasElement.parent.offsetLeft}px`;
    elem.style.top = `${position.y - CanvasElement.parent.offsetTop}px`;
    elem.style.width = Node.newWidth;
    elem.style.height = Node.newHeight;
    elem.innerHTML = text;
    super(elem)
    Node.nodes.push(this);
  }

  redrawLines() { this.lines.forEach((line: Line) => { line.redraw(); }); }
};

// Connects Nodes
export class Line extends CanvasElement {
  to: Node; 
  from: Node; 

  constructor(to: Node, from: Node) { 
    const elem = document.createElement('div');
    elem.className = 'line';
    super(elem);
    this.to = to; 
    this.from = from;
    to.lines.push(this);
    from.lines.push(this);
    adjustLine(from.elem, to.elem, this.elem);
  }

  redraw() { adjustLine(this.from.elem, this.to.elem, this.elem); }
};