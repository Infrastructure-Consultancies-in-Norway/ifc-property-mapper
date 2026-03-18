/**
 * Custom node: Const – emits a fixed static value.
 */

import { Handle, Position, type NodeProps } from '@xyflow/react';

export function ConstNode({ data, selected }: NodeProps) {
  const value = (data.value as string) ?? '';

  return (
    <div className={`node node--const ${selected ? 'node--selected' : ''}`}>
      <div className="node__header node__header--transform">Const</div>
      <div className="node__body">
        <div className="node__row">
          <span className="node__label">Value</span>
          <span className="node__value node__value--mono">{value || '(empty)'}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </div>
  );
}
