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
import {DFS, NodeTraverseSelection} from "./NodeTraveseral"
import NodeContextMenu from '../components/NodeContextMenu';
import { KeyboardHelp } from '../modals/KeyboardHelp';
import { canvasStore } from "../stores/CanvasStore";

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
      type_is: type,
      parent_idxs_diff_type: [] //< TODO
    };
    let newNodeID = this.renderNode(newNode, parent ? [parent.renderID] : [], []);
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
    // Get the nodes in DFS order since this should match the files layout
    const nodeIds = new DFS([], this).visitedNodes;
    const idToFileOrder = new Map<string, number>();
    nodeIds.forEach((id, index) => idToFileOrder.set(id, index));
    // Set parent_idxs & parent_idxs_diff_type
    // - Doing it now avoids complexity of keeping them aligned with the UI while doing creates / deletes
    return nodeIds.map(id => {
      const dataNode = notNull(this.nodes.find(n => n.id === id)).data.dataNode;
      const incomingEdges = this.edges.filter(edge => edge.target === id);
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
  renderNodes(nodes : fromRust.Nodes): void {
    this._setUpGraph();
    this.nodes = [];
    this.edges = [];
    this.nextNodeID = 0; //< Reset to align with parentIDs
    Node.newCollection(nodes.title);
    nodes.nodes.forEach((node: fromRust.Node) => { 
      const parentIDs = node.parent_idxs.map(id => id.toString());
      const diffTypePars = node.parent_idxs_diff_type;
      const diffTypeParentIDs = diffTypePars && diffTypePars.length > 0 ? diffTypePars.map(id => id.toString()) : [];
      this.renderNode(node, parentIDs, diffTypeParentIDs); 
    });
    this.doLayout();
  }

  renderNode(newNode: fromRust.Node, parentIDs: string[], diffTypeParentIDs: string[]): NodeId {
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
    this.nodes.push(newCanvasNode);
    ++this.nextNodeID;
    const childNodeID = notNull(newCanvasNode.id);
    const edgeType = newNode.type_is == "Pro" ? "pro" : newNode.type_is == "Con" ? "con" : "default"
    const addNewEdge = (parentID: string, edgeType: string) => {
      this.edges.push({
        source: parentID,
        target: childNodeID,
        id: `e${parentID}-${childNodeID}`,
        type: edgeType,
        style: {
          stroke: `var(--edge-${edgeType}-color)`,
          strokeWidth: 3
        }
      });
    };
    parentIDs.forEach(parentID => addNewEdge(parentID, edgeType));
    if (edgeType != "default") {
      diffTypeParentIDs.forEach(parentID => addNewEdge(parentID, edgeType == "pro" ? "con" : "pro"));
    }
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
  const { getNode } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
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
    
    // If we're in edge creation mode and clicked on the pane (not a node), cancel the operation
    if (edgeCreation.active) {
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
    // Start edge creation mode
    setEdgeCreation({
      ...defaultEdgeCreationState,
      active: true,
      sourceNodeId: contextMenu.nodeId,
      sourceNodeType: contextMenu.nodeType,
      targetType: targetType,
    });
    
    // Close the context menu
    setContextMenu(defaultContextMenuState);
  }, [contextMenu]);

  // Wrapper functions for the specific relationship types
  const handleMakeProFor = useCallback(() => {
    handleMakeRelationFor('pro');
  }, [handleMakeRelationFor]);

  const handleMakeConFor = useCallback(() => {
    handleMakeRelationFor('con');
  }, [handleMakeRelationFor]);

  // Handle node click to complete edge creation
  const onNodeClick = useCallback((event: React.MouseEvent, node: FlowNode) => {
    if (edgeCreation.active) {
      // Add the new edge
      const newEdge = {
        source: edgeCreation.sourceNodeId,
        target: node.id,
        id: `e${edgeCreation.sourceNodeId}-${node.id}`,
        type: edgeCreation.targetType, // Set the edge type based on the relationship type
        style: {
          stroke: `var(--edge-${edgeCreation.targetType}-color)`,
          strokeWidth: 3
        }
      };
      setEdges((eds) => [...eds, newEdge]);
      setEdgeCreation(defaultEdgeCreationState);
      event.stopPropagation(); //< Prevent the default node click behavior
    }
  }, [edgeCreation, setEdges]);

  // Render the temporary edge
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


  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow fitView defaultEdgeOptions={{animated: false}}
        nodes={nodesWithHandlers} edges={edges}
        onNodesChange={onNodesChange}
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
