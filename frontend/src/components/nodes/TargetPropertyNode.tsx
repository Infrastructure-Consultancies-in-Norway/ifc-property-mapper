/**
 * Custom node: TargetProperty – writes a value to a single Pset.Property.
 * Single input handle on the left.
 */

import { Handle, Position, type NodeProps } from '@xyflow/react';

export function TargetPropertyNode({ data, selected }: NodeProps) {
  const pset = (data.pset as string) || '';
  const property = (data.property as string) || '';
  const ifcClass = (data.ifc_class as string) || '';

  return (
    <div className={`node node--target ${selected ? 'node--selected' : ''}`}>
      <div className="node__header node__header--target">Target Property</div>
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
        <div className="node__row">
          <span className="node__label">Prop</span>
          <span className="node__value">{property || '—'}</span>
        </div>
      </div>
      <Handle type="target" position={Position.Left} id="value" />
    </div>
  );
}
