import {Point, assert, notNull} from "../Utils"
import {Node} from "./CanvasElems"
import * as fromRust from "../bindings/bindings"
import cytoscape from "cytoscape"
import dagre from "cytoscape-dagre"

export class Renderer {
  currX: number = 200;
  currY: number = 0;
  cy = cytoscape({
    container: notNull(document.querySelector('.canvas')),
    // Interaction:
    zoomingEnabled: true, userZoomingEnabled: true,
    panningEnabled: true, userPanningEnabled: true,
    boxSelectionEnabled: true, selectionType: 'single',
    // Rendering:
    styleEnabled: true,
  });

  constructor() {
    // Set CSS
    this.cy.style()
      .selector('node').style(
        {shape: 'rectangle', 
         label: 'data(nodeData.dataNode.text)', width: 'label', height: 'label',
         'text-valign': "center", 'text-halign': "center", 'text-wrap': "wrap", 'text-max-width': '200'})
    .update();
    cytoscape.use(dagre)
    // Example for assigning events - this.cy.on('drag', 'node', (evt) => { this.transferCyToCanvasNodePos(evt.target); });
  }

  renderNodes(nodes : fromRust.Nodes) {
    this.cy.remove(this.cy.nodes());
    this.cy.remove(this.cy.edges());
    nodes.nodes.forEach((node: fromRust.Node) => { this.renderNode(node); });
    this.cy.elements().layout({name: 'dagre'}).run();
    this.cy.fit();
    this.cy.zoom(1);
  }

  renderNode(receivedNode: fromRust.Node) {
    let newCanvasNode = new Node();
    newCanvasNode.dataNode = receivedNode;
    const nodeUUID = receivedNode.file_order.toString(); //< Must be string for type - reuse for unique ID
    newCanvasNode.cyNode = this.cy.add({group: "nodes", data: {id: nodeUUID, nodeData: newCanvasNode}});
    receivedNode.parent_idxs.forEach((parent_idx: number) => { // Connect to each parent
      assert(parent_idx < Node.nodes.length); //< TODO - wont work for nodes linked to two parents - with one later
      const parentNodeId = notNull(Node.nodes[parent_idx].cyNode.data().id);
      const childNodeId = notNull(newCanvasNode.cyNode.data().id);
      this.cy.add({group: 'edges', data: {source: parentNodeId, target: childNodeId}})
    });
  }
};
