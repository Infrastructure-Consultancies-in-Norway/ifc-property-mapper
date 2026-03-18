/**
 * TemplateManager – list, save, load, delete JSON templates.
 */

import { useEffect, useState } from 'react';
import {
  listTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
} from '../../api/client';
import { useStore } from '../../store';
import type { MappingTemplate, TemplateSummary } from '../../types';

export function TemplateManager() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  const {
    nodes,
    edges,
    executionOptions,
    schemaVersion,
    setNodes,
    setEdges,
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
      const tpl = await getTemplate(name);
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      setCurrentTemplateName(name);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await deleteTemplate(name);
      await refresh();
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
      await saveTemplate(tpl);
      setCurrentTemplateName(name);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
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
      </div>

      {error && <div className="error-msg">{error}</div>}

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
