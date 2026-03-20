/**
 * TemplateManager – list, save, load, delete JSON templates.
 * Also supports download/upload for sharing templates.
 */

import { useEffect, useRef, useState } from 'react';
import {
  listTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
  downloadTemplate,
  parseUploadedTemplate,
} from '../../api/client';
import { useStore } from '../../store';
import type { MappingTemplate, TemplateSummary } from '../../types';

export function TemplateManager() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    nodes,
    edges,
    executionOptions,
    schemaVersion,
    setNodes,
    setEdges,
    setExecutionOptions,
    setCurrentTemplateName,
    currentTemplateName,
  } = useStore();

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setTemplates(await listTemplates());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleLoad(name: string) {
    try {
      setError(null);
      const tpl = await getTemplate(name);
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      if (tpl.executionOptions) {
        setExecutionOptions(tpl.executionOptions);
      }
      setCurrentTemplateName(name);
      setSuccess(`Loaded template "${name}"`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      setError(null);
      await deleteTemplate(name);
      await refresh();
      setSuccess(`Deleted template "${name}"`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSave() {
    const name = saveName.trim() || currentTemplateName || 'Untitled';
    const tpl: MappingTemplate = {
      version: '1',
      name,
      description: saveDesc,
      schemaHints: schemaVersion ? [schemaVersion] : ['IFC2X3', 'IFC4X3'],
      nodes,
      edges,
      executionOptions,
      metadata: { createdAt: '', updatedAt: '' },
    };
    try {
      setError(null);
      await saveTemplate(tpl);
      setCurrentTemplateName(name);
      setSaveName('');
      setSaveDesc('');
      await refresh();
      setSuccess(`Saved template "${name}"`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDownload() {
    const name = currentTemplateName || 'current';
    const tpl: MappingTemplate = {
      version: '1',
      name,
      description: saveDesc,
      schemaHints: schemaVersion ? [schemaVersion] : ['IFC2X3', 'IFC4X3'],
      nodes,
      edges,
      executionOptions,
      metadata: { createdAt: '', updatedAt: '' },
    };
    try {
      setError(null);
      downloadTemplate(tpl);
      setSuccess('Downloaded template');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const template = await parseUploadedTemplate(file);
      setNodes(template.nodes);
      setEdges(template.edges);
      if (template.executionOptions) {
        setExecutionOptions(template.executionOptions);
      }
      setCurrentTemplateName(template.name);
      setSuccess(`Loaded template from file: "${template.name}"`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="panel panel--templates">
      <h3 className="panel__title">Templates</h3>

      <div className="template-save">
        <input
          type="text"
          className="inspector__input"
          placeholder={currentTemplateName ?? 'Template name'}
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
        />
        <input
          type="text"
          className="inspector__input"
          placeholder="Description (optional)"
          value={saveDesc}
          onChange={(e) => setSaveDesc(e.target.value)}
        />
        <button className="btn btn--primary" onClick={handleSave}>
          Save
        </button>
        <button className="btn btn--ghost" onClick={handleDownload} title="Download current template as JSON">
          📥 Download
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => fileInputRef.current?.click()}
          title="Upload template from JSON file"
        >
          📤 Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {loading ? (
        <p className="inspector__empty">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="inspector__empty">No saved templates.</p>
      ) : (
        <ul className="template-list">
          {templates.map((t) => (
            <li key={t.name} className="template-item">
              <div className="template-item__info">
                <span className="template-item__name">{t.name}</span>
                {t.description && (
                  <span className="template-item__desc">{t.description}</span>
                )}
              </div>
              <div className="template-item__actions">
                <button className="btn btn--ghost" onClick={() => handleLoad(t.name)}>
                  Load
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={async () => {
                    try {
                      const tpl = await getTemplate(t.name);
                      downloadTemplate(tpl);
                      setSuccess(`Downloaded template "${t.name}"`);
                      setTimeout(() => setSuccess(null), 3000);
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : String(e));
                    }
                  }}
                  title="Download this template as JSON"
                >
                  ⬇️
                </button>
                <button
                  className="btn btn--ghost btn--danger"
                  onClick={() => handleDelete(t.name)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
