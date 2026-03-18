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
