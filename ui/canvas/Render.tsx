import {Node} from "./CanvasElems"
import {notNull} from "../Utils"
import {getNodeColor} from "./Utils"
import {useCallback, useState, useMemo, useRef} from 'react';
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
  NodeProps,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

import * as fromRust from "../bindings/bindings"
import {SelectedNode} from "./key-handlers/NodeSelector"
import {DFS, NodeTraverseSelection} from "./NodeTraveseral"

// Triggered when a node is clicked
type OnNodeClickCB = (selectedNode: SelectedNode) => void;

export type NodeId = string;

export class Renderer {
  nodeTraverser: NodeTraverseSelection | null = null;

  // Public interaction functions
  getNodeTraverser(optStartingNode: SelectedNode | null): NodeTraverseSelection {
    const startingNodeId = optStartingNode ? optStartingNode.renderID : "0"
    if (!this.nodeTraverser || !optStartingNode) {
      this.nodeTraverser = new NodeTraverseSelection(this, startingNodeId);
    }
    return notNull(this.nodeTraverser);
  }

  createNode(type: fromRust.NodeType, parent: SelectedNode | undefined | null): NodeId {
    let newNode: fromRust.Node = {
      text: "",
      file_order: 0, //< Doesnt matter - will be populated correctly in getNodes
      level: parent ? parent.node.level + 1 : 0,
      parent_idxs: [], //< Doesnt matter - not used when sending nodes back - using parentID instead for renderNode
      type_is: type
    };
    let newNodeID = this.renderNode(newNode, parent ? [parent.renderID] : []);
    this.doLayout();
    return newNodeID;
  }

  removeNode(renderID: NodeId) {
    const nodesToRemove: NodeId[] = new DFS([renderID], this).visitedNodes
    let parentToSelectId: NodeId | null = this.nodes.find(node => node.id === nodesToRemove[0])?.data.dataNode.parent_idxs[0];
    parentToSelectId = parentToSelectId ? parentToSelectId : "0";
    // Need to remove from the graph (will also remove edges), but also remove them on our end
    nodesToRemove.forEach(nodeID => { this.graph.removeNode(nodeID); });
    this.nodes = this.nodes.filter(node => !nodesToRemove.includes(node.id));
    this.edges = this.edges.filter(edge => {
      return !nodesToRemove.includes(edge.source) && !nodesToRemove.includes(edge.target);
    });
    this.doLayout();
    this.onNodeSelect(parentToSelectId); 
    this.nodeTraverser = new NodeTraverseSelection(this, parentToSelectId);
  }

  getNodes(): fromRust.Node[] {
    // Get the nodes in DFS order since this will match the layout of the files
    return new DFS([], this).visitedNodes.map(x => this.nodes.find(node => node.id === x)?.data.dataNode);
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
    this.doLayout();
  }

  renderNode(newNode: fromRust.Node, parentIDs: string[]): NodeId {
    const newCanvasNode = {
      id: this.nextNodeID.toString(),
      data: { 
        label: newNode.text,
        dataNode: newNode,
      },
      rank: this._getRank(newNode.type_is),
      style: this._getNodesStyle(newNode.type_is),
      position: { x: 0, y: 0 },
      type: 'customNodeComp', // Must align with field name in nodeTypes
    }
    this.nodes.push(newCanvasNode);
    ++this.nextNodeID;
    parentIDs.forEach((parentNodeID: NodeId) => { // Connect to each parent
      const childNodeID = notNull(newCanvasNode.id);
      this.edges.push({
        source: parentNodeID,
        target: childNodeID,
        id: `e${parentNodeID}-${childNodeID}`,
        style: this._getEdgeStyle(newNode.type_is),
      });
    });
    return newCanvasNode.id;
  }

  // TODO: move to css
  _getNodesStyle(node_type: any) {
    return {'background': getNodeColor(node_type), 'color': '#000000', 'border': '2px solid #000000'};
  }

  // TODO: move to css
  _getEdgeStyle(relationship: any) {
    switch (relationship) {
        case 'Pro': return {stroke: '#90EE90', strokeWidth: 3};
        case 'Con': return {stroke: '#FFB6B6', strokeWidth: 3};
        default: return {stroke: '#666666', strokeWidth: 3};
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

  doLayout() {
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
  nodes: FlowNode[] = [];
  edges: FlowEdge[] = [];
  renderGraph: any | null = null;
  doubleClickNode: any = null;
  nodeBeingEdited: Element | null = null;

  // Init
  constructor(nodeClickCB : OnNodeClickCB) {
    this.nodeClickCB = nodeClickCB;
    this._setUpGraph();
    this.doLayout();
  }

  _setUpGraph() {
    this.graph.setDefaultEdgeLabel(() => ({}));
    this.graph.setGraph({rankdir: "TB", ranksep: 100, nodesep: 200});
  }

  setRenderGraphFcn(renderGraph: any) { this.renderGraph = renderGraph; }
  setDoubleClickNodeFcn(doubleClickNode: any) { this.doubleClickNode = doubleClickNode; }
  _rerenderNodes(cb: any | null = null) {
    if (this.renderGraph) {
      this.renderGraph(this.nodes, this.edges, cb);
    }
  }

  // User interaction functions
  onNodeSelect(selectedNodeId: NodeId | null, cb: any | null = null) {
    // Give user the nodes render attributes to allow drawing over it & the unwrapped node
    let selectedNode = null as SelectedNode | null;
    this.nodes.forEach(node => { 
      if (node.id === selectedNodeId) {
        node.style = { ...node.style, border: '5px solid #0000FF' };
        selectedNode = new SelectedNode(node.data.dataNode, node.id);
      } else {
        node.style = { ...node.style, border: '2px solid #000000' };
      }
    });
    if (selectedNode) {
      notNull(this.nodeClickCB)(selectedNode);
    }
    this._rerenderNodes(cb);
  }

  isEditingNode() { 
    if (this.nodeBeingEdited !== null) { // Refocus the text box due to bug with focus on create
      document.getElementById(`${this.nodeBeingEdited?.id}-text`)?.focus();
      return true;
    }
    return false;
  }

  onNodeEdit(nodeID: NodeId) {
    const nodeToEdit = notNull(document.getElementById(`custom-node-${nodeID}`)) as HTMLElement
    this.nodeBeingEdited = nodeToEdit;
    this.nodeBeingEdited.dispatchEvent(new MouseEvent("dblclick", {bubbles: true, cancelable: false}));
    document.getElementById(`custom-node-${nodeID}-text`)?.focus();
  }

  onNodeEditFinish() {
    if (this.isEditingNode()) {
      this.nodeBeingEdited?.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true, cancelable: true}));
      this.nodeBeingEdited = null;
    }
  }
};

function CustomNodeComp({ data, id }: NodeProps) {
  const htmlRef = useRef(null); //< Used to focus / auto-size the text area
  const nodeElementId = `custom-node-${id}`; //< Used to mock click the element to edit
  const nodeElementTextBoxId = `custom-node-${id}-text`; //< Use to externally focus on create due to bug
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.label);
  const handleDoubleClick = useCallback(async () => { 
    setIsEditing(true); 
    await new Promise(resolve => setTimeout(resolve));
    const textElem = htmlRef?.current as HTMLTextAreaElement | null;
    textElem?.focus();
    const textLen = data.label.length; // TODO: doesnt align with text.length?
    textElem?.setSelectionRange(textLen, textLen); //< Set cursor to end
  }, []);
  const handleKeyDown = useCallback((evt: React.KeyboardEvent) => {
    if (evt.key === 'Enter' || evt.key === 'Escape') {
      setIsEditing(false);
      data.onTextChange(id, text); // Set in nodesWithHandlers
    }
  }, [id, text, data]);
 
  return (
    <div id={nodeElementId} onDoubleClick={handleDoubleClick} onKeyDown={handleKeyDown}>
      <Handle type="target" position={Position.Top} />
      {!isEditing
      ? <div className="node-content">{text}</div> 
      : <textarea ref={htmlRef} id={nodeElementTextBoxId} value={text} autoFocus
          onChange={(e) => { // Set text and resize to show all text
            setText(e.target.value)
            let thisHTML = notNull(htmlRef.current);
            // https://stackoverflow.com/questions/76048428/html-textarea-why-does-textarea-style-height-textarea-scrollheight-px-exp
            if (thisHTML.scrollHeight > thisHTML.clientHeight) {
              thisHTML.style.height = thisHTML.scrollHeight + "px";
            }
          }}
        />}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const RendererComp = (({renderer}: {renderer: Renderer}) => {
    const [nodes, setNodes] = useNodesState([]);
    const [edges, setEdges] = useEdgesState([]);
    const nodeTypes = useMemo(() => ({ customNodeComp: CustomNodeComp }), []);

    // Update initialNodes to include the text change handler
    const onNodeTextChange = useCallback((changedNodeId: NodeId, newText: string) => {
      setNodes((changedNodes) => changedNodes?.map((node) => {
        if (node.id === changedNodeId) {
          node.data.label = newText;
          node.data.dataNode.text = newText;
        }
        return node;
      }));
    }, [setNodes]);
    const nodesWithHandlers = nodes?.map(node => {node.data.onTextChange = onNodeTextChange; return node;});

    const onNodesChange = useCallback((changes: NodeChange[]) => {
      setNodes((changedNodes) => applyNodeChanges(changes, changedNodes));
    }, [setNodes]);
    
    renderer.setRenderGraphFcn( async (tmpNodes: any, tmpEdges: any, renderedCB: any) => { 
      setNodes([...tmpNodes]); 
      setEdges([...tmpEdges]); // Copy to force re-render, or new edges from createNode wont show up
      if (renderedCB) { // Waits for re-render to finish before calling the callback
        // - Used to ensure the node element is available before caller uses something like onNodeEdit
        await new Promise(resolve => setTimeout(resolve));
        renderedCB();
      }
    });

    return (
      <ReactFlow fitView defaultEdgeOptions={{animated: false}}
        nodes={nodesWithHandlers} edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes} 
        zoomOnDoubleClick={false}
      >
        <Background />
        <Controls />
      </ReactFlow>
    );
});
