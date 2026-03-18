/**
 * NodePalette – drag-to-canvas node type buttons.
 */

import type { NodeType } from '../../types';

const NODE_TYPES: { type: NodeType; label: string; colorClass: string }[] = [
  { type: 'SourceProperty',   label: 'Source Property',    colorClass: 'palette-item--source' },
  { type: 'SourceProperties', label: 'Source Properties',  colorClass: 'palette-item--source' },
  { type: 'TargetProperty',   label: 'Target Property',    colorClass: 'palette-item--target' },
  { type: 'TargetProperties', label: 'Target Properties',  colorClass: 'palette-item--target' },
  { type: 'Filter',           label: 'Filter',             colorClass: 'palette-item--filter' },
  { type: 'Concat',           label: 'Concat',             colorClass: 'palette-item--transform' },
  { type: 'Split',            label: 'Split',              colorClass: 'palette-item--transform' },
  { type: 'Cast',             label: 'Cast',               colorClass: 'palette-item--transform' },
  { type: 'Const',            label: 'Const',              colorClass: 'palette-item--const' },
  { type: 'Preview',          label: 'Preview',            colorClass: 'palette-item--preview' },
];

function onDragStart(event: React.DragEvent, nodeType: NodeType) {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
}

export function NodePalette() {
  return (
    <div className="panel panel--palette">
      <h3 className="panel__title">Nodes</h3>
      <div className="palette-list">
        {NODE_TYPES.map(({ type, label, colorClass }) => (
          <div
            key={type}
            className={`palette-item ${colorClass}`}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
