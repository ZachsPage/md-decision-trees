import "./Canvas.css";
import {Point, MouseState, isLeftClick} from "../Utils"
import {CanvasElement} from "./CanvasElems"
import * as fromRust from "../bindings/bindings"
import {Renderer} from "./Render"

import React, { useEffect } from 'react';

interface CanvasProps {
  handleError: (newError: string) => void;
};

// What is drawn on / shows nodes
const Canvas: React.FC<CanvasProps> = ({handleError}) => {
  useEffect(() => {
    CanvasElement.parent = document.querySelector('.canvas') as HTMLElement;
    const canvas = CanvasElement.parent;

    // Demo - show retrieving nodes from file read by Rust - TODO - make this async
    let node_promise: Promise<fromRust.Nodes> = fromRust.getNodes("placeholder_file_path.md");
    node_promise
      .catch((error) => console.error(error))
      .then((nodes: fromRust.Nodes | void) => {
        // TODO - show error pop-up?
        handleError("Nodes are null?");
        if (!nodes) { console.error("Nodes are null?"); return; }
        console.log("Received nodes for {}", nodes.name);
        let renderer = new Renderer();
        renderer.renderNodes(nodes);
      })

    // Example for mouse / key events
    //document.addEventListener('mouseup', (event) => { panning.update(MouseState.Up, Point.fromMouse(event)); });
  }, [handleError]);

  return <div className="canvas"></div>;
};

export default Canvas;
