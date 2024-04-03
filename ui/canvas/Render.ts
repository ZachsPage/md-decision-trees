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

  focusOnNode(cyNode: cytoscape.NodeSingular) {
    this.cy.fit(cyNode);
    this.cy.zoom(1);
  }

  createNode(parent: fromRust.Node | undefined | null, type: fromRust.NodeType) : Node {
    let newNode: fromRust.Node = {
      text: "Placeholder text",  //< TODO - if this is unset, cannot see node due to width & height based on label
      file_order: this.getNewNodesFileOrder(parent),
      level: parent ? parent.level + 1 : 0,
      parent_idxs: parent ? [parent.file_order] : [],
      type_is: type
    };
    const newCanvasNode = this.renderNode(newNode, newNode.parent_idxs.map(x => x.toString()));
    return newCanvasNode;
  }

  getNodes(): fromRust.Node[] {
    // Get the nodes in DFS order since this will match the layout of the files
    let visitedNodes: fromRust.Node[] = [];
    this.cy.nodes().dfs({root: "*", visit: ((curr, edge, prev, idx, depth) => {
      visitedNodes.push(curr.data().nodeData.dataNode);
    })});
    return visitedNodes;
  }

  // Render functions
  renderNodes(nodes : fromRust.Nodes) {
    this.cy.remove(this.cy.nodes());
    this.cy.remove(this.cy.edges());
    Node.newCollection(nodes.title);
    nodes.nodes.forEach((node: fromRust.Node) => { 
      let parentIDs = node.parent_idxs.map(id => id.toString());
      this.renderNode(node, parentIDs); 
    });
    this.rerender(true);
  }

  renderNode(newNode: fromRust.Node, parentIDs: string[]) : Node {
    let newCanvasNode = new Node();
    newCanvasNode.dataNode = newNode;
    const nodeUUID = newNode.file_order.toString(); //< Must be string for type - reuse for unique ID
    newCanvasNode.cyNode = this.cy.add({group: "nodes", data: {id: nodeUUID, nodeData: newCanvasNode}});
    parentIDs.forEach((parentNodeID: string) => { // Connect to each parent
      const childNodeID = notNull(newCanvasNode.cyNode.data().id);
      this.cy.add({group: 'edges', data: {source: parentNodeID, target: childNodeID}})
    });
    return newCanvasNode;
  }

  rerender(resetView: boolean = false) {
    let layoutArgs: any = {name: 'dagre'};
    if (!resetView) { layoutArgs = {...layoutArgs, fit: false, centerGraph: false}; }
    this.cy.elements().layout(layoutArgs).run();
    if (resetView) { this.cy.fit(); this.cy.zoom(1); }
  }

  // Members
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

  // Init
  constructor(nodeClickCB : OnNodeClickCB) {
    // Inits
    this.nodeClickCB = nodeClickCB;
    // Binds
    this.cy.on('click', 'node', (evt: any) => { this.onNodeSelect(evt.target); });
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

  // User interaction functions
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

  // Helper functions
  getNewNodesFileOrder(parent: fromRust.Node | undefined | null): number {
    let nodeIDToFindMaxFrom = parent ? parent.file_order.toString() : this.cy.nodes().roots().last().data().id;
    let maxFileOrderFromParent: number = 0;
    this.cy.elements().dfs({root: `#${nodeIDToFindMaxFrom}`, visit: ((curr, edge, prev, idx, depth) => {
      maxFileOrderFromParent = Math.max(maxFileOrderFromParent, curr.data().nodeData.dataNode.file_order);
    })});
    maxFileOrderFromParent = 12;
    return maxFileOrderFromParent + 1;
  }
};
