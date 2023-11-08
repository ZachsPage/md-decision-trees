import "./Canvas.css";
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
    function isLeftClick(event: MouseEvent): boolean { return event.button == 0; }
    function holdingCreateButton(event: MouseEvent): boolean { return event.ctrlKey; }
    // - Bind them
    canvas.addEventListener('click', (event) => {
      if (isLeftClick(event)) {
        if (holdingCreateButton(event) && !isDragging) {
          drawNode(Point.fromMouse(event))
          return;
        }
      }
    });
    canvas.addEventListener('wheel', (event) => { handleZoomEvent(event.deltaY > 0); });
    canvas.addEventListener('mousedown', (event) => { updateDragState(MouseState.Down, Point.fromMouse(event)); });
    document.addEventListener('mouseup', (event) => { updateDragState(MouseState.Up, Point.fromMouse(event)); });
    document.addEventListener('mousemove', (event) => { updateDragState(MouseState.Moving, Point.fromMouse(event)); });

    // Node creation
    let newNodeWidth: string = "100px"
    let newNodeHeight: string = "50px"

    function drawNode(mousePos: Point) {
      const node = document.createElement('div');
      node.className = 'node';
      node.style.left = `${mousePos.x - canvas.offsetLeft}px`;
      node.style.top = `${mousePos.y - canvas.offsetTop}px`;
      node.style.width = newNodeWidth;
      node.style.height = newNodeHeight;
      canvas.appendChild(node);
    }

    // Scale elements while zooming
    function handleZoomEvent(wasZoomIn: boolean) {
      const ZOOM_AMOUNT = 2
      const zoomDelta = wasZoomIn ? ZOOM_AMOUNT : -ZOOM_AMOUNT;
      let updatedSize: boolean = false;
      document.querySelectorAll('.node').forEach((node: HTMLElement) => {
        if (!updatedSize) { // For now, generate new size once since all nodes are the same size
          updatedSize = true;
          const newWidth = node.offsetWidth + zoomDelta;
          const newHeight = node.offsetHeight + zoomDelta;
          if (newWidth > 0 && newHeight > 0) { // Store new size according to zoom
            newNodeWidth = `${newWidth}px`;
            newNodeHeight = `${newHeight}px`;
          }
        }
        if (updatedSize) {
          node.style.width = newNodeWidth;
          node.style.height = newNodeHeight;
        }
      });
    }

    // Move elements while dragging
    let dragMousePos: Point = new Point(0, 0);
    let isDragging: boolean = false; //< Drag state

    enum MouseState { Down, Up, Moving };
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
      document.querySelectorAll('.node').forEach((node: HTMLElement) => {
        node.style.left = `${parseInt(node.style.left) + deltaX}px`
        node.style.top = `${parseInt(node.style.top) + deltaY}px`
      });
    }

  }, []); //< End useEffect

  return <div className="canvas"></div>;
};

export default Canvas;