import "./Canvas.css";
import {errorStore} from "../stores/ErrorStore"
import {canvasStore} from "../stores/CanvasStore"
import {Node} from "./CanvasElems"
import {NodeEditTextBox} from './NodeEditTextBox';
import {Renderer, RendererComp} from "./Render2"
import * as fromRust from "../bindings/bindings"
import {notNull} from "../Utils"
import {NodeCreator} from "./key-handlers/NodeCreator"
import {NodeSelector, SelectedNode} from "./key-handlers/NodeSelector"
import {observer} from 'mobx-react';
import {reaction} from 'mobx';
import React from 'react';

// What is drawn on / shows nodes
@observer
export class Canvas extends React.Component {
  //nodeEditTextBoxRef: React.RefObject<typeof NodeEditTextBox>;
  //getNodeEditTextBox(): any { return notNull(this.nodeEditTextBoxRef?.current); }
  renderer: Renderer = new Renderer( (node: SelectedNode) => {this?.nodeSelector?.setSelectedNode(node);});
  nodeCreator: NodeCreator = new NodeCreator(this, this.renderer);
  nodeSelector: NodeSelector = new NodeSelector(this.renderer);
  getSelectedNode() : SelectedNode | null | undefined { return this?.nodeSelector?.current(); }

  // Mouse / keyboard Events
  // - Ensures state control using delegation as opposed to propagating state & allowing each component to register
  delegateKeyEvent(event: KeyboardEvent) {
    const escPressed = (event.key === "Escape");
    const editKeyPressed : boolean = (event.ctrlKey && event.key === 'e');
    if (this.handleNodeTextEdit(editKeyPressed, escPressed)) { return; } //< If editing, ensure text keys are not used
    if (escPressed) { this.clearSelection(); }
    if (this?.nodeCreator?.handleKeyEvent(event) || this?.nodeSelector?.handleKeyEvent(event)) { return; }
    if (event.ctrlKey) {
      if (event.key === 'z') {
        this.renderer?.doLayout();
      } else if (event.key === 'd' && this.getSelectedNode()) {
        this.renderer?.removeNode(notNull(this.getSelectedNode()).renderID);
      } else if (event.key === 's') {
        this.saveNodesToPath(canvasStore.filePath);
      }
    }
  }

  clearSelection() {
    this.renderer?.onNodeEditFinish();
    this.nodeSelector?.setSelectedNode(null);
  }

  // Node text editing
  /// Returns true if node is being edited - so should not delegate handlers for pressed keys
  handleNodeTextEdit(toggleEditState: boolean, cancel: boolean): boolean {
    let userIsEditing: boolean = this?.renderer?.isEditingNode() ?? false;
    if (cancel) { this?.renderer?.onNodeEditFinish(); return false; }
    if (!toggleEditState) { return userIsEditing; }
    if (!this?.getSelectedNode()) { return userIsEditing };
    if (!userIsEditing) { this.editSelectedNode(); } else { this.renderer?.onNodeEditFinish(); }
    return !userIsEditing; //< Flipped state since toggleEditState
  }

  editSelectedNode(initialText?: string) {
    this.renderer?.onNodeEdit(notNull(this.getSelectedNode()).renderID);
  }
  
  // File functions
  loadFile(filePath: string) {
    if (filePath.length == 0) { return; } //< Ensure not change just to clear - allows re-trigger on same name
    fromRust.getNodes(filePath)
      .catch((error) => {
        errorStore.addError(`Error reading ${filePath} - ${error}`);
      })
      .then((nodes: fromRust.Nodes | void) => {
        if (!nodes) { errorStore.addError(`No nodes in ${filePath}?`); return; }
        this?.renderer?.renderNodes(nodes);
      });
  }

  saveNodesToPath(filePath: string) {
    if (filePath.length == 0) { return; } //< Ensure not change just to clear - allows re-trigger on same name
    let nodesToSave: fromRust.Nodes = {title: Node.collectionTitle, nodes: notNull(this.renderer).getNodes()};
    fromRust.sendNodes(nodesToSave, filePath);
  }

  // State Change Updates
  constructor(props: any) {
    super(props);
    //this.nodeEditTextBoxRef = React.createRef<typeof NodeEditTextBox>();
    // Bind reactions to store value changes
    reaction(() => canvasStore.filePath, newFilePath => { this.loadFile(newFilePath); })
    reaction(() => canvasStore.saveNodesToFilePath, filePath => { this.saveNodesToPath(filePath); })
    // Bind interactions
    document.addEventListener('mouseup', () => { this.clearSelection(); });
    document.addEventListener('keydown', (event) => {this.delegateKeyEvent(event)});
  }

  componentDidMount() {
    const defaultFile = "TEST_FILE:03_basic_encoding.md";
    canvasStore.setFilePath(defaultFile);
  }

  render() {
    return <>
      <RendererComp renderer={this.renderer}/>
    </>
  }
}
