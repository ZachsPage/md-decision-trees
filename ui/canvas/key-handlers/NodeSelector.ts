import * as fromRust from "../../bindings/bindings"
import {Renderer} from "../Render"
import {NodeTraverseSelection} from "../NodeTraveseral"
import {notNull} from "../../Utils"

// Passes information needed for selected node
export class SelectedNode {
  node: fromRust.Node
  renderID: string
  constructor(node: fromRust.Node, renderID: string) {
    this.node = node; this.renderID = renderID;
  }
}

// Handles selecting nodes & traversing through them with keyboard shortcuts
export class NodeSelector {
  renderer?: Renderer;
  selectedNode: SelectedNode | null = null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  setSelectedNode(newNode: SelectedNode | null): void { 
    this.selectedNode = newNode;
    if (!newNode) {
      this._nodeTraverser()?.clear();
    }
  }

  current(): SelectedNode | null { 
    return this.selectedNode; 
  }

  _nodeTraverser(): NodeTraverseSelection {
    return notNull(this.renderer).getNodeTraverser(this.selectedNode);
  }

  /// Return true if event has handled
  handleKeyEvent(event: KeyboardEvent): boolean {
    if (event.ctrlKey) { return false; }
    if (event.key != 'j' && event.key != 'k' && event.key != 'h' && event.key != 'l') { return false; }
    if (!this.selectedNode) {
      /* Start at first node instead of going that direction immediately */
    } else if (event.key === 'j') {
      this._nodeTraverser().moveDown();
    } else if (event.key === 'k') {
      this._nodeTraverser().moveUp();
    } else if (event.key === 'h') {
      this._nodeTraverser().moveLeft();
    } else if (event.key === 'l') {
      this._nodeTraverser().moveRight();
    }
    const maybeNewNodeId = this?._nodeTraverser().currNodeId();
    if (maybeNewNodeId != this.selectedNode?.renderID) {
      this?.renderer?.onNodeSelect(maybeNewNodeId);
    }
    return true;
  }
}