import {Node} from "./CanvasElems"
import {getNodeColor} from "./Utils"
import {assert, notNull} from "../Utils"
import {SelectedNode} from "./Canvas"
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

// Had to make this since couldn't figure out why the built in dfs was going top / right / left
class DFS {
  visitedNodes: fromRust.Node[] = []
  constructor(rootNodes: cytoscape.NodeCollection) {
    rootNodes.forEach((node: cytoscape.NodeSingular) => this.continueDFS(node));
  }
  continueDFS(currNode: cytoscape.NodeSingular) {
    this.visitedNodes.push(currNode.data().nodeData.dataNode);
    currNode.outgoers().forEach((edge: cytoscape.EdgeSingular) => {
      edge.targets().forEach((child: cytoscape.NodeSingular) => {
        this.continueDFS(child)
      });
    });
  }
};

// Triggered when a node is clicked
type OnNodeClickCB = (selectedNode: SelectedNode) => void;

// Abstracts the rendering backend from Canvas
export class Renderer {
  // Public interaction functions
  updateNodeData(renderID: string, attribute: string, value: any) {
    // Edit the node text through the cy API to update the graph
    this.cy.getElementById(renderID).data(`nodeData.dataNode.${attribute}`, value);
    this.doLayout();
  }

  focusOnNode(cyNode: cytoscape.NodeSingular) {
    this.cy.fit(cyNode, /*padding*/ 120);
  }

  createNode(parent: fromRust.Node | undefined | null, type: fromRust.NodeType) : Node {
    let newNode: fromRust.Node = {
      // If text this is unset, cannot see node due to width & height based on label
      // - Is cleared once created, but the size is maintained
      text: "Text for init size",
      file_order: 0, //< Doesnt matter - will be populated correctly in getNodes
      level: parent ? parent.level + 1 : 0,
      parent_idxs: parent ? [parent.file_order] : [],
      type_is: type
    };
    let renderedNode = this.renderNode(newNode, newNode.parent_idxs.map(x => x.toString()));
    this.doLayout();
    return renderedNode;
  }

  getNodes(): fromRust.Node[] {
    // Get the nodes in DFS order since this will match the layout of the files
    return new DFS(this.cy.nodes().roots()).visitedNodes;
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
    this.doLayout(true);
  }

  renderNode(newNode: fromRust.Node, parentIDs: string[]) : Node {
    let newCanvasNode = new Node();
    newCanvasNode.dataNode = newNode;
    newCanvasNode.cyNode = this.cy.add({group: "nodes", data: {id: this.nextNodeID.toString(), nodeData: newCanvasNode}});
    ++this.nextNodeID;
    parentIDs.forEach((parentNodeID: string) => { // Connect to each parent
      const childNodeID = notNull(newCanvasNode.cyNode.data().id);
      this.cy.add({group: 'edges', data: {source: parentNodeID, target: childNodeID}})
    });
    return newCanvasNode;
  }

  doLayout(resetView: boolean = false) {
    let layoutArgs: any = {name: 'dagre'};
    if (!resetView) { layoutArgs = {...layoutArgs, fit: false, centerGraph: false}; }
    this.cy.elements().layout(layoutArgs).run();
    if (resetView) { this.cy.fit(); this.cy.zoom(1); }
  }

  // Members
  cy = cytoscape({
    container: notNull(document.querySelector('.canvas')),
    // Interaction:
    zoomingEnabled: true, userZoomingEnabled: true, wheelSensitivity: 0.5,
    panningEnabled: true, userPanningEnabled: true,
    boxSelectionEnabled: true, selectionType: 'single',
    // Rendering:
    styleEnabled: true,
  });
  nodeClickCB: OnNodeClickCB | null = null;
  nextNodeID: number = 0;

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
          "border-width": 12, 'border-color': "black", 'text-background-opacity': 1, 'text-background-padding': "5", 
          'text-background-color': (cyNode: cytoscape.NodeSingular): String => {
             return getNodeColor(cyNode.data().nodeData.dataNode.type_is);
          },
        })
      .selector(':selected').style({'border-color': "blue", "border-width": 20, }) //< Highlight when selected
    .update();
    cytoscape.use(dagre)
  }

  // User interaction functions
  onNodeSelect(cyNode: cytoscape.NodeSingular) {
    // Give user the nodes render attributes to allow drawing over it & the unwrapped node
    const nodeBox = cyNode.renderedBoundingBox({includeOverlays: false});
    const canvasBox = notNull(this.cy.container()?.getBoundingClientRect());
    const renderOffset = 10;
    const nodeRenderOutline: RenderBox = {
      x: canvasBox.x + nodeBox.x1 - renderOffset, width: nodeBox.x2 - nodeBox.x1,
      y: canvasBox.y + nodeBox.y1 - renderOffset, height: nodeBox.y2 - nodeBox.y1,
      color: cyNode.style("text-background-color")
    };
    const selectedNode: SelectedNode = {
      node: cyNode.data().nodeData.dataNode,
      renderID: cyNode.data().id,
      box: nodeRenderOutline,
      beingEdited: false,
    }
    notNull(this.nodeClickCB)(selectedNode);
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
