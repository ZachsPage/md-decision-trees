import "./Canvas.css";
import {errorStore} from "../stores/ErrorStore"
import {canvasStore} from "../stores/CanvasStore"
import {CanvasElement, Node} from "./CanvasElems"
import {NodeEditTextBox} from './NodeEditTextBox';
import {Renderer, RenderBox} from "./Render"
import * as fromRust from "../bindings/bindings"
import {notNull} from "../Utils"
import {NodeCreator} from "./key_handlers/NodeCreator"
import {NodeSelector, SelectedNode} from "./key_handlers/NodeSelector"
import {observer} from 'mobx-react';
import {reaction} from 'mobx';
import React from 'react';

// What is drawn on / shows nodes
@observer
export class Canvas extends React.Component {
  nodeEditTextBoxRef: any;//typeof NodeEditTextBox | null = null;
  renderer: Renderer | null = null;
  nodeCreator: NodeCreator | null = null;
  nodeSelector: NodeSelector | null = null;

  // Mouse / keyboard Events
  onCanvasClick() {
    this.nodeSelector?.setSelectedNode(null);
    notNull(this?.nodeEditTextBoxRef?.current).setVisibility(false);
  }

  handleKeyboardShortcuts(event: any) {
    if (event.ctrlKey) {
      if (event.key === 'e' && this.nodeSelector?.current) {
        this.editSelectedNode();
      }
    }
  }

  bindMouseKeyEvents() {
    CanvasElement.parent.addEventListener('mouseup', () => { this.onCanvasClick(); });
    document.addEventListener('keydown', (event) => {this.handleKeyboardShortcuts(event)});
  }

  // Helper Functions
  editSelectedNode(initialText?: string) {
    let selection = notNull(this.getSelectedNode());
    const textBox = this?.nodeEditTextBoxRef?.current;
    if (!textBox) { return; } //< TODO - this is null sometimes, so just return
    if (!selection.beingEdited) {
      selection.beingEdited = true;
      textBox.setVisible(initialText !== undefined ? initialText : selection.node.text, selection.box);
    } else {
      selection.beingEdited = false;
      this.renderer?.updateNodeData(selection.renderID, "text", textBox.getText())
      textBox.setVisibility(false)
    }
  }

  getSelectedNode() : SelectedNode | null | undefined {
    return this?.nodeSelector?.current();
  }
  
  // File functions
  loadFile(fileToLoad: string) {
    fromRust.getNodes(fileToLoad)
      .catch((error) => {
        errorStore.addError(`Error reading ${fileToLoad} - ${error}`);
      })
      .then((nodes: fromRust.Nodes | void) => {
        if (!nodes) { errorStore.addError(`No nodes in ${fileToLoad}?`); return; }
        this?.renderer?.renderNodes(nodes);
      });
  }

  saveNodesToPath(filePath: string) {
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
    this.renderer = new Renderer( (node: SelectedNode) => {this?.nodeSelector?.setSelectedNode(node);});
    this.nodeCreator = new NodeCreator(this, this.renderer);
    this.nodeSelector = new NodeSelector(this.renderer);

    CanvasElement.parent = document.querySelector('.canvas') as HTMLElement;
    const defaultFile = "TEST_FILE:03_basic_encoding.md";
    canvasStore.setFilePath(defaultFile);
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
