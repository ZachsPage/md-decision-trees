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
    this.rerender();
  }

  createNode(parent: fromRust.Node, type: fromRust.NodeType) {
    console.log("Creating node - ", type);
    /* //TODO - this is an outline of what will need done after some refactoring from node_create_delete ADR
    let parentCyNode = this.cy.getElementById(parent.file_order.toString());
    let newNode: fromRust.Node = {
      text: "", file_order: // Get right most child node's file_order, then increase by 1
      level: //< Parent's + 1, parent_idx: //< Not used when writing to file - so not important
      type_is: type
    };
    let newCanvasNode = this.renderNode(newNode);
    this.rerender();
    this.onNodeClick(newCanvasNode.cyNode);
    */
  }

  // Render functions
  renderNodes(nodes : fromRust.Nodes) {
    this.cy.remove(this.cy.nodes());
    this.cy.remove(this.cy.edges());
    Node.newCollection(nodes.title);
    nodes.nodes.forEach((node: fromRust.Node) => { this.renderNode(node); });
    this.rerender(true);
  }

  renderNode(receivedNode: fromRust.Node) : Node {
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
    return newCanvasNode;
  }

  rerender(resetView: boolean = false) {
    let layoutArgs: any = {name: 'dagre'};
    if (!resetView) { layoutArgs = {...layoutArgs, fit: false, centerGraph: false}; }
    this.cy.elements().layout(layoutArgs).run();
    if (resetView) { this.cy.fit(); this.cy.zoom(1); }
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
    this.cy.on('click', 'node', (evt) => { this.onNodeSelect(evt.target) });
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
  onNodeSelect(cyNode: cytoscape.NodeSingular) {
    const nodeBox = cyNode.renderedBoundingBox({includeOverlays: false});
    const canvasBox = notNull(this.cy.container()?.getBoundingClientRect());
    const renderOffset = 10;
    const nodeRenderOutline: RenderBox = {
      x: canvasBox.x + nodeBox.x1 - renderOffset, width: nodeBox.x2 - nodeBox.x1,
      y: canvasBox.y + nodeBox.y1 - renderOffset, height: nodeBox.y2 - nodeBox.y1,
      color: cyNode.style("text-background-color")
    };
    // Give user the unwrapped node & its render positions to allow drawing over it
    notNull(this.nodeClickCB)(cyNode.data().nodeData.dataNode, nodeRenderOutline);
  }

  getNodes(): fromRust.Node[] {
    let visitedNodes: fromRust.Node[] = [];
    console.log("GetNodes called")
    this.cy.elements().dfs({root: this.cy.nodes(), visit: ((curr, edge, prev, idx, depth) => {
      console.log("Visited ", curr.data().nodeData.dataNode.text)
    })});
    console.log("GetNodes done")
    return visitedNodes;
  }
};
