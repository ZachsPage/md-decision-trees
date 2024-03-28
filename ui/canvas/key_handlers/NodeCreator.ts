import { SelectedNode } from "../Canvas";
import { Renderer } from "../Render";
import { notNull } from "../../Utils"
import * as fromRust from "../../bindings/bindings"

enum State {
  None,
  ReadyToCreate
}

export class NodeCreator {
  state: State = State.None;
  selectedNode: SelectedNode | null = null;
  render: Renderer | null;

  setSelectedNode(newNode: SelectedNode | null) {
    this.selectedNode = newNode;
  }

  handleKeyboardShortcuts(event: any) {
    if (event.ctrlKey) {
      if (event.key === 'c' && this.selectedNode) {
        this.state = State.ReadyToCreate;
      }
    } else if (this.state == State.ReadyToCreate) {
      this.state = State.None;
      if (this.selectedNode) {
        let typeStr = this.getNodeTypeStringFromKey(event.key)
        if (typeStr) { this.createNodeOnSelected(typeStr); }
      }
    }
  }

  createNodeOnSelected(type: String) {
    if (!this.canCreateTypeOnParent("parent_type", type)) { return; }
    let parentNode = notNull(this?.selectedNode?.node);
    this.render?.createNode(parentNode, type as fromRust.NodeType);
  }

  getNodeTypeStringFromKey(key: String): String | null {
    if (key === 'd') { return "Decision";
    } else if (key === 'o') { return "Option";
    } else if (key === 'p') { return "Pro";
    } else if (key === 'c') { return "Con";
    } else if (key === 'n') { return "Note";
    } return null;
  }

  canCreateTypeOnParent(parent_type: String, new_type: String): Boolean {
    // TODO - ensure this creation is valid based on types
    return true;
  }

  constructor(render: Renderer) {
    this.render = render;
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }
};