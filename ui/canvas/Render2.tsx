import {Node} from "./CanvasElems"
import {notNull} from "../Utils"
import {getNodeColor} from "./Utils"
import { useCallback } from 'react';
import dagre from 'dagre';
import ReactFlow, { 
  Node as FlowNode,
  Edge as FlowEdge,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  NodeChange,
  Background,
  Controls,
} from 'reactflow';
import 'reactflow/dist/style.css';

import * as fromRust from "../bindings/bindings"
import {SelectedNode} from "./key-handlers/NodeSelector"
import {DFS, NodeTraverseSelection} from "./NodeTraveseral2"

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

export class Renderer {
  // Public interaction functions
  updateNodeData(renderID: string, attribute: string, value: any) {
    // Edit the node text through the cy API to update the graph
    /*
    const nodeToEdit = this.cy.getElementById(renderID)
    nodeToEdit.data(`nodeData.dataNode.${attribute}`, value);
    this.doLayout();
    this.onNodeSelect(nodeToEdit); //< Cover case where text increases box size - update RenderBox
    */
  }

  focusOnNode(cyNode: cytoscape.NodeSingular, padding: number = 250) {
    //this.cy.fit(cyNode, padding);
  }
  
  newNodeTraverseSelection(optStartingNode: SelectedNode | null)/*: NodeTraverseSelection | null*/ {
    const startingNodeId = optStartingNode ? optStartingNode.renderID : 0
    return new NodeTraverseSelection(this, this.graph.node(startingNodeId));
  }

  createNode(type: fromRust.NodeType, parent: SelectedNode | undefined | null)/*: Node*/ {
    /*
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
    */
  }

  removeNode(renderID: string) {
    /*
    const nodeToStartRemovals = this.cy.getElementById(renderID)
    new DFS(nodeToStartRemovals).visitedNodes.forEach(node => this.cy.remove(node));
    this.doLayout();
    */
  }

  getNodes()/*: fromRust.Node[]*/ {
    // Get the nodes in DFS order since this will match the layout of the files
    //return new DFS(this.cy.nodes().roots()).visitedNodes.map(x => x.data().nodeData.dataNode);
    return this.nodes;
  }

  // Render functions
  renderNodes(nodes : fromRust.Nodes) {
    this._setUpGraph();
    this.nodes = [];
    this.edges = [];
    this.nextNodeID = 0; //< Reset to align with parentIDs
    Node.newCollection(nodes.title);
    nodes.nodes.forEach((node: fromRust.Node) => { 
      let parentIDs = node.parent_idxs.map(id => id.toString());
      this.renderNode(node, parentIDs); 
    });
    this.doLayout(true);
  }

  renderNode(newNode: fromRust.Node, parentIDs: string[]) {
    const newCanvasNode = {
      id: this.nextNodeID.toString(),
      data: { 
        label: newNode.text,
        nodeData: newNode,
      },
      rank: this._getRank(newNode.type_is),
      style: this._getNodesStyle(newNode.type_is),
      position: { x: 0, y: 0 },
    }
    this.nodes.push(newCanvasNode);
    ++this.nextNodeID;
    parentIDs.forEach((parentNodeID: string) => { // Connect to each parent
      const childNodeID = notNull(newCanvasNode.id);
      this.edges.push({
        source: parentNodeID,
        target: childNodeID,
        id: `e${parentNodeID}-${childNodeID}`,
        style: this._getEdgeStyle(newNode.type_is),
      });
    });
  }

  _getNodesStyle(node_type: any) {
    return {'background': getNodeColor(node_type), 'color': '#000000', 'border': '2px solid #000000'};
  }

  _getEdgeStyle(relationship: any) {
    switch (relationship) {
        case 'Pro': return { stroke: '#90EE90', strokeWidth: 2 };
        case 'Con': return { stroke: '#FFB6B6', strokeWidth: 2 };
        default: return { stroke: '#666666', strokeWidth: 1 };
    }
  };

  _getRank(node_type: any) {
    switch (node_type) { 
      case 'Decision': return 0;
      case 'Option': return 1;
      case 'Pro': return 2;
      case 'Con': return 3;
      case 'Note': return 4;
      default: return 5;
    }
  }

  doLayout(resetView: boolean = false) {
    this.nodes.forEach(node => { this.graph.setNode(node.id, node); });
    this.edges.forEach(edge => { this.graph.setEdge(edge.source, edge.target); });
    dagre.layout(this.graph);
    this.nodes.forEach(node => {
      const nodeWithPosition = this.graph.node(node.id);
      if (nodeWithPosition) {
        node.position = {x: nodeWithPosition.x, y: nodeWithPosition.y}
      }
    });
    this._rerenderNodes();
  }

  // Members
  graph = new dagre.graphlib.Graph();
  nodeClickCB: OnNodeClickCB | null = null;
  nextNodeID: number = 0;
  currLayout: any = null;
  nodes: FlowNode[] = [];
  edges: FlowEdge[] = [];
  renderGraph: any = null;

  // Init
  constructor(nodeClickCB : OnNodeClickCB) {
    // Inits
    this.nodeClickCB = nodeClickCB;
    this._setUpGraph();
    this.doLayout();
  }

  _setUpGraph() {
    this.graph.setDefaultEdgeLabel(() => ({}));
    this.graph.setGraph({
      rankdir: "TB", 
      ranksep: 100,
      nodesep: 150
    });
  }

  setRenderGraphFcn(renderGraph: any) { this.renderGraph = renderGraph; }
  _rerenderNodes() {
    if (this.renderGraph) {
      this.renderGraph(this.nodes, this.edges);
    }
  }

  // User interaction functions
  onNodeSelect(selectedNodeId: any | null) {
    // Give user the nodes render attributes to allow drawing over it & the unwrapped node
    let selectedNode = null as SelectedNode | null;
    this.nodes.forEach(node => { 
      if (node.id === selectedNodeId) {
        node.style = { ...node.style, border: '5px solid #0000FF' };
        selectedNode = new SelectedNode(node.data.dataNode, node.id, null);
      } else {
        node.style = { ...node.style, border: '2px solid #000000' };
      }
    });
    if (selectedNode) {
      notNull(this.nodeClickCB)(selectedNode.renderID);
    }
    this._rerenderNodes();
  }
};

export const RendererComp = (({renderer}: {renderer: Renderer}) => {
    const [nodes, setNodes] = useNodesState([])
    const [edges, setEdges] = useEdgesState([]);
    renderer.setRenderGraphFcn((tmpNodes: any, tmpEdges: any) => { setNodes(tmpNodes); setEdges(tmpEdges); });

    // Update initialNodes to include the text change handler
    const handleNodeTextChange = useCallback((nodeId: string, newText: string) => {
      setNodes((nds) => nds?.map((node) => {
        return node.id === nodeId ? {...node, data: {...node.data, label: newText}} : node;
      }));
    }, [setNodes]);
    const nodesWithHandlers = nodes?.map(node => ({...node, data: { ...node.data, onChange: handleNodeTextChange}}));

    const onNodesChange = useCallback((changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    }, [setNodes]);

    return (
      <ReactFlow id="reactflow-canvas" fitView defaultEdgeOptions={{type: 'smoothstep', animated: true}}
        nodes={nodesWithHandlers} edges={edges}
        onNodesChange={onNodesChange}
      >
        <Background />
        <Controls />
      </ReactFlow>
    );
});
