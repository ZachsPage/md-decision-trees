import {Node} from "./CanvasElems"
import {getNodeColor} from "./Utils"
import {notNull} from "../Utils"
import {SelectedNode} from "./key-handlers/NodeSelector"
import {DFS, NodeTraverseSelection} from "./NodeTraveseral"
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
type OnNodeClickCB = (selectedNode: SelectedNode) => void;

// Abstracts the rendering backend from Canvas
export class Renderer {
  // Public interaction functions
  updateNodeData(renderID: string, attribute: string, value: any) {
    // Edit the node text through the cy API to update the graph
    const nodeToEdit = this.cy.getElementById(renderID)
    nodeToEdit.data(`nodeData.dataNode.${attribute}`, value);
    this.doLayout();
    this.onNodeSelect(nodeToEdit); //< Cover case where text increases box size - update RenderBox
  }

  focusOnNode(cyNode: cytoscape.NodeSingular, padding: number = 250) {
    this.cy.fit(cyNode, padding);
  }
  
  newNodeTraverseSelection(optStartingNode: SelectedNode | null): NodeTraverseSelection | null {
    const cyNodeStart = optStartingNode ? this.cy.getElementById(optStartingNode.renderID) : this.cy.nodes().roots()[0];
    return new NodeTraverseSelection(this, cyNodeStart);
  }

  createNode(type: fromRust.NodeType, parent: SelectedNode | undefined | null) : Node {
    let newNode: fromRust.Node = {
      // If text this is unset, cannot see node due to width & height based on label
      // - Is cleared once created, but the size is maintained
      text: "Text for init size",
      file_order: 0, //< Doesnt matter - will be populated correctly in getNodes
      level: parent ? parent.node.level + 1 : 0,
      parent_idxs: [], //< Doesnt matter - not used when sending nodes back - using parentID instead for renderNode
      type_is: type
    };
    let renderedNode = this.renderNode(newNode, parent ? [parent.renderID] : []);
    this.doLayout();
    return renderedNode;
  }

  removeNode(renderID: string) {
    const nodeToStartRemovals = this.cy.getElementById(renderID)
    new DFS(nodeToStartRemovals).visitedNodes.forEach(node => this.cy.remove(node));
    this.doLayout();
  }

  getNodes(): fromRust.Node[] {
    // Get the nodes in DFS order since this will match the layout of the files
    return new DFS(this.cy.nodes().roots()).visitedNodes.map(x => x.data().nodeData.dataNode);
  }

  // Render functions
  renderNodes(nodes : fromRust.Nodes) {
    this.cy.remove(this.cy.nodes());
    this.cy.remove(this.cy.edges());
    this.nextNodeID = 0; //< Reset to align with parentIDs
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
    if (resetView) { this.cy.fit(); /*this.cy.zoom(1);*/ }
    // Tried messing with layoutArgs animate / animateDuration / animateFilter - also cy.stop(), but nothing other
    //  that this helped with responsiveness. Oddly, this increases CPU (opposite of my goal), but does feel responsive.
    this.throttleAnimation();
  }

  throttleAnimation() {
    this.cy.delay(1000, () => {
      this.cy.clearQueue();
      this.throttleAnimation();
    });
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
  currLayout: any = null;

  // Init
  constructor(nodeClickCB : OnNodeClickCB) {
    console.log("new renderer");
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
          'text-background-color': (cyNode: cytoscape.NodeSingular): string => {
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
    const selectedNode = new SelectedNode(cyNode.data().nodeData.dataNode, cyNode.data().id, nodeRenderOutline);
    notNull(this.nodeClickCB)(selectedNode);
  }
};
