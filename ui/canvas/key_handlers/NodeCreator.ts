import { Canvas, SelectedNode } from "../Canvas";
import { Renderer } from "../Render";
import { notNull } from "../../Utils"
import * as fromRust from "../../bindings/bindings"

enum State {
  None,
  ReadyToCreate
}

// Handles creating nodes
export class NodeCreator {
  state: State = State.None;
  canvas: Canvas | null;
  render: Renderer | null;

  handleKeyboardShortcuts(event: any) {
    if (event.ctrlKey) {
      if (event.key === 'c') {
        this.state = State.ReadyToCreate;
      }
    } else if (this.state == State.ReadyToCreate) {
      this.state = State.None;
      let typeStr = this.getNodeTypeStringFromPressedKey(event.key)
      if (typeStr) { this.createNodeOnSelected(typeStr); }
    }
  }

  createNodeOnSelected(type: String) {
    let optParentNode = this?.canvas?.getSelectedNode()?.node;
    if (!this.canCreateTypeOnParent(optParentNode?.type_is, type)) { return; }
    let renderer = notNull(this.render);
    let newNode = notNull(renderer.createNode(optParentNode, type as fromRust.NodeType));
    renderer.focusOnNode(newNode.cyNode);
    renderer.onNodeSelect(newNode.cyNode);
    this.canvas?.editSelectedNode();
  }

  getNodeTypeStringFromPressedKey(key: String): String | null {
    if (key === 'd') { return "Decision";
    } else if (key === 'o') { return "Option";
    } else if (key === 'p') { return "Pro";
    } else if (key === 'c') { return "Con";
    } else if (key === 'n') { return "Note";
    } return null;
  }

  canCreateTypeOnParent(parentType: String | undefined | null, newType: String): Boolean {
    if (newType == "Note") { return true; }
    if (!parentType) { return newType == "Decision"; }
    if (parentType == "Decision") { return newType == "Option"; }
    if (parentType == "Option") { return newType == "Pro" || newType == "Con"; }
    return false;
  }

  constructor(canvas: Canvas, render: Renderer) {
    this.canvas = canvas;
    this.render = render;
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }
};
