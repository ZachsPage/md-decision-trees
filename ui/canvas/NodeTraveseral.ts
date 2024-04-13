import {Renderer} from "./Render"
import {notNull} from "../Utils"

// Had to make this since couldn't figure out why the built-in dfs was going top / right / left
export class DFS {
  visitedNodes: cytoscape.NodeSingular[] = []
  constructor(rootNodes: cytoscape.NodeCollection) {
    rootNodes.forEach((node: cytoscape.NodeSingular) => this.continueDFS(node));
  }
  continueDFS(currNode: cytoscape.NodeSingular) {
    this.visitedNodes.push(currNode);
    currNode.outgoers().forEach((edge: cytoscape.EdgeSingular) => {
      edge.targets().forEach((child: cytoscape.NodeSingular) => {
        this.continueDFS(child)
      });
    });
  }
};

// Keeps a window of nodes that allows switching the "currently selected node"  
export class NodeTraverseSelection {
  renderer?: Renderer;
  curr: cytoscape.NodeSingular;
  firstParent: cytoscape.NodeSingular | null = null
  rightSibs: cytoscape.NodeSingular[] = []
  leftSibs: cytoscape.NodeSingular[] = []

  constructor(renderer: Renderer, startingNode: cytoscape.NodeSingular) {
    this.renderer = renderer;
    this.curr = startingNode;
    this.populateFrom(startingNode);
  }

  clear() { this.curr.unselect(); }

  moveDown() {
    // @ts-ignore: targets doesn't exist?
    const firstChild = this.curr.outgoers()?.first()?.targets()?.first();
    this.populateFrom(firstChild);
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
  populateFrom(startingNode: cytoscape.NodeSingular | null) {
    if (!startingNode || startingNode.length == 0) { return; }
    this.clear();
    this.curr = startingNode;
    // @ts-ignore: source doesn't exist?
    this.firstParent = this.curr.incomers()?.first()?.source()?.first();
    // Get the siblings - handle if its a root or if it has actual siblings
    let sibs = !this.firstParent ? notNull(this.renderer).cy.nodes().roots() : [];
    if (this.firstParent) {
      this.firstParent?.outgoers()?.forEach((edge: cytoscape.EdgeSingular) => {
        edge.targets().forEach((sibOrSelf: cytoscape.NodeSingular) => {
         sibs.push(sibOrSelf);
      })});
    }
    // Separate the siblings between left and right
    let gettingLeftSibs = true;
    this.leftSibs = [], this.rightSibs = [];
    sibs?.forEach((sibOrSelf: cytoscape.NodeSingular) => {
      if (gettingLeftSibs && sibOrSelf.data().id === this.curr?.data().id) {;
        gettingLeftSibs = false;
        return;
      }
      let correctSideSibs = gettingLeftSibs ? this.leftSibs : this.rightSibs;
      correctSideSibs.push(sibOrSelf);
    });
    this.curr.select();
  }
}