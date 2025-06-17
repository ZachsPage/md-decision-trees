import {Renderer, NodeId} from "./Render"
import {notNull} from "../Utils"
import * as dagre from 'dagre';

// Helper function to safely get node IDs from graph operations
// - Seems like dagre node type doesnt have ".id", but it does?
function getNodeIds(nodes: any[] | undefined): NodeId[] {
  if (!nodes) return [];
  if (nodes.length > 0 && typeof nodes[0] === 'string') {
    return nodes as NodeId[];
  }
  return nodes.map(node => node.id || node.v || '') as NodeId[];
}

function getRootNodeIDs(graph: dagre.graphlib.Graph): NodeId[] {
  const nodes = graph.filterNodes((nodeId: string) => graph.predecessors(nodeId)?.length === 0);
  return getNodeIds(nodes?.nodes());
}

// Had to make this since couldn't figure out why the built-in dfs was going top / right / left
export class DFS {
  visitedNodes: NodeId[] = []
  graph: dagre.graphlib.Graph | null = null
  constructor(rootNodes: NodeId[], renderer: Renderer) {
    this.graph = renderer?.graph
    if (rootNodes.length == 0 && this.graph) { 
      rootNodes = getRootNodeIDs(this.graph)  
    }
    rootNodes.forEach((nodeID: NodeId) => this.continueDFS(nodeID));
  }
  continueDFS(currNodeId: NodeId) {
    this.visitedNodes.push(currNodeId);
    if (this.graph) {
      const successors = this.graph.successors(currNodeId);
      const successorIds = getNodeIds(successors);
      successorIds.forEach(childId => {
        if (this.visitedNodes.indexOf(childId) === -1) {
          this.continueDFS(childId);
        }
      });
    }
  }
};

// Keeps a window of nodes that allows switching the "currently selected node"  
export class NodeTraverseSelection {
  renderer?: Renderer; //< Used to read the backend graph
  curr: NodeId | null;
  currParent: NodeId | null = null;
  lastDepthChangeParent: NodeId | null = null; // covers the case where a node has multiple parents
  rightSibs: NodeId[] = []
  leftSibs: NodeId[] = []

  constructor(renderer: Renderer, startinNodeId: NodeId) {
    this.renderer = renderer;
    this.curr = startinNodeId
    this._populateFrom(this.curr);
  }

  _graph(): dagre.graphlib.Graph | undefined {
    return this.renderer?.graph;
  }

  currNodeId() : NodeId | null {
    return this.curr;
  }

  moveDown() {
    const graph = this._graph();
    if (!graph || !this.curr) return;
    
    const childrenIds = getNodeIds(graph.successors(this.curr));
    if (childrenIds.length > 0) {
      this._populateFrom(childrenIds[0], this.curr);
    }
  }

  moveUp() {
    this._populateFrom(this.currParent);
  }

  moveRight() {
    if (this.rightSibs.length == 0) { return; }
    this._populateFrom(notNull(this.rightSibs.shift()));
  }

  moveLeft() {
    if (this.leftSibs.length == 0) { return; }
    this._populateFrom(notNull(this.leftSibs.shift()));
  }
 
  // Populates member variables starting from startingNode to be used for switching which node is selected
  _populateFrom(startingNodeId: NodeId | null, depthChangeParent: NodeId | null = null) {
    if (!startingNodeId || startingNodeId.length == 0) { return; }
    
    const graph = this._graph();
    if (!graph) return;
    
    this.curr = startingNodeId;
    
    const parents = graph.predecessors(this.curr);
    const parentIds = getNodeIds(parents);
    const isRoot = parentIds.length == 0;
    if (depthChangeParent) {
      this.lastDepthChangeParent = depthChangeParent;
    }
    
    let sibIds: NodeId[] = [];
    if (isRoot) {
      sibIds = getRootNodeIDs(graph);
    } else {
      // Avoid some sibs being untraversable if node has multiple parents - populate from prev selected parent first
      if (this.lastDepthChangeParent && parentIds.indexOf(this.lastDepthChangeParent) !==-1) {
        parentIds.unshift(this.lastDepthChangeParent);
      }
      this.currParent = parentIds[0];
      for (const parentId of parentIds) {
        const siblings = graph.successors(parentId);
        sibIds.push(...getNodeIds(siblings));
      }
    }
    
    // Separate the siblings between left and right
    const splitIdx = sibIds.indexOf(this.curr);
    this.leftSibs = sibIds.slice(0, splitIdx).reverse();
    this.rightSibs = sibIds.slice(splitIdx + 1);
  }
}
