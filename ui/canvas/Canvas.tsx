import "./Canvas.css";
import {CanvasElement, Node} from "./CanvasElems"
import {NodeEditTextBox} from './NodeEditTextBox';
import {Renderer, RenderBox} from "./Render"
import * as fromRust from "../bindings/bindings"
import {ErrorStore} from "../stores/ErrorStore"
import {CanvasStore} from "../stores/CanvasStore"
import {notNull} from "../Utils"
import { NodeCreator } from "./key_handlers/NodeCreator"
import {observer} from 'mobx-react';
import React, {useEffect, useState, useRef} from 'react';

// Passes information needed for selected node
export class SelectedNode {
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
  let nodeCreator: NodeCreator | null = null;
  let selectedNode: SelectedNode | null = null;

  // Mouse / keyboard Events
  const onNodeClick = (node: fromRust.Node, box: RenderBox) => {
    setSelectedNode({node: node, box: box, beingEdited: false});
  }

  const onCanvasClick = () => {
    setSelectedNode(null);
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
  const setSelectedNode = (newNode: SelectedNode | null) => {
    selectedNode = newNode;
    nodeCreator?.setSelectedNode(selectedNode);
  }

  const loadFile = (fileToLoad: string) => {
    fromRust.getNodes(fileToLoad)
      .catch((error) => {
        errorStore.addError(`Error reading ${fileToLoad} - ${error}`);
      })
      .then((nodes: fromRust.Nodes | void) => {
        if (!nodes) { errorStore.addError(`No nodes in ${fileToLoad}?`); return; }
        renderer = new Renderer(onNodeClick);
        renderer.renderNodes(nodes);
        nodeCreator = new NodeCreator(renderer);
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

  const saveNodesToPath = (filePath: string) => {
    // TODO - Seems like shouldnt be using a Functional component here... use a Component instead
    // - The renderer state is not being shared - selectedNode is working due to the binds...
    console.log(`saveNodesToPath '${filePath}' - renderer is ${renderer}`);
    let nodesToSave: fromRust.Nodes = {title: Node.collectionTitle, nodes: []};
    Node.collection.forEach((node: Node) => { if (node.dataNode) { nodesToSave.nodes.push(node.dataNode); } });
    fromRust.sendNodes(nodesToSave, filePath);
  }

  // State Change Updates
  useEffect(() => {
    setDidMount(true);
    CanvasElement.parent = document.querySelector('.canvas') as HTMLElement;
    const defaultFile = "TEST_FILE:03_basic_encoding.md";
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
    saveNodesToPath(canvasStore.saveNodesToFilePath);
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
