import {Node} from "./CanvasElems"
import {notNull} from "../Utils"
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
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './Canvas.css';

import * as fromRust from "../bindings/bindings"
import {SelectedNode} from "./key-handlers/NodeSelector"
import {DFS, NodeTraverseSelection} from "./NodeTraveseral"
import NodeContextMenu from '../components/NodeContextMenu';

// Triggered when a node is clicked
type OnNodeClickCB = (selectedNode: SelectedNode) => void;

export type NodeId = string;

// From copilot - used to feed height / width into dagre to avoid overlapping nodes
function getTextDimensions(text: string, minWidth: number, maxWidth: number, font: string = '16px Arial'): { width: number, height: number } {
  const canvas = document.createElement('canvas') as HTMLCanvasElement;
  const context = notNull(canvas.getContext('2d'))
  context.font = font;
  const words = text.split(' ');
  let line = '';
  let width = minWidth;
  const lineHeight = parseInt(font, 10); // Initial height based on font size
  let height = lineHeight;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const testWidth = context.measureText(testLine).width;
    if (testWidth > maxWidth && i > 0) {
      line = words[i] + ' ';
      height += lineHeight;
    } else {
      line = testLine;
      width = Math.max(width, testWidth);
    }
  }
  return {width: Math.min(width, maxWidth), height};
}

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

  removeNode(renderID: NodeId): void {
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
  renderNodes(nodes : fromRust.Nodes): void {
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
      className: `node-${newNode.type_is?.toLowerCase()}`,
      position: { x: 0, y: 0 },
      type: 'customNodeComp', // Must align with field name in nodeTypes
    }
    this.nodes.push(newCanvasNode);
    ++this.nextNodeID;
    parentIDs.forEach((parentNodeID: NodeId) => { // Connect to each parent
      const childNodeID = notNull(newCanvasNode.id);
      const edgeType = newNode.type_is == "Pro" ? "pro" : newNode.type_is == "Con" ? "con" : "default"
      this.edges.push({
        source: parentNodeID,
        target: childNodeID,
        id: `e${parentNodeID}-${childNodeID}`,
        style: {
          stroke: `var(--edge-${edgeType}-color)`,
          strokeWidth: 3
        }
      });
    });
    return newCanvasNode.id;
  }

  doLayout(): void {
    this.nodes.forEach(node => { 
      // TODO: This works okay but not great - may need to switch to a different layout library like elkjs
      const textDim = getTextDimensions(node.data.label, 50, 190);
      this.graph.setNode(node.id, {...node, ...textDim}); 
    });
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
  renderGraph: ((nodes: FlowNode[], edges: FlowEdge[], callback?: () => void) => void) | null = null;
  doubleClickNode: ((nodeId: NodeId) => void) | null = null;
  nodeBeingEdited: Element | null = null;

  // Init
  constructor(nodeClickCB : OnNodeClickCB) {
    this.nodeClickCB = nodeClickCB;
    this._setUpGraph();
    this.doLayout();
  }

  _setUpGraph(): void {
    this.graph.setDefaultEdgeLabel(() => ({}));
    this.graph.setGraph({rankdir: "TB", ranksep: 100, nodesep: 200});
  }

  setRenderGraphFcn(renderGraph: (nodes: FlowNode[], edges: FlowEdge[], callback?: () => void) => void): void { 
    this.renderGraph = renderGraph; 
  }
  
  setDoubleClickNodeFcn(doubleClickNode: (nodeId: NodeId) => void): void { 
    this.doubleClickNode = doubleClickNode; 
  }
  
  _rerenderNodes(cb: (() => void) | null = null): void {
    if (this.renderGraph) {
      this.renderGraph(this.nodes, this.edges, cb || undefined);
    }
  }

  // User interaction functions
  onNodeSelect(selectedNodeId: NodeId | null, cb: (() => void) | null = null): void {
    // Give user the nodes render attributes to allow drawing over it & the unwrapped node
    let selectedNode = null as SelectedNode | null;
    this.nodes.forEach(node => { 
      if (node.id === selectedNodeId) {
        node.className = `${node.className} node-selected`;
        selectedNode = new SelectedNode(node.data.dataNode, node.id);
      } else {
        node.className = node.className?.replace(' node-selected', '') || '';
      }
    });
    if (selectedNode) {
      notNull(this.nodeClickCB)(selectedNode);
    }
    this._rerenderNodes(cb);
  }

  isEditingNode(): boolean { 
    if (this.nodeBeingEdited !== null) { // Refocus the text box due to bug with focus on create
      document.getElementById(`${this.nodeBeingEdited?.id}-text`)?.focus();
      return true;
    }
    return false;
  }

  onNodeEdit(nodeID: NodeId): void {
    const nodeToEdit = notNull(document.getElementById(`custom-node-${nodeID}`)) as HTMLElement
    this.nodeBeingEdited = nodeToEdit;
    this.nodeBeingEdited.dispatchEvent(new MouseEvent("dblclick", {bubbles: true, cancelable: false}));
    document.getElementById(`custom-node-${nodeID}-text`)?.focus();
  }

  onNodeEditFinish(): void {
    if (this.isEditingNode()) {
      this.nodeBeingEdited?.dispatchEvent(new KeyboardEvent("keydown", {key: "e", bubbles: true, cancelable: true}));
      this.nodeBeingEdited = null;
    }
  }
};

function CustomNodeComp({ data, id }: NodeProps): JSX.Element {
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
    if (evt.key === 'e' || evt.key === 'Escape') {
      setIsEditing(false);
      data.onTextChange(id, text); // Set in nodesWithHandlers
    }
  }, [id, text, data]);
 
  return (
    <div id={nodeElementId} onDoubleClick={handleDoubleClick} onKeyDown={handleKeyDown}>
      <Handle type="target" position={Position.Top} />
      {!isEditing
      ? <div className="node-content">{text}</div> 
      : <textarea 
          ref={htmlRef} 
          id={nodeElementTextBoxId} 
          value={text} 
          autoFocus
          className="node-textarea"
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

// Inner component that uses ReactFlow hooks
const RendererCompInner = ({ renderer }: { renderer: Renderer }): JSX.Element => {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const nodeTypes = useMemo(() => ({ customNodeComp: CustomNodeComp }), []);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    nodeId: string;
    nodeType: string;
  }>({
    show: false,
    x: 0,
    y: 0,
    nodeId: '',
    nodeType: '',
  });
  const { project } = useReactFlow();

  // Update initialNodes to include the text change handler
  const onNodeTextChange = useCallback((changedNodeId: NodeId, newText: string): void => {
    setNodes((changedNodes) => changedNodes?.map((node) => {
      if (node.id === changedNodeId) {
        node.data.label = newText;
        node.data.dataNode.text = newText;
      }
      return node;
    }));
  }, [setNodes]);
  const nodesWithHandlers = nodes?.map(node => {node.data.onTextChange = onNodeTextChange; return node;});

  const onNodesChange = useCallback((changes: NodeChange[]): void => {
    setNodes((changedNodes) => applyNodeChanges(changes, changedNodes));
  }, [setNodes]);
  
  renderer.setRenderGraphFcn( async (tmpNodes: FlowNode[], tmpEdges: FlowEdge[], renderedCB: (() => void) | undefined): Promise<void> => { 
    setNodes([...tmpNodes]); 
    setEdges([...tmpEdges]); // Copy to force re-render, or new edges from createNode wont show up
    if (renderedCB) { // Waits for re-render to finish before calling the callback
      // - Used to ensure the node element is available before caller uses something like onNodeEdit
      await new Promise(resolve => setTimeout(resolve));
      renderedCB();
    }
  });

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: FlowNode) => {
    // Prevent the default context menu
    event.preventDefault();
    
    // Get the node type from the className
    const nodeType = node.className?.includes('pro') ? 'pro' : 
                     node.className?.includes('con') ? 'con' : '';
    
    // Only show context menu for Pro or Con nodes
    if (nodeType === 'pro' || nodeType === 'con') {
      // Use the client coordinates directly instead of projecting
      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        nodeType: nodeType,
      });
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setContextMenu({ ...contextMenu, show: false });
  }, [contextMenu]);

  const handleMakeProFor = useCallback(() => {
    // This will be implemented in the next step
    console.log('Make Pro for...', contextMenu.nodeId);
    setContextMenu({ ...contextMenu, show: false });
  }, [contextMenu]);

  const handleMakeConFor = useCallback(() => {
    // This will be implemented in the next step
    console.log('Make Con for...', contextMenu.nodeId);
    setContextMenu({ ...contextMenu, show: false });
  }, [contextMenu]);

  return (
    <>
      <ReactFlow fitView defaultEdgeOptions={{animated: false}}
        nodes={nodesWithHandlers} edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes} 
        zoomOnDoubleClick={false}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
      >
        <Background />
        <Controls />
      </ReactFlow>
      
      {contextMenu.show && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType={contextMenu.nodeType}
          onClose={() => setContextMenu({ ...contextMenu, show: false })}
          onMakeProFor={handleMakeProFor}
          onMakeConFor={handleMakeConFor}
        />
      )}
    </>
  );
};

// Wrapper component that provides the ReactFlow context
export const RendererComp = (({renderer}: {renderer: Renderer}): JSX.Element => {
  return (
    <ReactFlowProvider>
      <RendererCompInner renderer={renderer} />
    </ReactFlowProvider>
  );
});
