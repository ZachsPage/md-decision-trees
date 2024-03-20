import {Node} from "./CanvasElems"
import {getNodeColor} from "./Utils"
import {assert, notNull} from "../Utils"
import * as fromRust from "../bindings/bindings"
import cytoscape from "cytoscape"
import dagre from "cytoscape-dagre"

// Allows user to know an elements render location / size / info
export class RenderBox {
  x: number = 0;
  y: number = 0;
  height: number = 0;
  width: number = 0;
  color: string = ""
}

// Triggered when a node is clicked
type OnNodeClickCB = (clickedNode: fromRust.Node, box: RenderBox) => void;

export class Renderer {
  // Public interaction functions
  updateNodeData(node: fromRust.Node, attribute: string, value: any) {
    // Edit the node text through the cy API to update the graph, then ensure the rerender doesn't affect the view
    let cyNode = this.cy.getElementById(node.file_order.toString());
    cyNode.data(`nodeData.dataNode.${attribute}`, value);
    this.cy.elements().layout({name: 'dagre', fit: false, centerGraph: false}).run();
  }

  // Render functions
  renderNodes(nodes : fromRust.Nodes) {
    this.cy.remove(this.cy.nodes());
    this.cy.remove(this.cy.edges());
    Node.newCollection(nodes.title);
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
      assert(parent_idx < Node.collection.length); //< TODO - wont work for nodes linked to two parents - with one later
      const parentNodeId = notNull(Node.collection[parent_idx].cyNode.data().id);
      const childNodeId = notNull(newCanvasNode.cyNode.data().id);
      this.cy.add({group: 'edges', data: {source: parentNodeId, target: childNodeId}})
    });
  }

  // Members & init
  cy = cytoscape({
    container: notNull(document.querySelector('.canvas')),
    // Interaction:
    zoomingEnabled: true, userZoomingEnabled: true,
    panningEnabled: true, userPanningEnabled: true,
    boxSelectionEnabled: true, selectionType: 'single',
    // Rendering:
    styleEnabled: true,
  });

  nodeClickCB: OnNodeClickCB | null = null;

  constructor(nodeClickCB :OnNodeClickCB) {
    // Inits
    this.nodeClickCB = nodeClickCB;
    // Binds
    this.cy.on('click', 'node', (evt) => { this.onNodeClick(evt.target) });
    // Set node CSS
    this.cy.style()
      .selector('node').style(
        { label: 'data(nodeData.dataNode.text)', 
          shape: 'rectangle', width: 'label', height: 'label',
          'text-valign': "center", 'text-halign': "center", 'text-wrap': "wrap", 'text-max-width': '200',
          "border-width": 14, 'border-color': "black", 'text-background-opacity': 1, 'text-background-padding': "5", 
          'text-background-color': (cyNode: cytoscape.NodeSingular): String => {
             return getNodeColor(cyNode.data().nodeData.dataNode.type_is);
          }
        })
    .update();
    cytoscape.use(dagre)
  }

  // Interaction functions
  onNodeClick(cyNode: cytoscape.NodeSingular) {
    const nodeBox = cyNode.renderedBoundingBox({includeOverlays: false});
    const canvasBox = notNull(this.cy.container()?.getBoundingClientRect());
    const renderOffset = 10;
    console.log("Style is ", cyNode.style("text-background-color"));
    const nodeRenderOutline: RenderBox = {
      x: canvasBox.x + nodeBox.x1 - renderOffset, width: nodeBox.x2 - nodeBox.x1,
      y: canvasBox.y + nodeBox.y1 - renderOffset, height: nodeBox.y2 - nodeBox.y1,
      color: cyNode.style("text-background-color")
    };
    // Give user the unwrapped node & its render positions to allow drawing over it
    notNull(this.nodeClickCB)(cyNode.data().nodeData.dataNode, nodeRenderOutline);
  }
};
