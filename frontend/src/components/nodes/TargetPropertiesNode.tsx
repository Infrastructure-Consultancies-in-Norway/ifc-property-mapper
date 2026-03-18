/**
 * Custom node: TargetProperties – writes values into multiple properties within a single PSet.
 * Each property row shows the name plus Edit and Remove buttons.
 * Clicking Edit replaces the label with a free-text + datalist input.
 */

import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useStore } from '../../store';

// .node__body has padding-left: 10px and the node has border: 1px.
// left:-11px + React Flow's translate(-50%) = handle center on the node border.
const HANDLE_LEFT = -11;

export function TargetPropertiesNode({ id, data, selected }: NodeProps) {
  const pset = (data.pset as string) || '';
  const properties = (data.properties as string[]) || [];
  const ifcClass = (data.ifc_class as string) || '';
  const { updateNodeData, ifcClasses } = useStore();

  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingValue, setEditingValue] = useState('');

  // Datalist suggestions for the PSet (existing property names)
  const propsForPset: string[] = pset
    ? [...new Set(
        ifcClasses.flatMap((c) =>
          c.psets.filter((p) => p.name === pset).flatMap((p) => p.properties)
        )
      )].sort()
    : [];

  const datalistId = `tp-edit-${id}`;

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditingValue(properties[index]);
  }

  function confirmEdit() {
    if (editingValue.trim() && editingIndex >= 0) {
      updateNodeData(id, {
        properties: properties.map((p, i) => (i === editingIndex ? editingValue.trim() : p)),
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
    <div className={`node node--target ${selected ? 'node--selected' : ''}`}>
      <div className="node__header node__header--target">Target Properties</div>
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
              <Handle
                type="target"
                position={Position.Left}
                id={`in-${i}`}
                style={{ left: HANDLE_LEFT, top: '50%', transform: 'translate(-50%, -50%)' }}
              />
              {editingIndex === i ? (
                <>
                  <input
                    className="node__prop-input"
                    list={datalistId}
                    value={editingValue}
                    autoFocus
                    onChange={(e) => setEditingValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.stopPropagation(); confirmEdit(); }
                      if (e.key === 'Escape') { e.stopPropagation(); cancelEdit(); }
                    }}
                    placeholder="Property name"
                  />
                  <datalist id={datalistId}>
                    {propsForPset.map((p) => <option key={p} value={p} />)}
                  </datalist>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
