/**
 * MappingCanvas – React Flow canvas with drag-to-add nodes.
 *
 * Single source of truth: Zustand store.
 * React Flow reads nodes/edges from the store and writes changes back via
 * onNodesChange / onEdgesChange so the Inspector always stays in sync.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeTypes,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '../store';
import type { AppNode, AppEdge, NodeType } from '../types';

import { SourcePropertyNode } from './nodes/SourcePropertyNode';

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes]
    .map((b, i) =>
      [4, 6, 8, 10].includes(i) ? `-${b.toString(16).padStart(2, '0')}` : b.toString(16).padStart(2, '0'),
    )
    .join('');
}
import { TargetPropertyNode } from './nodes/TargetPropertyNode';
import { SourcePropertiesNode } from './nodes/SourcePropertiesNode';
import { TargetPropertiesNode } from './nodes/TargetPropertiesNode';
import { ConstNode } from './nodes/ConstNode';
import { ConcatNode } from './nodes/ConcatNode';
import { SplitNode } from './nodes/SplitNode';
import { CastNode } from './nodes/CastNode';
import { FilterNode } from './nodes/FilterNode';
import { PreviewNode } from './nodes/PreviewNode';

const nodeTypes: NodeTypes = {
  SourceProperty: SourcePropertyNode,
  TargetProperty: TargetPropertyNode,
  SourceProperties: SourcePropertiesNode,
  TargetProperties: TargetPropertiesNode,
  Const: ConstNode,
  Concat: ConcatNode,
  Split: SplitNode,
  Cast: CastNode,
  Filter: FilterNode,
  Preview: PreviewNode,
};

function defaultDataForType(type: NodeType): Record<string, unknown> {
  switch (type) {
    case 'SourceProperty':   return { ifc_class: '', pset: '', property: '' };
    case 'TargetProperty':   return { ifc_class: '', pset: '', property: '' };
    case 'SourceProperties': return { ifc_class: '', pset: '', properties: [] };
    case 'TargetProperties': return { ifc_class: '', pset: '', properties: [] };
    case 'Const':            return { value: '' };
    case 'Concat':           return { delimiter: ' ', input_count: 2 };
    case 'Split':            return { delimiter: ' ', index: 0 };
    case 'Cast':             return { targetType: 'text' };
    case 'Filter':           return { ifc_class: '', operator: 'exists', pset: '', property: '', value: '' };
    case 'Preview':          return { label: 'Preview', maxSamples: 100 };
    default:                 return {};
  }
}

export function MappingCanvas() {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    setEdgesWithHistory,
    addNode,
    setSelectedNodeId,
    undo,
    redo,
  } = useStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts: Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  // React Flow change handlers – apply RFC changes and push back to store.
  // Position drags come through here; we use raw setNodes/setEdges (no history)
  // to avoid flooding the undo stack on every pixel of movement.
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updated = applyNodeChanges(changes, nodes as Node[]) as AppNode[];
      setNodes(updated);
    },
    [nodes, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updated = applyEdgeChanges(changes, edges as Edge[]) as AppEdge[];
      setEdges(updated);
    },
    [edges, setEdges]
  );

  // New connections are intentional graph mutations → record history
  const onConnect = useCallback(
    (connection: Connection) => {
      const updated = addEdge(connection, edges as Edge[]) as AppEdge[];
      setEdgesWithHistory(updated);
    },
    [edges, setEdgesWithHistory]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  // Shift+Click or right-click on edge to delete it
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // Shift+Click: delete the edge
      if (event.shiftKey) {
        event.stopPropagation();
        const updated = edges.filter((e) => e.id !== edge.id) as AppEdge[];
        setEdgesWithHistory(updated);
      }
    },
    [edges, setEdgesWithHistory]
  );

  // Right-click on edge to show delete option
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      
      // Show simple confirm dialog for deletion
      if (confirm('Delete this wire?')) {
        const updated = edges.filter((e) => e.id !== edge.id) as AppEdge[];
        setEdgesWithHistory(updated);
      }
    },
    [edges, setEdgesWithHistory]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 75,
        y: event.clientY - bounds.top - 40,
      };

      const newNode: AppNode = {
        id: generateId(),
        type,
        position,
        data: defaultDataForType(type),
      };

      // addNode records history automatically
      addNode(newNode);
      setSelectedNodeId(newNode.id);
    },
    [addNode, setSelectedNodeId]
  );

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges as Edge[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        deleteKeyCode="Delete"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
