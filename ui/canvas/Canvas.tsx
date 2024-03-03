import "./Canvas.css";
import React, {useEffect, useState, useRef, forwardRef, useImperativeHandle, forceUpdate} from 'react';
import {observer} from 'mobx-react';
import * as fromRust from "../bindings/bindings"
import {CanvasElement, Node} from "./CanvasElems"
import {ErrorStore} from "../stores/ErrorStore"
import {CanvasStore} from "../stores/CanvasStore"
import {Renderer, RenderBox} from "./Render"
import {notNull} from "../Utils"

// Exposes NodeEditTextBox functions to Canvas
interface NodeEditTextBoxMethods {
  setVisible: (text: string, box: RenderBox) => void;
  setVisibility: (visible: boolean) => void;
  getText: () => string;
}

// Text area to draw over the node & allow editing the text content
const NodeEditTextBox = forwardRef<NodeEditTextBoxMethods>((_, ref) => {
  const [visible, setVisibleState] = useState(false);
  const [text, setText] = useState("");
  const [box, setBox] = useState(new RenderBox);
  const htmlRef = useRef(null);

  // Exposed functions
  const setVisible = (newText: string, box: RenderBox) => {
    setText(newText);
    setBox(box);
    setVisibleState(true); 
    console.log(newText.length)
    notNull(htmlRef.current).setSelectionRange(newText.length, newText.length); //< Put cursor at end - TODO, fix?
  }
  const setVisibility = (visible: boolean) => { setVisibleState(visible); }
  const getText = (): string => { return text; }

  // Expose functions to parent
  useImperativeHandle(ref, () => ({ setVisible, setVisibility, getText }));

  return (
    <textarea id="NodeEditTextBox" ref={htmlRef}
      style={{position:"absolute", display: visible ? 'block' : 'none',
              left: `${box.x}px`, top: `${box.y}px`,
              height: `${box.height}px`, width: `${box.width}px`}}
      value={text} onChange={(event) => { 
        setText(event.target.value);
        let thisHTML = notNull(htmlRef.current);
        // https://stackoverflow.com/questions/76048428/html-textarea-why-does-textarea-style-height-textarea-scrollheight-px-exp
        if (thisHTML.scrollHeight > thisHTML.clientHeight) {
          thisHTML.style.height = thisHTML.scrollHeight + "px";
        }
      }}
    />
  )
});

// Passes information needed for selected node
class SelectedNode {
  node: fromRust.Node | null = null
  box: RenderBox | null = null
  beingEdited: boolean = false
}

interface CanvasProps {
    errorStore: ErrorStore,
    canvasStore: CanvasStore
}

// What is drawn on / shows nodes
export const Canvas: React.FC<CanvasProps> = observer(({errorStore, canvasStore}) => {
  const [didMount, setDidMount] = useState(false);
  const nodeEditTextBoxRef = useRef<typeof NodeEditTextBox>(null);
  let renderer: Renderer | null = null;
  let selectedNode: SelectedNode | null = null;

  // Mouse / keyboard Events
  const onNodeClick = (node: fromRust.Node, box: RenderBox) => {
    selectedNode = {node: node, box: box, beingEdited: false};
  }

  const onCanvasClick = () => {
    selectedNode = null;
    notNull(nodeEditTextBoxRef.current).setVisibility(false);
  }

  const handleKeyboardShortcuts = (event: any) => {
    if (event.ctrlKey) {
      if (event.key === 'e' && selectedNode) {
        handleNodeTextEdit(selectedNode);
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
        renderer = new Renderer(onNodeClick);
        renderer.renderNodes(nodes);
      });
  }

  const handleNodeTextEdit = (currNode: SelectedNode) => {
    const textBox = notNull(nodeEditTextBoxRef.current), node = notNull(currNode.node);
    if (!currNode.beingEdited) {
      currNode.beingEdited = true;
      textBox.setVisible(node.text, currNode.box);
    } else {
      currNode.beingEdited = false;
      renderer?.updateNodeData(node, "text", textBox.getText())
      textBox.setVisibility(false)
    }
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
