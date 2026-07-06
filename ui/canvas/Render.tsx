import {Node} from "./CanvasElems"
import {notNull} from "../Utils"
import {useCallback, useState, useMemo, useRef, useEffect} from 'react';
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
  ConnectionMode,
  EdgeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './Canvas.css';

import * as fromRust from "../bindings/bindings"
import {SelectedNode} from "./key-handlers/NodeSelector"
import {DFS, getNodeIds} from "./NodeTraveseral"
import NodeContextMenu from '../components/NodeContextMenu';
import { KeyboardHelp } from '../modals/KeyboardHelp';
import { canvasStore } from "../stores/CanvasStore";

export type NodeId = string;

// What should happen when the renderer finished updating which node is selected
type UpdateSelectedNodeCB = (selectedNode: SelectedNode) => void;

type renderedNewNodeCB = (newNodeId: NodeId) => void; //< Called once new node is rendered

type Callback = () => void; //< Generic callback

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

// Callbacks that the backend need to populate for the Renderer
export class BackendCBs {
  updateSelection: ((selectedNodeId: NodeId | null, cb?: Callback) => void) | null = null;
}

// Graph backend wrapper to help with common render operations, needed for creating / selecting / updating nodes
export class Renderer {

  // Public interaction functions
  createNode(type: fromRust.NodeType, parent?: SelectedNode, cb?: renderedNewNodeCB): NodeId {
    let newNode: fromRust.Node = {
      text: "",
      file_order: 0, //< Doesnt matter - will be populated correctly in getNodes
      level: parent ? parent.node.level + 1 : 0,
      parent_idxs: [], //< Doesnt matter - not used when sending nodes back - using parentID instead for renderNode
      type_is: type,
      parent_idxs_diff_type: [] //< TODO
    };
    const nodes = [...this._getNodes()];
    const edges = [...this._getEdges()];
    const newNodeID = this._buildRenderNode(newNode, parent ? [parent.renderID] : [], [], nodes, edges);
    this.doLayout(nodes, edges, cb ? () => { cb(newNodeID); } : undefined);
    return newNodeID;
  }

  removeNode(renderID: NodeId): void {
    const nodesToRemove: NodeId[] = new DFS([renderID], this).visitedNodes
    // Use dagre graph to get the first parent of the first node to remove
    const parentIds = nodesToRemove.length > 0 ? getNodeIds(this.graph.predecessors(nodesToRemove[0])) : [];
    const parentToSelectId = parentIds.length > 0 ? parentIds[0] : "0";
    // Need to remove from the graph (will also remove edges), but also remove them on our end
    nodesToRemove.forEach(nodeID => { this.graph.removeNode(nodeID); });
    const nodes = this._getNodes().filter(node => !nodesToRemove.includes(node.id));
    const edges = this._getEdges().filter(edge =>
      !nodesToRemove.includes(edge.source) && !nodesToRemove.includes(edge.target)
    );
    this.doLayout(nodes, edges, () => { this.onNodeSelect(parentToSelectId); });
  }

  getNodes(): fromRust.Node[] {
    // Get the nodes in DFS order since this should match the files layout
    const allNodes = this._getNodes();
    const allEdges = this._getEdges();
    const nodeIds = new DFS([], this).visitedNodes;
    const idToFileOrder = new Map<string, number>();
    nodeIds.forEach((id, index) => idToFileOrder.set(id, index));
    // Set parent_idxs & parent_idxs_diff_type
    // - Doing it now avoids complexity of keeping them aligned with the UI while doing creates / deletes
    return nodeIds.map(id => {
      const dataNode = notNull(allNodes.find(n => n.id === id)).data.dataNode;
      const incomingEdges = allEdges.filter(edge => edge.target === id);
      const isPro = (dataNode.type_is === "Pro"), isCon = (dataNode.type_is === "Con");
      const typeMatchEdgeNNode = (edge: FlowEdge) => {
        if (!isPro && !isCon) {
          return true; //< if not pro / con, always treat as sameTypeEdge -> parent_idx instead of diff_type
        }
        return (isPro && edge.type === "pro") || (isCon && edge.type === "con");
      };
      const edgeSrcToFileIdx = (edges: FlowEdge[]) => { return edges.map(edge => notNull(idToFileOrder.get(edge.source))); }
      dataNode.parent_idxs = edgeSrcToFileIdx(incomingEdges.filter(typeMatchEdgeNNode));
      dataNode.parent_idxs_diff_type = edgeSrcToFileIdx(incomingEdges.filter(edge => !typeMatchEdgeNNode(edge)))
      return dataNode;
    }) as fromRust.Node[];
  }

  // Render functions
  renderNodes(nodes : fromRust.Nodes, cb?: Callback): void {
    this._setUpGraph();
    this.nextNodeID = 0; //< Reset to align with parentIDs
    Node.newCollection(nodes.title);
    const newNodes: FlowNode[] = [];
    const newEdges: FlowEdge[] = [];
    nodes.nodes.forEach((node: fromRust.Node) => {
      const parentIDs = node.parent_idxs.map(id => id.toString());
      const diffTypePars = node.parent_idxs_diff_type;
      const diffTypeParentIDs = diffTypePars && diffTypePars.length > 0 ? diffTypePars.map(id => id.toString()) : [];
      this._buildRenderNode(node, parentIDs, diffTypeParentIDs, newNodes, newEdges);
    });
    this.doLayout(newNodes, newEdges, cb);
  }

  getNodeDFSIndex(renderID: NodeId): number {
    return new DFS([], this).visitedNodes.indexOf(renderID);
  }

  // Helper function to create an edge object
  createEdge(sourceId: string, targetId: string, type: 'pro' | 'con' | 'default'): FlowEdge {
    return {
      source: sourceId,
      target: targetId,
      id: `e${sourceId}-${targetId}`,
      type: type,
      style: {stroke: `var(--edge-${type}-color)`, strokeWidth: 3}
    };
  }

  // Builds a node+edges into the provided arrays — used by both bulk (renderNodes) and single (createNode) paths
  _buildRenderNode(newNode: fromRust.Node, parentIDs: string[], diffTypeParentIDs: string[], nodes: FlowNode[], edges: FlowEdge[]): NodeId {
    const newCanvasNode = {
      id: this.nextNodeID.toString(),
      data: {
        label: newNode.text,
        dataNode: newNode,
      },
      className: diffTypeParentIDs.length != 0 ? 'node-comparative' : `node-${newNode.type_is?.toLowerCase()}`,
      position: { x: 0, y: 0 },
      type: 'customNodeComp', // Must align with field name in nodeTypes
    }
    nodes.push(newCanvasNode);
    ++this.nextNodeID;
    const childNodeID = notNull(newCanvasNode.id);
    const edgeType = newNode.type_is == "Pro" ? "pro" : newNode.type_is == "Con" ? "con" : "default"
    const addNewEdge = (parentID: string, edgeType: string) => {
      edges.push(this.createEdge(parentID, childNodeID, edgeType as 'pro' | 'con' | 'default'));
    };
    parentIDs.forEach(parentID => addNewEdge(parentID, edgeType));
    if (edgeType != "default") {
      diffTypeParentIDs.forEach(parentID => addNewEdge(parentID, edgeType == "pro" ? "con" : "pro"));
    }
    return newCanvasNode.id;
  }

  // nodes/edges are optional — falls back to reading current ReactFlow state via callbacks
  doLayout(nodes?: FlowNode[], edges?: FlowEdge[], cb?: Callback): void {
    const n = nodes ?? this._getNodes();
    const e = edges ?? this._getEdges();
    n.forEach(node => {
      // TODO: This works okay but not great - may need to switch to a different layout library like elkjs
      const textDim = getTextDimensions(node.data.label, 50, 190);
      this.graph.setNode(node.id, {...node, ...textDim});
    });
    e.forEach(edge => { this.graph.setEdge(edge.source, edge.target); });
    dagre.layout(this.graph);
    const updatedNodes = n.map(node => {
      const nodeWithPosition = this.graph.node(node.id);
      return nodeWithPosition
        ? {...node, position: {x: nodeWithPosition.x, y: nodeWithPosition.y}}
        : node;
    });
    this._callRenderGraph(updatedNodes, e, cb);
  }

  // Members
  graph = new dagre.graphlib.Graph();
  updateSelectedNodeCB: UpdateSelectedNodeCB | null = null;
  backendCBs: BackendCBs = new BackendCBs();
  nextNodeID: number = 0;
  doubleClickNode: ((nodeId: NodeId) => void) | null = null;
  nodeBeingEdited: Element | null = null;
  zoomIn: (() => void) | null = null;
  zoomOut: (() => void) | null = null;
  fitView: (() => void) | null = null;
  focusNode: ((nodeId: NodeId) => void) | null = null;
  captureSnapshotCB: (() => void) | null = null;
  getNodesFcn: (() => FlowNode[]) | null = null;
  getEdgesFcn: (() => FlowEdge[]) | null = null;
  renderGraphFcn: ((nodes: FlowNode[], edges: FlowEdge[], cb?: Callback) => void) | null = null;

  // Init
  constructor(updateSelectedNodeCB : UpdateSelectedNodeCB) {
    this.updateSelectedNodeCB = updateSelectedNodeCB;
    this._setUpGraph();
  }

  _setUpGraph(): void {
    this.graph = new dagre.graphlib.Graph();
    this.graph.setDefaultEdgeLabel(() => ({}));
    this.graph.setGraph({rankdir: "TB", ranksep: 100, nodesep: 200});
  }

  _getNodes(): FlowNode[] { return this.getNodesFcn ? this.getNodesFcn() : []; }
  _getEdges(): FlowEdge[] { return this.getEdgesFcn ? this.getEdgesFcn() : []; }

  _callRenderGraph(nodes: FlowNode[], edges: FlowEdge[], cb?: Callback): void {
    if (this.renderGraphFcn) { this.renderGraphFcn(nodes, edges, cb); }
  }
  
  setDoubleClickNodeFcn(doubleClickNode: (nodeId: NodeId) => void): void { 
    this.doubleClickNode = doubleClickNode; 
  }
  
  // Called by RendererCompInner to wire up ReactFlow state access
  setStateFunctions(
    getNodes: () => FlowNode[],
    getEdges: () => FlowEdge[],
    renderGraph: (nodes: FlowNode[], edges: FlowEdge[], cb?: Callback) => void
  ): void {
    this.getNodesFcn = getNodes;
    this.getEdgesFcn = getEdges;
    this.renderGraphFcn = renderGraph;
  }

  // User interaction functions
  onNodeSelect(selectedNodeId: NodeId | null, cb?: Callback, fromBackend: boolean = false): void {
    let selectedNode = null as SelectedNode | null;
    if (selectedNodeId) {
      const node = this._getNodes().find(node => node.id === selectedNodeId);
      if (node) {
        selectedNode = new SelectedNode(node.data.dataNode, node.id);
      }
    }
    notNull(this.updateSelectedNodeCB)(selectedNode);
    if (this.backendCBs.updateSelection && !fromBackend) {
      this.backendCBs.updateSelection(selectedNodeId, cb);
    }
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
  const { getNode } = useReactFlow();
  const isSelected = getNode(id)?.selected;
  
  useEffect(() => { setText(data.label);}, [data.label]);
  
  const handleDoubleClick = useCallback(async () => { 
    setIsEditing(true); 
    await new Promise(resolve => setTimeout(resolve));
    const textElem = htmlRef?.current as HTMLTextAreaElement | null;
    textElem?.focus();
    const textLen = data.label.length; // TODO: doesnt align with text.length?
    textElem?.setSelectionRange(textLen, textLen); //< Set cursor to end
  }, []);
  const handleKeyDown = useCallback((evt: React.KeyboardEvent) => {
    if ((evt.ctrlKey && evt.key === 'e') || evt.key === 'Escape') {
      setIsEditing(false);
      data.onTextChange(id, text); // Set in nodesWithHandlers
    }
  }, [id, text, data]);
 
  return (
    <div 
      id={nodeElementId} 
      onDoubleClick={handleDoubleClick} 
      onKeyDown={handleKeyDown}
      className={`${data.className} ${isSelected ? 'node-selected' : ''}`}
    >
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

// Custom edge component for rendering different edge types
const CustomEdgeComp = ({ sourceX, sourceY, targetX, targetY, type = 'default' }: EdgeProps & { type?: 'pro' | 'con' | 'default' }): JSX.Element => {
  // Determine the edge color based on the type
  const edgeColor = type === 'pro' 
    ? 'var(--edge-pro-color)' 
    : type === 'con' 
      ? 'var(--edge-con-color)' 
      : 'var(--edge-default-color)';
  
  return (
    <path
      d={`M ${sourceX} ${sourceY} C ${sourceX} ${(sourceY + targetY) / 2}, ${targetX} ${(sourceY + targetY) / 2}, ${targetX} ${targetY}`}
      style={{
        fill: 'none',
        stroke: edgeColor,
        strokeWidth: 3,
      }}
    />
  );
};

// Inner component that uses ReactFlow hooks
const RendererCompInner = ({ renderer }: { renderer: Renderer }): JSX.Element => {
  const { getNode, fitView, zoomIn, zoomOut, setCenter, getZoom, setNodes: setReactFlowNodes } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Refs give Renderer synchronous read access to ReactFlow state without coupling to hooks
  const nodesRef = useRef<FlowNode[]>([]);
  const edgesRef = useRef<FlowEdge[]>([]);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  // Custom node / edge types
  const nodeTypes = useMemo(() => ({ customNodeComp: CustomNodeComp }), []);
  const edgeTypes = useMemo(() => ({
    pro: (props: EdgeProps) => <CustomEdgeComp {...props} type="pro" />,
    con: (props: EdgeProps) => <CustomEdgeComp {...props} type="con" />,
    default: (props: EdgeProps) => <CustomEdgeComp {...props} type="default" />,
  }), []);
  // State for the context menu
  const defaultContextMenuState = {
    show: false,
    x: 0,
    y: 0,
    nodeId: '',
    nodeType: '',
  };
  const [contextMenu, setContextMenu] = useState(defaultContextMenuState);
  // State for edge creation 
  const defaultEdgeCreationState = {
    active: false,
    sourceNodeId: '',
    sourceNodeType: '',
    targetType: 'pro' as 'pro' | 'con',
    mousePosition: null as { x: number, y: number } | null,
  };
  const [edgeCreation, setEdgeCreation] = useState(defaultEdgeCreationState);
  
  // Update initialNodes to include the text change handler
  const onNodeTextChange = useCallback((changedNodeId: NodeId, newText: string): void => {
    renderer.captureSnapshotCB?.();
    setNodes((changedNodes) => changedNodes?.map((node) => {
      if (node.id === changedNodeId) {
        node.data.label = newText;
        node.data.dataNode.text = newText;
      }
      return node;
    }));
  }, [setNodes, renderer]);
  const nodesWithHandlers = nodes?.map(node => {node.data.onTextChange = onNodeTextChange; return node;});

  const onNodesChange = useCallback((changes: NodeChange[]): void => {
    setNodes((changedNodes) => applyNodeChanges(changes, changedNodes));
  }, [setNodes]);

  // Wire up ReactFlow state access to Renderer
  useEffect(() => {
    renderer.setStateFunctions(
      () => nodesRef.current,
      () => edgesRef.current,
      async (newNodes: FlowNode[], newEdges: FlowEdge[], renderedCB?: Callback) => {
        setNodes([...newNodes]);
        setEdges([...newEdges]); // Copy to force re-render, or new edges from createNode wont show up
        if (renderedCB) { // Waits for re-render to finish before calling the callback
          // - Used to ensure the node element is available before caller uses something like onNodeEdit
          await new Promise(resolve => setTimeout(resolve));
          renderedCB();
        }
      }
    );
  }, [renderer]);

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
        ...defaultContextMenuState,
        show: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        nodeType: nodeType,
      });
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setContextMenu(defaultContextMenuState);
    if (edgeCreation.active) { // cancel edge creation
      setEdgeCreation({...edgeCreation, active: false, mousePosition: null});
    }
  }, [contextMenu, edgeCreation]);

  // Handle escape key to cancel edge creation
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && edgeCreation.active) {
      setEdgeCreation({...edgeCreation, active: false, mousePosition: null});
    }
  }, [edgeCreation]);

  // Add and remove event listeners
  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  // Track mouse movement for edge creation
  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (edgeCreation.active && reactFlowWrapper.current) {
      // Get the position of the mouse relative to the ReactFlow container
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      
      // Store the raw mouse position
      setEdgeCreation(prev => ({...prev, mousePosition: { x, y }}));
    }
  }, [edgeCreation]);

  // Combined function for handling both Pro and Con relationships
  const handleMakeRelationFor = useCallback((targetType: 'pro' | 'con') => {
    setEdgeCreation({
      ...defaultEdgeCreationState,
      active: true,
      sourceNodeId: contextMenu.nodeId,
      sourceNodeType: contextMenu.nodeType,
      targetType: targetType,
    });
    setContextMenu(defaultContextMenuState);
  }, [contextMenu]);

  // Wrapper functions for the specific relationship types
  const handleMakeProFor = useCallback(() => {
    handleMakeRelationFor('pro');
  }, [handleMakeRelationFor]);

  const handleMakeConFor = useCallback(() => {
    handleMakeRelationFor('con');
  }, [handleMakeRelationFor]);

  // If a node gains edges of mixed types, mark it as comparative — mutates nodesRef so doLayout sees it
  function maybeUpdateNodeToComparative(nodeId: string) {
    const connectedEdges = edgesRef.current.filter(edge => edge.target === nodeId);
    if (connectedEdges.length >= 2) { // If node has multiple edges, check if they have different types
      const types = new Set(connectedEdges.map(edge => edge.type));
      if (types.size > 1) { // Node has different types of edges, update its style
        nodesRef.current = nodesRef.current.map(n =>
          n.id === nodeId ? {...n, className: 'node-comparative'} : n
        );
      }
    }
  }

  const onNodeClick = useCallback((event: React.MouseEvent, node: FlowNode) => {
    if (edgeCreation.active) { // clicked node - complete edge creation
      renderer.captureSnapshotCB?.();
      const newEdge = renderer.createEdge(node.id, edgeCreation.sourceNodeId, edgeCreation.targetType);
      edgesRef.current = [...edgesRef.current, newEdge];
      maybeUpdateNodeToComparative(edgeCreation.sourceNodeId);
      renderer.doLayout(nodesRef.current, edgesRef.current);
      setEdgeCreation(defaultEdgeCreationState);
      event.stopPropagation(); //< Prevent the default node click behavior
    }
  }, [edgeCreation, renderer]);

  const renderTemporaryEdge = () => {
    if (!edgeCreation.active || !edgeCreation.mousePosition) return null;
    // Get the handle position
    const sourceNode = notNull(getNode(edgeCreation.sourceNodeId));
    const nodeElement = notNull(document.getElementById(`custom-node-${sourceNode.id}`));
    const handleElement = notNull(nodeElement.querySelector('.react-flow__handle-bottom'));
    const handleRect = handleElement.getBoundingClientRect();
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return null;
    // Get the toolbar widths for offset calculation 
    const leftToolbarElement = document.getElementById('left-toolbar');
    const leftToolbarWidth = leftToolbarElement ? leftToolbarElement.offsetWidth : 0;
    const topToolbarElement = document.getElementById('top-toolbar');
    const topToolbarHeight = topToolbarElement ? topToolbarElement.offsetHeight : 0;
    // Calculate positions relative to the ReactFlow container, accounting for both toolbars
    const sourceX = handleRect.left - bounds.left + leftToolbarWidth;
    const sourceY = handleRect.top - bounds.top + topToolbarHeight;
    const targetX = edgeCreation.mousePosition.x + leftToolbarWidth;
    const targetY = edgeCreation.mousePosition.y + topToolbarHeight;
    return (
      <svg
        style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10}}
      >
        <path
          d={`M ${sourceX} ${sourceY} C ${sourceX} ${(sourceY + targetY) / 2}, ${targetX} ${(sourceY + targetY) / 2}, ${targetX} ${targetY}`}
          style={{
            fill: 'none',
            stroke: `var(--edge-${edgeCreation.targetType}-color)`,
            strokeWidth: 3,
            strokeDasharray: '5,5',
          }}
        />
      </svg>
    );
  };

  useEffect(() => { // re-fit when the number of nodes change
    if (nodes.length > 0) { fitView({ padding: 0.2 }); }
  }, [nodes.length]);

  // Internal reactflow callback - used to catch node clicks to select
  const onSelectionChange = useCallback(({ nodes }: { nodes: FlowNode[] }) => {
    if (nodes.length === 1) {
      renderer.onNodeSelect(nodes[0].id, undefined, true);
    }
  }, [renderer]);

  // Callback used by Renderer to show the current selection
  const updateSelection = useCallback((nodeId: string | null, cb?: Callback) => {
    setReactFlowNodes((nds) => 
      nds.map((node) => ({ ...node, selected: node.id === nodeId }))
    );
    if (cb) {
      cb()
    }
  }, [setReactFlowNodes]);

  // Set up the callbacks in the renderer
  useEffect(() => {
    renderer.backendCBs.updateSelection = updateSelection;
    renderer.zoomIn = () => zoomIn();
    renderer.zoomOut = () => zoomOut();
    renderer.fitView = () => fitView({ padding: 0.2 });
    renderer.focusNode = (nodeId: NodeId) => {
      const node = getNode(nodeId);
      if (node) {
        const x = node.position.x + (node.width ?? 0) / 2;
        const y = node.position.y + (node.height ?? 0) / 2;
        setCenter(x, y, { zoom: getZoom(), duration: 300 });
      }
    };
  }, [renderer, updateSelection, zoomIn, zoomOut]);

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow fitView defaultEdgeOptions={{animated: false}} minZoom={0.01} maxZoom={10}
        nodes={nodesWithHandlers} edges={edges}
        onNodesChange={onNodesChange}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes} 
        edgeTypes={edgeTypes}
        zoomOnDoubleClick={false}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onMouseMove={onMouseMove}
        connectionMode={ConnectionMode.Loose}
        nodesConnectable={false}
        connectOnClick={false}
      >
        <Background />
        <Controls />
      </ReactFlow>
      
      {renderTemporaryEdge()}
      
      {contextMenu.show && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType={contextMenu.nodeType}
          onClose={() => setContextMenu(defaultContextMenuState)}
          onMakeProFor={handleMakeProFor}
          onMakeConFor={handleMakeConFor}
        />
      )}

      {canvasStore.showKeyboardHelp && (
        <KeyboardHelp onClose={() => canvasStore.toggleKeyboardHelp()} />
      )}
    </div>
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
