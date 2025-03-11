import * as fromRust from "../../bindings/bindings"
import {RenderBox, Renderer} from "../Render2"
import {NodeTraverseSelection} from "../NodeTraveseral2"
import {notNull} from "../../Utils"

// Passes information needed for selected node
export class SelectedNode {
  node: fromRust.Node
  renderID: string
  box: RenderBox //< TODO: can delete this since dont need NodeEditBox anymore
  constructor(node: fromRust.Node, renderID: string, box: RenderBox) {
    this.node = node; this.renderID = renderID; this.box = box;
  }
}

// Handles selecting nodes & traversing through them with keyboard shortcuts
export class NodeSelector {
  renderer?: Renderer;
  selectedNode: SelectedNode | null = null;
  nodeTraverser: NodeTraverseSelection | null = null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  setSelectedNode(newNode: SelectedNode | null) { 
    this.selectedNode = newNode;
    if (!newNode && this.nodeTraverser) {
      this.nodeTraverser?.clear();
      this.nodeTraverser = null;
    }
  }

  current(): SelectedNode | null { 
    return this.selectedNode; 
  }

  /// Return true if event has handled
  handleKeyEvent(event: KeyboardEvent): boolean {
    if (event.ctrlKey) { return false; }
    if (event.key != 'j' && event.key != 'k' && event.key != 'h' && event.key != 'l') { return false; }
    if (!this.nodeTraverser) {
      this.nodeTraverser = notNull(this.renderer?.newNodeTraverseSelection(this.selectedNode));
    }
    if (!this.selectedNode) {
      /* Start at first node instead of going that direction immediately */
    } else if (event.key === 'j') {
      this.nodeTraverser?.moveDown();
    } else if (event.key === 'k') {
      this.nodeTraverser?.moveUp();
    } else if (event.key === 'h') {
      this.nodeTraverser?.moveLeft();
    } else if (event.key === 'l') {
      this.nodeTraverser?.moveRight();
    }
    const maybeNewNodeId = this?.nodeTraverser?.node()?.id;
    if (maybeNewNodeId != this.selectedNode?.renderID) {
      this?.renderer?.onNodeSelect(maybeNewNodeId);
    }
    return true;
  }
}