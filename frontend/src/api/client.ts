/**
 * Thin API client – all calls go through the Vite dev proxy to FastAPI at :8000.
 */

import type {
  AppEdge,
  AppNode,
  ExecuteResponse,
  ExecutionOptions,
  InspectResponse,
  MappingTemplate,
  TemplateSummary,
} from '../types';

const BASE = '';  // proxied by Vite

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// IFC
// ---------------------------------------------------------------------------

export async function uploadIfc(file: File): Promise<{ uploadToken: string; filename: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/ifc/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

export async function inspectIfc(uploadToken: string): Promise<InspectResponse> {
  return request<InspectResponse>(`/ifc/inspect?upload_token=${encodeURIComponent(uploadToken)}`, {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

export async function executeGraph(payload: {
  uploadToken: string;
  nodes: AppNode[];
  edges: AppEdge[];
  executionOptions: ExecutionOptions;
}): Promise<ExecuteResponse> {
  return request<ExecuteResponse>('/execute', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function downloadUrl(runId: string): string {
  return `/download/${runId}`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function listTemplates(): Promise<TemplateSummary[]> {
  return request<TemplateSummary[]>('/templates');
}

export async function getTemplate(name: string): Promise<MappingTemplate> {
  return request<MappingTemplate>(`/templates/${encodeURIComponent(name)}`);
}

export async function saveTemplate(template: MappingTemplate): Promise<MappingTemplate> {
  return request<MappingTemplate>('/templates', {
    method: 'POST',
    body: JSON.stringify(template),
  });
}

export async function deleteTemplate(name: string): Promise<void> {
  await request<unknown>(`/templates/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

/**
 * Download a template as a JSON file.
 * Creates a blob and triggers browser download.
 */
export function downloadTemplate(template: MappingTemplate): void {
  const now = new Date().toISOString().split('T')[0];
  const filename = `${template.name}_${now}.json`;
  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate an uploaded template file.
 * Returns parsed template or throws an error.
 */
export async function parseUploadedTemplate(file: File): Promise<MappingTemplate> {
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    // Basic validation: check for required fields
    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('Missing or invalid "nodes" array');
    }
    if (!data.edges || !Array.isArray(data.edges)) {
      throw new Error('Missing or invalid "edges" array');
    }
    // Validate each node has position and data
    for (const node of data.nodes) {
      if (!node.position || typeof node.position !== 'object') {
        throw new Error(`Node "${node.id}" is missing valid "position" field`);
      }
      if (!node.data || typeof node.data !== 'object') {
        throw new Error(`Node "${node.id}" is missing valid "data" field`);
      }
    }
    return data as MappingTemplate;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse JSON: Invalid JSON format');
    }
    throw error;
  }
}
