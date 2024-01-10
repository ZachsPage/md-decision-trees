import {Point, assert} from "../Utils"
import {Node, Line} from "./CanvasElems"
import * as fromRust from "../bindings/bindings"

export class Renderer {
  currX: number = 200;
  currY: number = 0;
  lastLevel: number = -1;

  renderNodes(nodes : fromRust.Nodes) {
    nodes.nodes.forEach((node: fromRust.Node) => { this.renderNode(node); });
  }

  renderNode(receivedNode: fromRust.Node) {
    if (receivedNode.level == this.lastLevel) { this.currX += 150; } else { this.currY += 100; }
    this.lastLevel = receivedNode.level;
    let newCanvasNode = new Node(new Point(this.currX, this.currY), receivedNode.text);
    newCanvasNode.dataNode = receivedNode;
    receivedNode.parent_idxs.forEach((parent_idx: number) => {
      assert(parent_idx < Node.nodes.length); //< TODO - wont work for nodes linked to two parents - with one later
      new Line(Node.nodes[parent_idx], newCanvasNode);
    });
  }
};
