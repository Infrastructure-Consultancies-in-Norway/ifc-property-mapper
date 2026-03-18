/**
 * Custom node: Split – extracts one part of a delimited value.
 */

import { Handle, Position, type NodeProps } from '@xyflow/react';

export function SplitNode({ data, selected }: NodeProps) {
  const delimiter = (data.delimiter as string) ?? ' ';
  const index = (data.index as number) ?? 0;

  return (
    <div className={`node node--transform ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in-0" />
      <div className="node__header node__header--transform">Split</div>
      <div className="node__body">
        <div className="node__row">
          <span className="node__label">Delimiter</span>
          <span className="node__value node__value--mono">"{delimiter}"</span>
        </div>
        <div className="node__row">
          <span className="node__label">Index</span>
          <span className="node__value">{index}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </div>
  );
}
