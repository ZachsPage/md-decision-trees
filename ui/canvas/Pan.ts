import {CanvasElement, Node} from "./CanvasElems"
import {Point, MouseState} from "../Utils"

// Handle panning around the canvas
export class Pan {
  isActive: boolean = false;
  initMousePos: Point = new Point(0, 0);

  update(mouseState: MouseState, mousePos: Point) {
    if (!this.isActive && mouseState == MouseState.Down) {
      this.isActive = true;
      CanvasElement.parent.style.cursor = 'grabbing';
      this.initMousePos.update(mousePos.x, mousePos.y);
    } else if (this.isActive) {
      if(mouseState == MouseState.Moving) {
        this.doPanning(mousePos);
      } else if (mouseState == MouseState.Up) {
        this.isActive = false;
        CanvasElement.parent.style.cursor = 'grab';
      } 
    }
  }

  doPanning(mousePos: Point) {
    const [deltaX, deltaY] = this.initMousePos.getDiff(mousePos.x, mousePos.y);
    this.initMousePos = mousePos;
    Node.nodes.forEach((nodeObj: Node ) => {
      let style = nodeObj.elem.style;
      style.left = `${parseInt(style.left) + deltaX}px`
      style.top = `${parseInt(style.top) + deltaY}px`
      nodeObj.redrawLines();
    });
  }
};