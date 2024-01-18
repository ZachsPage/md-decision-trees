import {Point, assert, notNull} from "../Utils"
import {Node, Line} from "./CanvasElems"
import * as fromRust from "../bindings/bindings"
import cytoscape from "cytoscape"
import dagre from "cytoscape-dagre"

export class Renderer {
  currX: number = 200;
  currY: number = 0;
  cy = cytoscape({
    container: notNull(document.querySelector('.canvas')),
    // Initial viewport:
    zoom: 1, pan: { x: 0, y: 0 },
    // Interaction:
    minZoom: 1e-50, maxZoom: 1e50,
    zoomingEnabled: true, userZoomingEnabled: true,
    panningEnabled: true, userPanningEnabled: true,
    boxSelectionEnabled: true, selectionType: 'single',
    // Rendering:
    styleEnabled: true,
  });

  constructor() {
    // Set CSS
    // - TODO - for this first approach, just use cytoscape to get node positioning since HTML handles word wrap & 
    //    still re-uses some of the existing logic
    // - TODO - check using the label approach from "cytoscape.js long node text", then remove whats not used anymore
    this.cy.style()
      .selector('node').style({shape: 'rectangle', opacity: 100, width: '100px', height: '50px'})
    .update();
    cytoscape.use(dagre)
    // Assign events
    this.cy.on('drag', 'node', (evt) => { this.transferCyToCanvasNodePos(evt.target); });
    this.cy.on('dragpan', () => { this.updateAllNodePositions(); });
  }

  renderNodes(nodes : fromRust.Nodes) {
    this.cy.remove(this.cy.nodes());
    this.cy.remove(this.cy.edges());
    nodes.nodes.forEach((node: fromRust.Node) => { this.renderNode(node); });
    this.cy.elements().layout({name: 'dagre'}).run();
    this.cy.fit();
    this.cy.zoom(1); //< Needed to keep width / height pixels aligned with Canvas.css
    this.updateAllNodePositions();
  }

  renderNode(receivedNode: fromRust.Node) {
    let newCanvasNode = new Node(new Point(0,0), receivedNode.text);
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

  transferCyToCanvasNodePos(cyNode: any) {
    const opts = {includeOverlays: false};
    const x = cyNode.renderedBoundingBox(opts).x1;
    const y = cyNode.renderedBoundingBox(opts).y1;
    cyNode.data().nodeData.updatePosition(new Point(x, y));
  }

  updateAllNodePositions() {
      this.cy.nodes().forEach((tmpNode) => { this.transferCyToCanvasNodePos(tmpNode); });
  }
};
