import "./Canvas.css";
import React, {useEffect, useState} from 'react';
import {observer, inject} from 'mobx-react';
import * as fromRust from "../bindings/bindings"
import {CanvasElement, Node} from "./CanvasElems"
import {ErrorStore} from "../stores/ErrorStore"
import {CanvasStore} from "../stores/CanvasStore"
import {Renderer} from "./Render"

interface CanvasProps {
    errorStore: ErrorStore,
    canvasStore: CanvasStore
}

// What is drawn on / shows nodes
export const Canvas: React.FC<CanvasProps> = observer(({errorStore, canvasStore}) => {
  const [didMount, setDidMount] = useState(false);

  const loadFile = (fileToLoad: string) => {
    fromRust.getNodes(fileToLoad)
      .catch((error) => {
        errorStore.addError(`Error reading ${fileToLoad} - ${error}`);
      })
      .then((nodes: fromRust.Nodes | void) => {
        if (!nodes) { errorStore.addError(`No nodes in ${fileToLoad}?`); return; }
        let renderer = new Renderer();
        renderer.renderNodes(nodes);
      });
  }

  useEffect(() => {
    setDidMount(true);
    CanvasElement.parent = document.querySelector('.canvas') as HTMLElement;
    const defaultFile = "TEST_FILE:02_long_bullets.md";
    canvasStore.setFilePath(defaultFile);
    loadFile(defaultFile);

    // Example for mouse / key events
    //document.addEventListener('mouseup', (event) => { panning.update(MouseState.Up, Point.fromMouse(event)); });
  }, []);

  useEffect(() => {
    if (!didMount) { return; }
    loadFile(canvasStore.filePath)
  }, [canvasStore.filePath]);

  useEffect(() => {
    if (!didMount || canvasStore.saveNodesToFilePath.length == 0) { return; }
    let nodesToSave: fromRust.Nodes = {title: Node.collectionTitle, nodes: []};
    Node.collection.forEach((node: Node) => { if (node.dataNode) { nodesToSave.nodes.push(node.dataNode); } });
    fromRust.sendNodes(nodesToSave, canvasStore.saveNodesToFilePath);
    canvasStore.setSaveNodesToFilePath("");
  }, [canvasStore.saveNodesToFilePath]);

  return <div className="canvas"></div>;
});
