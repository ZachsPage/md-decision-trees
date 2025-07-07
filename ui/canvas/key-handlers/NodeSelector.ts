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
  traverser: NodeTraverseSelection | null = null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  setSelectedNode(newNode: SelectedNode | null): void { 
    this.selectedNode = newNode;
    if (!this.selectedNode) {
      this.traverser = null;
    } else if (this.traverser && this.traverser.currNodeId() != this.selectedNode?.renderID) {
      this.traverser = new NodeTraverseSelection(notNull(this.renderer), this.selectedNode?.renderID);
    }
  }

  current(): SelectedNode | null { 
    return this.selectedNode; 
  }

  _nodeTraverser(): NodeTraverseSelection {
    return notNull(this.traverser);
  }

  /// Return true if event has handled
  handleKeyEvent(event: KeyboardEvent): boolean {
    if (event.ctrlKey) { return false; }
    if (event.key != 'j' && event.key != 'k' && event.key != 'h' && event.key != 'l') { return false; }
    const prevSelectedId = this.traverser ? this.traverser.currNodeId() : null;
    if (!prevSelectedId) {
      /* Start at first node instead of going that direction immediately */
      this.traverser = new NodeTraverseSelection(notNull(this.renderer), "0")
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
    if (maybeNewNodeId != prevSelectedId) {
      this?.renderer?.onNodeSelect(maybeNewNodeId);
    }
    return true;
  }
}
