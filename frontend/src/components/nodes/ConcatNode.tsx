/**
 * Custom node: Concat – joins multiple values with a delimiter.
 */

import { Handle, Position, type NodeProps } from '@xyflow/react';

export function ConcatNode({ data, selected }: NodeProps) {
  const delimiter = (data.delimiter as string) ?? ' ';
  const inputCount = (data.input_count as number) ?? 2;

  return (
    <div className={`node node--transform ${selected ? 'node--selected' : ''}`}>
      {Array.from({ length: inputCount }).map((_, i) => (
        <Handle
          key={i}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          style={{ top: `${20 + i * 24}px` }}
        />
      ))}
      <div className="node__header node__header--transform">Concat</div>
      <div className="node__body">
        <div className="node__row">
          <span className="node__label">Delimiter</span>
          <span className="node__value node__value--mono">"{delimiter}"</span>
        </div>
        <div className="node__row">
          <span className="node__label">Inputs</span>
          <span className="node__value">{inputCount}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </div>
  );
}
