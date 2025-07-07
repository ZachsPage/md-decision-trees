import { Canvas } from "../Canvas";
import { Renderer, NodeId } from "../Render";
import { notNull } from "../../Utils"
import { errorStore } from "../../stores/ErrorStore"
import * as fromRust from "../../bindings/bindings"

type NodeType = fromRust.NodeType;

enum State {
  None,
  ReadyToMake
}

// Handles creating nodes
export class NodeCreator {
  state: State = State.None;
  canvas: Canvas | null;
  render: Renderer | null;

  constructor(canvas: Canvas, render: Renderer) {
    this.canvas = canvas;
    this.render = render;
  }

  /// Return true if event has handled
  handleKeyEvent(event: KeyboardEvent): boolean {
    if (event.ctrlKey) {
      if (event.key === 'm') {
        this.state = State.ReadyToMake;
        return true;
      }
    } else if (this.state == State.ReadyToMake) {
      this.state = State.None;
      let optNodeType = this.getNodeTypeStringFromPressedKey(event.key);
      if (optNodeType) {
        this.makeNodeOnSelected(optNodeType);
      }
      event.preventDefault(); //< Stops key from entering node text on creation & changing node size
      return true;
    }
    return false;
  }

  makeNodeOnSelected(type: NodeType) {
    if (!type) { return; }
    let optParentNode = this?.canvas?.getSelectedNode();
    let optParentNodeType = optParentNode?.node.type_is;
    if (!this.canMakeTypeOnParent(optParentNodeType, type)) { 
      const parentTypeStr = optParentNodeType ? optParentNodeType : "none";
      errorStore.addError(`Cannot make node type '${type}' on parent node type '${parentTypeStr}'`);
      return;
    }
    let renderer = notNull(this.render);
    renderer.createNode(type as NodeType, optParentNode, (newNodeId: NodeId) => {
      renderer.onNodeSelect(newNodeId, () => this.canvas?.editSelectedNode());
    });
  }

  getNodeTypeStringFromPressedKey(key: String): NodeType | null {
    if (key === 'd') { return "Decision";
    } else if (key === 'o') { return "Option";
    } else if (key === 'p') { return "Pro";
    } else if (key === 'c') { return "Con";
    } else if (key === 'n') { return "Note"; } 
    errorStore.addError(`Invalid node type shortcut '${key}' - try one of d / o / p /c / n`);
    return null;
  }

  canMakeTypeOnParent(parentType: NodeType | null | undefined, newType: NodeType): Boolean {
    if (newType == "Note") { return true; }
    if (!parentType) { return newType == "Decision"; }
    if (parentType == "Decision") { return newType == "Option"; }
    if (parentType == "Option") { return newType == "Pro" || newType == "Con"; }
    return false;
  }
};
