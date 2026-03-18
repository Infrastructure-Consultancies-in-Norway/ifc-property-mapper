/**
 * Custom node: Cast – converts value to text / number / bool.
 */

import { Handle, Position, type NodeProps } from '@xyflow/react';

export function CastNode({ data, selected }: NodeProps) {
  const targetType = (data.targetType as string) ?? 'text';

  return (
    <div className={`node node--transform ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in-0" />
      <div className="node__header node__header--transform">Cast</div>
      <div className="node__body">
        <div className="node__row">
          <span className="node__label">To</span>
          <span className="node__value">{targetType}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </div>
  );
}
