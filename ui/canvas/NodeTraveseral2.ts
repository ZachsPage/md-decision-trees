import {Renderer} from "./Render2"
import {notNull} from "../Utils"

// Had to make this since couldn't figure out why the built-in dfs was going top / right / left
export class DFS {
  visitedNodes: any[] = []
  constructor(rootNodes: any) {
    rootNodes.forEach((node: any) => this.continueDFS(node));
  }
  continueDFS(currNode: any) {
    this.visitedNodes.push(currNode);
    currNode.outgoers().forEach((edge: cytoscape.EdgeSingular) => {
      edge.targets().forEach((child: any) => {
        this.continueDFS(child)
      });
    });
  }
};

type NodeId = number

// Keeps a window of nodes that allows switching the "currently selected node"  
export class NodeTraverseSelection {
  renderer?: Renderer;
  curr: NodeId;
  firstParent: NodeId | null = null
  rightSibs: NodeId[] = []
  leftSibs: NodeId[] = []

  constructor(renderer: Renderer, startingNode: any) {
    this.renderer = renderer;
    this.curr = startingNode.id;
    this.populateFrom(this.curr);
  }

  node() {
    return this._graph().node(this.curr);
  }

  clear() { 
    this.renderer?.onNodeSelect(null)
  }

  moveDown() {
    const children = this.renderer?.graph.successors(this.curr);
    if (children && children.length > 0) {
      this.populateFrom(children[0]);
    }
  }

  moveUp() {
    this.populateFrom(this.firstParent);
  }

  moveRight() {
    if (this.rightSibs.length == 0) { return; }
    this.populateFrom(notNull(this.rightSibs.shift()));
  }

  moveLeft() {
    if (this.leftSibs.length == 0) { return; }
    this.populateFrom(notNull(this.leftSibs.shift()));
  }
 
  // Populates member variables starting from startingNode to be used for switching which node is selected
  populateFrom(startingNodeId: any | null) {
    if (!startingNodeId || startingNodeId.length == 0) { return; }
    this.clear();
    this.curr = startingNodeId;
    const parents = this._graph().predecessors(this.curr)
    this.firstParent = (parents && parents.indexOf(this.curr) === -1) ? parents[0] : null;
    // Get the siblings - handle if its a root or if it has actual siblings
    let sibIds = this.firstParent ? this._graph().successors(this.firstParent)
      : this._graph().filterNodes((nodeId: any) => { return this._graph().predecessors(nodeId).length == 0; }).nodes() 
    // Separate the siblings between left and right
    const splitIdx = sibIds.indexOf(this.curr)
    this.leftSibs = sibIds.slice(0, splitIdx).reverse()
    this.rightSibs = sibIds.slice(splitIdx + 1)
  }

  _graph() {
    return this.renderer?.graph;
  }
}