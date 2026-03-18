/**
 * Custom node: Preview – inspect sampled values without writing.
 */

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useStore } from '../../store';

export function PreviewNode({ id, data, selected }: NodeProps) {
  const lastRun = useStore((s) => s.lastRunResult);
  const nodeResult = lastRun?.nodeResults.find((r) => r.nodeId === id);
  const samples = nodeResult?.sampleValues ?? [];
  const label = (data.label as string) || 'Preview';
  const total = nodeResult?.elementsProcessed ?? 0;

  return (
    <div className={`node node--preview ${selected ? 'node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in-0" />
      <div className="node__header node__header--preview">{label}</div>
      <div className="node__body">
        {samples.length === 0 ? (
          <div className="node__row">
            <span className="node__value node__value--muted">Run to see samples</span>
          </div>
        ) : (
          <>
            <div className="node__preview-scroll">
              {samples.map((s, i) => (
                <div key={i} className="node__row node__row--preview">
                  <span className="node__preview-index">{i + 1}</span>
                  <span className="node__value node__value--mono node__value--small">{s}</span>
                </div>
              ))}
            </div>
            {total > samples.length && (
              <div className="node__preview-footer">
                Showing {samples.length} of {total}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
