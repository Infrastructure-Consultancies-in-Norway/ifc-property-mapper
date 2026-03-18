// Shared TypeScript types mirroring backend models

export type NullPolicy = 'skip' | 'writeEmpty' | 'useDefault';

export type NodeType =
  | 'SourceProperty'
  | 'SourceProperties'
  | 'Filter'
  | 'Concat'
  | 'Split'
  | 'Const'
  | 'Cast'
  | 'TargetProperty'
  | 'TargetProperties'
  | 'Preview';

export type CastTarget = 'text' | 'number' | 'bool';

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'exists'
  | 'notExists'
  | 'greaterThan'
  | 'lessThan';

// Node data payloads
export interface PropertySelector {
  pset: string;
  property: string;
}

export interface SourcePropertyData {
  ifc_class?: string;
  pset: string;
  property: string;
}

export interface SourcePropertiesData {
  ifc_class?: string;
  pset: string;
  properties: string[];
}

export interface FilterData {
  ifc_class?: string;
  pset?: string;
  property?: string;
  operator?: FilterOperator;
  value?: string;
}

export interface ConcatData {
  delimiter: string;
  input_count: number;
}

export interface SplitData {
  delimiter: string;
  index: number;
}

export interface ConstData {
  value: string;
}

export interface CastData {
  targetType: CastTarget;
}

export interface TargetPropertyData {
  ifc_class?: string;
  pset: string;
  property: string;
}

export interface TargetPropertiesData {
  ifc_class?: string;
  pset: string;
  properties: string[];
}

export interface PreviewData {
  label: string;
  maxSamples: number;
}

// IFC inspection
export interface PsetInfo {
  name: string;
  properties: string[];
}

export interface IfcClassInfo {
  ifcClass: string;
  count: number;
  psets: PsetInfo[];
}

export interface InspectResponse {
  schemaVersion: string;
  classes: IfcClassInfo[];
}

// Execution options
export interface ExecutionOptions {
  createPsetIfMissing: boolean;
  overwriteExisting: boolean;
  nullPolicy: NullPolicy;
}

// Template
export interface MappingTemplate {
  version: '1';
  name: string;
  description: string;
  schemaHints: string[];
  nodes: AppNode[];
  edges: AppEdge[];
  executionOptions: ExecutionOptions;
  metadata: { createdAt: string; updatedAt: string };
}

export interface TemplateSummary {
  name: string;
  description: string;
  schemaHints: string[];
  updatedAt: string;
}

// Graph types (extended React Flow nodes)
export interface AppNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface AppEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

// Run result
export interface NodeResult {
  nodeId: string;
  nodeType: string;
  elementsProcessed: number;
  elementsWritten: number;
  elementsSkipped: number;
  sampleValues: string[];
  warnings: string[];
}

export interface ExecuteResponse {
  runId: string;
  status: 'ok' | 'error';
  message: string;
  nodeResults: NodeResult[];
  downloadUrl: string;
}
