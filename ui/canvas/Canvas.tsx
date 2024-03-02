import "./Canvas.css";
import React, {useEffect, useState, useRef, forwardRef, useImperativeHandle} from 'react';
import {observer, inject} from 'mobx-react';
import * as fromRust from "../bindings/bindings"
import {CanvasElement, Node} from "./CanvasElems"
import {ErrorStore} from "../stores/ErrorStore"
import {CanvasStore} from "../stores/CanvasStore"
import {Renderer, RenderBox} from "./Render"
import {notNull} from "../Utils"

interface NodeEditTextBoxMethods {
  setVisible: (text: string, box: RenderBox) => void;
  setVisibility: (visible: boolean) => void;
}

const NodeEditTextBox = forwardRef<NodeEditTextBoxMethods>((_, ref) => {
  const [visible, setVisibleState] = useState(false);
  const [text, setText] = useState("");
  const [box, setBox] = useState(new RenderBox);

  // Expose functions to parent
  const setVisible = (text: string, box: RenderBox) => {
    setText(text);
    setBox(box)
    setVisibleState(true); 
  }
  const setVisibility = (visible: boolean) => { 
    setVisibleState(visible); 
    setText("");
  }
  useImperativeHandle(ref, () => ({ setVisible, setVisibility }));
  

  return (
    <textarea id="NodeEditTextBox"
      style={{position:"absolute", display: visible ? 'block' : 'none',
              left: `${box.x}px`, top: `${box.y}px`,
              height: `${box.height}px`, width: `${box.width}px`}}
      value={text} onChange={(event) => { 
        setText(event.target.value);
        // TODO - don't like this at all...
        let thisHTML = notNull(document.getElementById("NodeEditTextBox"));
        // https://stackoverflow.com/questions/76048428/html-textarea-why-does-textarea-style-height-textarea-scrollheight-px-exp
        if (thisHTML.scrollHeight > thisHTML.clientHeight) {
          thisHTML.style.height = thisHTML.scrollHeight + "px";
        }
      }}/>
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
  const onNodeClick = (node: fromRust.Node, box: RenderBox) => {
    selectedNode = node;
    notNull(nodeEditTextBoxRef.current).setVisible(selectedNode.text, box);
  }

  const onCanvasClick = () => {
    selectedNode = null;
    notNull(nodeEditTextBoxRef.current).setVisibility(false);
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
