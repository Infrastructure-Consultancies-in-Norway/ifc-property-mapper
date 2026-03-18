/**
 * Global application state via Zustand.
 */

import { create } from 'zustand';
import type {
  AppEdge,
  AppNode,
  ExecuteResponse,
  ExecutionOptions,
  IfcClassInfo,
} from '../types';

interface GraphSnapshot {
  nodes: AppNode[];
  edges: AppEdge[];
}

const HISTORY_LIMIT = 50;

interface AppState {
  // IFC file state
  uploadToken: string | null;
  filename: string | null;
  schemaVersion: string | null;
  ifcClasses: IfcClassInfo[];

  // Graph state
  nodes: AppNode[];
  edges: AppEdge[];

  // Undo / redo history
  past: GraphSnapshot[];
  future: GraphSnapshot[];

  // Selected node id for inspector panel
  selectedNodeId: string | null;

  // Execution options
  executionOptions: ExecutionOptions;

  // Run results
  lastRunResult: ExecuteResponse | null;
  isRunning: boolean;

  // Template name (if loaded)
  currentTemplateName: string | null;

  // Actions
  setUpload: (token: string, filename: string) => void;
  setInspectResult: (schemaVersion: string, classes: IfcClassInfo[]) => void;
  /** Replace nodes without recording history (used by React Flow change handler). */
  setNodes: (nodes: AppNode[]) => void;
  /** Replace edges without recording history (used by React Flow change handler). */
  setEdges: (edges: AppEdge[]) => void;
  /** Replace nodes AND record an undo snapshot first. */
  setNodesWithHistory: (nodes: AppNode[]) => void;
  /** Replace edges AND record an undo snapshot first. */
  setEdgesWithHistory: (edges: AppEdge[]) => void;
  addNode: (node: AppNode) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  removeNode: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setExecutionOptions: (opts: Partial<ExecutionOptions>) => void;
  setRunResult: (result: ExecuteResponse | null) => void;
  setIsRunning: (running: boolean) => void;
  setCurrentTemplateName: (name: string | null) => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
}

const DEFAULT_OPTIONS: ExecutionOptions = {
  createPsetIfMissing: true,
  overwriteExisting: true,
  nullPolicy: 'skip',
};

function pushPast(past: GraphSnapshot[], snapshot: GraphSnapshot): GraphSnapshot[] {
  const next = [...past, snapshot];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

export const useStore = create<AppState>((set, get) => ({
  uploadToken: null,
  filename: null,
  schemaVersion: null,
  ifcClasses: [],
  nodes: [],
  edges: [],
  past: [],
  future: [],
  selectedNodeId: null,
  executionOptions: DEFAULT_OPTIONS,
  lastRunResult: null,
  isRunning: false,
  currentTemplateName: null,

  setUpload: (token, filename) => set({ uploadToken: token, filename }),

  setInspectResult: (schemaVersion, ifcClasses) =>
    set({ schemaVersion, ifcClasses }),

  // Raw setters used by React Flow's applyNodeChanges (position drags, etc.)
  // — these do NOT push to history to avoid flooding the stack while dragging.
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  setNodesWithHistory: (nodes) =>
    set((state) => ({
      nodes,
      past: pushPast(state.past, { nodes: state.nodes, edges: state.edges }),
      future: [],
    })),

  setEdgesWithHistory: (edges) =>
    set((state) => ({
      edges,
      past: pushPast(state.past, { nodes: state.nodes, edges: state.edges }),
      future: [],
    })),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
      past: pushPast(state.past, { nodes: state.nodes, edges: state.edges }),
      future: [],
    })),

  updateNodeData: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
      past: pushPast(state.past, { nodes: state.nodes, edges: state.edges }),
      future: [],
    })),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      past: pushPast(state.past, { nodes: state.nodes, edges: state.edges }),
      future: [],
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setExecutionOptions: (opts) =>
    set((state) => ({
      executionOptions: { ...state.executionOptions, ...opts },
    })),

  setRunResult: (result) => set({ lastRunResult: result }),

  setIsRunning: (running) => set({ isRunning: running }),

  setCurrentTemplateName: (name) => set({ currentTemplateName: name }),

  clearAll: () =>
    set({
      uploadToken: null,
      filename: null,
      schemaVersion: null,
      ifcClasses: [],
      nodes: [],
      edges: [],
      past: [],
      future: [],
      selectedNodeId: null,
      executionOptions: DEFAULT_OPTIONS,
      lastRunResult: null,
      isRunning: false,
      currentTemplateName: null,
    }),

  undo: () => {
    const { past, nodes, edges, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: past.slice(0, past.length - 1),
      future: [{ nodes, edges }, ...future],
    });
  },

  redo: () => {
    const { future, nodes, edges, past } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: pushPast(past, { nodes, edges }),
      future: future.slice(1),
    });
  },
}));
