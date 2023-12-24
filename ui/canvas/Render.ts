import {Point} from "../Utils"
import {Node} from "./CanvasElems"
import * as fromRust from "../bindings/bindings"

export function renderNodes(nodes : fromRust.Nodes) {
  let node_x = 200, node_y = 400, num_nodes = 0;
  nodes.nodes.forEach((node: fromRust.Node) => { 
    // Want this rendering code to be simple - not handling indents I don't think...
    // - Would like to just use the indexes to draw the lines, but it also has to handle positioning of x & y
    //   anyway, so maybe this logic does have to be somewhere
    // If current node indent_level is > last, draw a line to previous node
    new Node(new Point(node_x, node_y), node.text);
    if (num_nodes++ == 3) {
      node_y += 75, node_x = 200, num_nodes = 0;
    } else {
      node_x += 150 
    }
  });
}