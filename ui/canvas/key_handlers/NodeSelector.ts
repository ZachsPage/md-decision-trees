import * as fromRust from "../../bindings/bindings"
import {RenderBox, Renderer} from "../Render"
import {NodeTraverseSelection} from "../NodeTraveseral"
import {notNull} from "../../Utils"

// Passes information needed for selected node
export class SelectedNode {
  node: fromRust.Node | null = null
  renderID: string = ""
  box: RenderBox | null = null
  beingEdited: boolean = false
}

// Handles selecting nodes & traversing through them with keyboard shortcuts
export class NodeSelector {
  selectedNode: SelectedNode | null = null;
  nodeSelector: NodeTraverseSelection | null = null;
  renderer?: Renderer;

  setSelectedNode(newNode: SelectedNode | null) { 
    this.selectedNode = newNode;
    if (!newNode) { this.nodeSelector = null; }
  }

  current(): SelectedNode | null { 
    return this.selectedNode; 
  }

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    document.addEventListener('keydown', (event) => this.handleKeyboardShortcuts(event));
  }

  handleKeyboardShortcuts(event: KeyboardEvent) {
    if (event.ctrlKey) { return; }
    if (event.key != 'j' && event.key != 'k' && event.key != 'h' && event.key != 'l') { return; }
    event.preventDefault();
    if (!this.nodeSelector) {
      this.nodeSelector = notNull(this.renderer?.newNodeTraverseSelection(this.selectedNode));
      if (!this.selectedNode) { return; } /* Start at first node instead of going that direction immediately */
    }
    if (event.key === 'j') {
      this.nodeSelector?.moveDown();
    } else if (event.key === 'k') {
      this.nodeSelector?.moveUp();
    } else if (event.key === 'h') {
      this.nodeSelector?.moveLeft();
    } else if (event.key === 'l') {
      this.nodeSelector?.moveRight();
    }
    const maybeNewNode = this?.nodeSelector?.curr;
    if (maybeNewNode?.id() != this.selectedNode?.renderID) {
      this?.renderer?.onNodeSelect(notNull(maybeNewNode));
    }
  }
}