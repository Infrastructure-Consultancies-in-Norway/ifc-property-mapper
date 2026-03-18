/**
 * Custom node: Filter – filters elements by IFC class and/or property condition.
 */

import { Handle, Position, type NodeProps } from '@xyflow/react';

export function FilterNode({ data, selected }: NodeProps) {
  const ifcClass = (data.ifc_class as string) || '';
  const pset = (data.pset as string) || '';
  const property = (data.property as string) || '';
  const operator = (data.operator as string) || 'exists';
  const value = (data.value as string) || '';

  return (
    <div className={`node node--filter ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in-0" />
      <div className="node__header node__header--filter">Filter</div>
      <div className="node__body">
        {ifcClass && (
          <div className="node__row">
            <span className="node__label">Class</span>
            <span className="node__value">{ifcClass}</span>
          </div>
        )}
        {pset && property && (
          <div className="node__row">
            <span className="node__label">Cond</span>
            <span className="node__value node__value--small">
              {pset}.{property} {operator} {value}
            </span>
          </div>
        )}
        {!ifcClass && !pset && (
          <div className="node__row">
            <span className="node__value node__value--muted">No filter set</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </div>
  );
}
