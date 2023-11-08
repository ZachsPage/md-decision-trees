import "./Canvas.css";
import {Point, MouseState, isLeftClick} from "../Utils"
import {CanvasElement, Node, Line} from "./CanvasElems"
import {Pan} from "./Pan"

import React, { useEffect } from 'react';

// What is drawn on / shows nodes
const Canvas: React.FC = () => {
  useEffect(() => {
    CanvasElement.parent = document.querySelector('.canvas') as HTMLElement;
    const canvas = CanvasElement.parent;
    const panning = new Pan();

    // Demo - show some nodes connected with some lines
    const node1 = new Node(new Point(200, 100))
    const node2 = new Node(new Point(300, 200))
    const node3 = new Node(new Point(400, 100))
    const line1 = new Line(node1, node2);
    const line2 = new Line(node2, node3);
    const line3 = new Line(node3, node1);

    // Mouse / key events
    // - Bind them
    function holdingCreateButton(event: MouseEvent): boolean { return event.ctrlKey; }
    canvas.addEventListener('mousedown', (event) => { 
      if (!isLeftClick(event)) { return; }
      if (holdingCreateButton(event) && !panning.isActive) {
        new Node(Point.fromMouse(event))
        return;
      }
      panning.update(MouseState.Down, Point.fromMouse(event)); 
    });
    document.addEventListener('mouseup', (event) => { panning.update(MouseState.Up, Point.fromMouse(event)); });
    document.addEventListener('mousemove', (event) => { panning.update(MouseState.Moving, Point.fromMouse(event)); });
    canvas.addEventListener('wheel', (event) => { handleZoomEvent(event.deltaY > 0); });

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
  }, []);

  return <div className="canvas"></div>;
};

export default Canvas;