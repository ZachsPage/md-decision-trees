import "./Canvas.css";
import {errorStore} from "../stores/ErrorStore"
import {canvasStore} from "../stores/CanvasStore"
import {CanvasElement, Node} from "./CanvasElems"
import {NodeEditTextBox} from './NodeEditTextBox';
import {Renderer, RenderBox} from "./Render"
import * as fromRust from "../bindings/bindings"
import {notNull} from "../Utils"
import { NodeCreator } from "./key_handlers/NodeCreator"
import {observer} from 'mobx-react';
import {reaction} from 'mobx';
import React from 'react';

// Passes information needed for selected node
export class SelectedNode {
  node: fromRust.Node | null = null
  box: RenderBox | null = null
  beingEdited: boolean = false
}

// What is drawn on / shows nodes
@observer
export class Canvas extends React.Component {
  nodeEditTextBoxRef: any;//typeof NodeEditTextBox | null = null;
  renderer: Renderer | null = null;
  nodeCreator: NodeCreator | null = null;
  selectedNode: SelectedNode | null = null;

  // Mouse / keyboard Events
  onNodeClick(node: fromRust.Node, box: RenderBox) {
    this.setSelectedNode({node: node, box: box, beingEdited: false});
  }

  onCanvasClick() {
    this.setSelectedNode(null);
    notNull(this?.nodeEditTextBoxRef?.current).setVisibility(false);
  }

  handleKeyboardShortcuts(event: any) {
    if (event.ctrlKey) {
      if (event.key === 'e' && this.selectedNode) {
        this.handleNodeTextEdit(this.selectedNode);
      }
    }
  }

  bindMouseKeyEvents() {
    CanvasElement.parent.addEventListener('mouseup', () => { this.onCanvasClick(); });
    document.addEventListener('keydown', (event) => {this.handleKeyboardShortcuts(event)});
  }

  // Helper Functions
  setSelectedNode(newNode: SelectedNode | null) {
    this.selectedNode = newNode;
    this.nodeCreator?.setSelectedNode(this.selectedNode);
  }

  loadFile(fileToLoad: string) {
    fromRust.getNodes(fileToLoad)
      .catch((error) => {
        errorStore.addError(`Error reading ${fileToLoad} - ${error}`);
      })
      .then((nodes: fromRust.Nodes | void) => {
        if (!nodes) { errorStore.addError(`No nodes in ${fileToLoad}?`); return; }
        this.renderer = new Renderer( (node, box) => {this.onNodeClick(node, box);});
        this.renderer.renderNodes(nodes);
        this.nodeCreator = new NodeCreator(this.renderer);
      });
  }

  handleNodeTextEdit(currNode: SelectedNode) {
    const textBox = notNull(this?.nodeEditTextBoxRef?.current), node = notNull(currNode.node);
    if (!currNode.beingEdited) {
      currNode.beingEdited = true;
      textBox.setVisible(node.text, currNode.box);
    } else {
      currNode.beingEdited = false;
      this.renderer?.updateNodeData(node, "text", textBox.getText())
      textBox.setVisibility(false)
    }
  }

  saveNodesToPath(filePath: string) {
    console.log(`saveNodesToPath '${filePath}' - renderer is ${this.renderer}`);
    let nodesToSave: fromRust.Nodes = {title: Node.collectionTitle, nodes: notNull(this.renderer).getNodes()};
    fromRust.sendNodes(nodesToSave, filePath);
  }

  // State Change Updates
  constructor(props: any) {
    super(props);
    this.nodeEditTextBoxRef = React.createRef<typeof NodeEditTextBox>();
    // Bind reactions to store value changes - check 0 length since producers clear the field first, then update the
    //  value to still reload / save a file each time the button is clicked, even if the path wasn't changed
    reaction(() => canvasStore.filePath, newFilePath => { 
      if (newFilePath.length > 0) { this.loadFile(newFilePath); }
    })
    reaction(() => canvasStore.saveNodesToFilePath, filePath => { 
      if (filePath.length > 0) { this.saveNodesToPath(filePath); }
    })
  }

  componentDidMount() {
    CanvasElement.parent = document.querySelector('.canvas') as HTMLElement;
    const defaultFile = "TEST_FILE:03_basic_encoding.md";
    canvasStore.setFilePath(defaultFile);
    this.loadFile(defaultFile);
    this.bindMouseKeyEvents();
  }

  // Note: NodeEditTextBox must be out of "canvas" or the onChange does not fire correctly 
  render() {
    return <>
      <div className="canvas"/>
      <NodeEditTextBox ref={this.nodeEditTextBoxRef}/>
    </>
  }
}
