import "./Canvas.css";
import React, { useEffect } from 'react';
import {observer, inject} from 'mobx-react';
import * as fromRust from "../bindings/bindings"
import {CanvasElement} from "./CanvasElems"
import {ErrorStore} from "../stores/ErrorStore"
import {CanvasStore} from "../stores/CanvasStore"
import {Renderer} from "./Render"

interface CanvasProps {
    errorStore: ErrorStore,
    canvasStore: CanvasStore
}

// What is drawn on / shows nodes
export const Canvas: React.FC<CanvasProps> = observer(({errorStore, canvasStore}) => {
  let renderer: Renderer | null;
  let firstTime: boolean = true;

  useEffect(() => {
    CanvasElement.parent = document.querySelector('.canvas') as HTMLElement;
    const fileToLoad = firstTime ? "TEST_FILE:02_long_bullets.md" : canvasStore.filePath;
    firstTime = false;
    fromRust.getNodes(fileToLoad)
      .catch((error) => {
        errorStore.addError(`Error reading ${fileToLoad} - ${error}`);
      })
      .then((nodes: fromRust.Nodes | void) => {
        if (!nodes) { errorStore.addError(`No nodes in ${fileToLoad}?`); return; }
        console.log("Received nodes for {}", nodes.name);
        renderer = new Renderer();
        renderer.renderNodes(nodes);
      });

      // Example for mouse / key events
      //document.addEventListener('mouseup', (event) => { panning.update(MouseState.Up, Point.fromMouse(event)); });
  }, [canvasStore.filePath]);

  return <div className="canvas"></div>;
});
