import "./Canvas.css";
import React, { useEffect } from 'react';
import {observer, inject} from 'mobx-react';
import * as fromRust from "../bindings/bindings"
import {CanvasElement} from "./CanvasElems"
import {ErrorStore} from "../stores/ErrorStore"
import {Renderer} from "./Render"

interface CanvasProps {
    errorStore: ErrorStore
}

// What is drawn on / shows nodes
export const Canvas: React.FC<CanvasProps> = ({errorStore}) => {
  useEffect(() => {
    CanvasElement.parent = document.querySelector('.canvas') as HTMLElement;
    // Demo - show retrieving nodes from file read by Rust - TODO - make this async
    let node_promise: Promise<fromRust.Nodes> = fromRust.getNodes("placeholder_file_path.md");
    node_promise
      .catch((error) => console.error(error))
      .then((nodes: fromRust.Nodes | void) => {
        if (!nodes) { errorStore.addError("Nodes are null?"); return; }
        console.log("Received nodes for {}", nodes.name);
        let renderer = new Renderer();
        renderer.renderNodes(nodes);
      })

      setTimeout(() => {errorStore.addError("Demo off error popup")}, 2000);
      setTimeout(() => {errorStore.addError("Delayed demo off error popup")}, 4000);

      // Example for mouse / key events
      //document.addEventListener('mouseup', (event) => { panning.update(MouseState.Up, Point.fromMouse(event)); });
  });

  return <div className="canvas"></div>;
};
