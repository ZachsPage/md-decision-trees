import "./Canvas.css";
import React, {useEffect, useState, useRef, forwardRef, useImperativeHandle} from 'react';
import {observer, inject} from 'mobx-react';
import * as fromRust from "../bindings/bindings"
import {CanvasElement, Node} from "./CanvasElems"
import {ErrorStore} from "../stores/ErrorStore"
import {CanvasStore} from "../stores/CanvasStore"
import {Renderer} from "./Render"

interface NodeEditTextBoxMethods {
  setVisible: (text: string, x: number, y: number) => void;
  setVisibility: (visible: boolean) => void;
}

const NodeEditTextBox = forwardRef<NodeEditTextBoxMethods>((_, ref) => {
  const [visible, setVisibleState] = useState(false);
  const [text, setText] = useState("");
  const [pos, setPos] = useState({x: 0, y: 0});

  // Expose functions to parent
  const setVisible = (text: string, x: number, y: number) => {
    setText(text);
    setPos({x: x, y: y})
    setVisibleState(true); 
    console.log("Set visible for ", text, x, y, visible);
  }
  const setVisibility = (visible: boolean) => { 
    setVisibleState(visible); 
    setText("");
  }
  useImperativeHandle(ref, () => ({ setVisible, setVisibility }));

  return (
    <textarea
      style={{position:"absolute", left: `${pos.x}px`, top: `${pos.y}px`, display: visible ? 'block' : 'none'}}
      value={text} onChange={(event) => { setText(event.target.value); }}/>
  )
});

interface CanvasProps {
    errorStore: ErrorStore,
    canvasStore: CanvasStore
}

// What is drawn on / shows nodes
export const Canvas: React.FC<CanvasProps> = observer(({errorStore, canvasStore}) => {
  const [didMount, setDidMount] = useState(false);
  let selectedNode: fromRust.Node | null = null;
  const nodeEditTextBoxRef = useRef<typeof NodeEditTextBox>(null);

  // Mouse / keyboard Events
  const onNodeClick = (node: fromRust.Node, x: number, y: number) => {
    selectedNode = node;
    nodeEditTextBoxRef.current?.setVisible(selectedNode.text, x, y);
  }

  const onCanvasClick = () => {
    selectedNode = null;
    nodeEditTextBoxRef.current?.setVisibility(false);
  }

  const handleKeyboardShortcuts = (event: any) => {
    if (event.ctrlKey) {
      if (event.key === 'e' && selectedNode) {
        console.log("ctrl+e pressed - ", selectedNode.text);
      }
    }
  }

  const bindMouseKeyEvents = () => {
    CanvasElement.parent.addEventListener('mouseup', onCanvasClick);
    document.addEventListener('keydown', handleKeyboardShortcuts);
  }

  // Helper Functions
  const loadFile = (fileToLoad: string) => {
    fromRust.getNodes(fileToLoad)
      .catch((error) => {
        errorStore.addError(`Error reading ${fileToLoad} - ${error}`);
      })
      .then((nodes: fromRust.Nodes | void) => {
        if (!nodes) { errorStore.addError(`No nodes in ${fileToLoad}?`); return; }
        let renderer = new Renderer(onNodeClick);
        renderer.renderNodes(nodes);
      });
  }

  // State Change Updates
  useEffect(() => {
    setDidMount(true);
    CanvasElement.parent = document.querySelector('.canvas') as HTMLElement;
    const defaultFile = "TEST_FILE:02_long_bullets.md";
    canvasStore.setFilePath(defaultFile);
    loadFile(defaultFile);
    bindMouseKeyEvents();
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

  // Note: NodeEditTextBox must be out of "canvas" or the onChange does not fire correctly 
  return (
    <>
      <div className="canvas"/>
      <NodeEditTextBox ref={nodeEditTextBoxRef}/>
    </>
  )
});
