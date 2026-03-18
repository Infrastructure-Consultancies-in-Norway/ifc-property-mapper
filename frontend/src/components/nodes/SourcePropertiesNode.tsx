/**
 * Custom node: SourceProperties – reads multiple properties from a single PSet.
 * Each property row shows the name plus Edit and Remove buttons.
 * Clicking Edit replaces the label with a dropdown filtered to the chosen PSet.
 */

import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useStore } from '../../store';

// .node__body has padding-right: 10px and the node has border: 1px.
// right:-11px + React Flow's translate(50%) = handle center on the node border.
const HANDLE_RIGHT = -11;

export function SourcePropertiesNode({ id, data, selected }: NodeProps) {
  const pset = (data.pset as string) || '';
  const properties = (data.properties as string[]) || [];
  const ifcClass = (data.ifc_class as string) || '';
  const { updateNodeData, ifcClasses } = useStore();

  // Which row index is currently being edited (-1 = none)
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingValue, setEditingValue] = useState('');

  // Properties available for the selected PSet
  const propsForPset: string[] = pset
    ? [...new Set(
        ifcClasses.flatMap((c) =>
          c.psets.filter((p) => p.name === pset).flatMap((p) => p.properties)
        )
      )].sort()
    : [];

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditingValue(properties[index]);
  }

  function confirmEdit() {
    if (editingValue && editingIndex >= 0) {
      updateNodeData(id, {
        properties: properties.map((p, i) => (i === editingIndex ? editingValue : p)),
      });
    }
    setEditingIndex(-1);
    setEditingValue('');
  }

  function cancelEdit() {
    setEditingIndex(-1);
    setEditingValue('');
  }

  function removeProp(index: number) {
    updateNodeData(id, { properties: properties.filter((_, i) => i !== index) });
    if (editingIndex === index) cancelEdit();
  }

  return (
    <div className={`node node--source ${selected ? 'node--selected' : ''}`}>
      <div className="node__header node__header--source">Source Properties</div>
      <div className="node__body">
        {ifcClass && (
          <div className="node__row">
            <span className="node__label">Class</span>
            <span className="node__value">{ifcClass}</span>
          </div>
        )}
        <div className="node__row">
          <span className="node__label">PSet</span>
          <span className="node__value">{pset || '—'}</span>
        </div>
        {properties.length === 0 ? (
          <div className="node__row">
            <span className="node__value node__value--muted">Add properties in inspector</span>
          </div>
        ) : (
          properties.map((prop, i) => (
            <div key={i} className="node__row node__row--prop" style={{ position: 'relative' }}>
              {editingIndex === i ? (
                <>
                  {propsForPset.length > 0 ? (
                    <select
                      className="node__prop-input"
                      value={editingValue}
                      autoFocus
                      onChange={(e) => setEditingValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">— select —</option>
                      {propsForPset.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="node__prop-input"
                      value={editingValue}
                      autoFocus
                      onChange={(e) => setEditingValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <button className="node__prop-btn node__prop-btn--confirm"
                    title="Confirm" onClick={(e) => { e.stopPropagation(); confirmEdit(); }}>✓</button>
                  <button className="node__prop-btn node__prop-btn--cancel"
                    title="Cancel" onClick={(e) => { e.stopPropagation(); cancelEdit(); }}>✕</button>
                </>
              ) : (
                <>
                  <span className="node__value node__value--small" style={{ flex: 1 }}>{prop}</span>
                  <button className="node__prop-btn node__prop-btn--edit"
                    title="Edit" onClick={(e) => { e.stopPropagation(); startEdit(i); }}>✎</button>
                  <button className="node__prop-btn node__prop-btn--remove"
                    title="Remove" onClick={(e) => { e.stopPropagation(); removeProp(i); }}>×</button>
                </>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={`out-${i}`}
                style={{ right: HANDLE_RIGHT, top: '50%', transform: 'translate(50%, -50%)' }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
