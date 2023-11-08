import "./Canvas.css";
import adjustLine from "./adjustLine.ts"
import React, { useEffect } from 'react';

const Canvas: React.FC = () => {
  useEffect(() => {
    class Point { 
      x: number = 0; y: number = 0;
      constructor(x: number, y: number) { this.update(x, y); }
      update(x: number, y: number) { this.x = x; this.y = y; }
      getDiff(x: number, y: number): [number, number] {
        return [x - this.x, y - this.y];
      }
      static fromMouse(event: MouseEvent) { return new Point(event.clientX, event.clientY); }
    }

    const canvas = document.querySelector('.canvas') as HTMLElement;

    // Mouse / key events
    // - Utils
    enum MouseState { Down, Up, Moving };
    function isLeftClick(event: MouseEvent): boolean { return event.button == 0; }
    function holdingCreateButton(event: MouseEvent): boolean { return event.ctrlKey; }
    // - Bind them
    canvas.addEventListener('click', (event) => {
      if (isLeftClick(event)) {
        if (holdingCreateButton(event) && !isDragging) {
          new Node(Point.fromMouse(event))
          return;
        }
      }
    });
    canvas.addEventListener('wheel', (event) => { handleZoomEvent(event.deltaY > 0); });
    canvas.addEventListener('mousedown', (event) => { updateDragState(MouseState.Down, Point.fromMouse(event)); });
    document.addEventListener('mouseup', (event) => { updateDragState(MouseState.Up, Point.fromMouse(event)); });
    document.addEventListener('mousemove', (event) => { updateDragState(MouseState.Moving, Point.fromMouse(event)); });

    // Node creation
    class CanvasElement {
      elem: HTMLElement 
      constructor(elem: HTMLElement) { 
        this.elem = elem; 
        canvas.appendChild(this.elem);
      }
    }

    class Node extends CanvasElement {
      static newWidth: string = "100px"
      static newHeight: string = "50px"
      static nodes: Node[] = []

      lines: Line[] = []; 

      constructor(position: Point) { 
        let elem = document.createElement('div');
        elem.className = 'node';
        elem.style.left = `${position.x - canvas.offsetLeft}px`;
        elem.style.top = `${position.y - canvas.offsetTop}px`;
        elem.style.width = Node.newWidth;
        elem.style.height = Node.newHeight;
        super(elem)
        Node.nodes.push(this);
      }

      redrawLines() { this.lines.forEach((line: Line) => { line.redraw(); }); }
    };

    class Line extends CanvasElement {
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

    // TODO - remove once testing is done
    let node1 = new Node(new Point(200, 100))
    let node2 = new Node(new Point(300, 200))
    let node3 = new Node(new Point(400, 100))
    let line1 = new Line(node1, node2);
    let line2 = new Line(node2, node3);
    let line3 = new Line(node3, node1);

    // Scale elements while zooming
    function handleZoomEvent(wasZoomIn: boolean) {
      const ZOOM_AMOUNT = 2
      const zoomDelta = wasZoomIn ? ZOOM_AMOUNT : -ZOOM_AMOUNT;
      let updatedSize: boolean = false;
      Node.nodes.forEach((nodeObj: Node ) => {
        let node = nodeObj.elem;
        if (!updatedSize) { // For now, generate new size once since all nodes are the same size
          updatedSize = true;
          const newWidth = node.offsetWidth + zoomDelta;
          const newHeight = node.offsetHeight + zoomDelta;
          if (newWidth > 0 && newHeight > 0) { // Store new size according to zoom
            Node.newWidth = `${newWidth}px`;
            Node.newHeight = `${newHeight}px`;
          }
        }
        if (updatedSize) {
          node.style.width = Node.newWidth;
          node.style.height = Node.newHeight;
          nodeObj.redrawLines();
        }
      });
    }

    // Move elements while dragging
    let dragMousePos: Point = new Point(0, 0);
    let isDragging: boolean = false; //< Drag state

    function updateDragState(mouseState: MouseState, mousePos: Point) {
      if (!isDragging && mouseState == MouseState.Down) {
        isDragging = true;
        canvas.style.cursor = 'grabbing';
        dragMousePos.update(mousePos.x, mousePos.y);
      } else if (isDragging) {
        if(mouseState == MouseState.Moving) {
          handleDragging(mousePos);
        } else if (mouseState == MouseState.Up) {
          isDragging = false;
          canvas.style.cursor = 'grab';
        } 
      }
    }

    function handleDragging(mousePos: Point) {
      const [deltaX, deltaY] = dragMousePos.getDiff(mousePos.x, mousePos.y);
      dragMousePos = mousePos;
      Node.nodes.forEach((nodeObj: Node ) => {
        let style = nodeObj.elem.style;
        style.left = `${parseInt(style.left) + deltaX}px`
        style.top = `${parseInt(style.top) + deltaY}px`
        nodeObj.redrawLines();
      });
    }

  }, []); //< End useEffect

  return <div className="canvas"></div>;
};

export default Canvas;