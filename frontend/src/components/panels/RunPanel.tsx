/**
 * RunPanel – execution options, run button, results summary, download link.
 */

import { useState } from 'react';
import { useStore } from '../../store';
import { executeGraph, downloadUrl } from '../../api/client';
import type { NullPolicy } from '../../types';

export function RunPanel() {
  const {
    uploadToken,
    nodes,
    edges,
    executionOptions,
    setExecutionOptions,
    lastRunResult,
    setRunResult,
    isRunning,
    setIsRunning,
  } = useStore();

  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!uploadToken) return;
    setIsRunning(true);
    setError(null);
    setRunResult(null);
    try {
      const result = await executeGraph({
        uploadToken,
        nodes,
        edges,
        executionOptions,
      });
      setRunResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRunning(false);
    }
  }

  const canRun = !!uploadToken && nodes.length > 0 && !isRunning;

  return (
    <div className="panel panel--run">
      <h3 className="panel__title">Run</h3>

      <div className="run-options">
        <label className="inspector__field">
          <span className="inspector__label">Null policy</span>
          <select
            className="inspector__input"
            value={executionOptions.nullPolicy}
            onChange={(e) =>
              setExecutionOptions({ nullPolicy: e.target.value as NullPolicy })
            }
          >
            <option value="skip">Skip (don't write)</option>
            <option value="writeEmpty">Write empty</option>
            <option value="useDefault">Use default</option>
          </select>
        </label>

        <label className="inspector__field inspector__field--inline">
          <input
            type="checkbox"
            checked={executionOptions.createPsetIfMissing}
            onChange={(e) =>
              setExecutionOptions({ createPsetIfMissing: e.target.checked })
            }
          />
          <span className="inspector__label">Create PSet if missing</span>
        </label>

        <label className="inspector__field inspector__field--inline">
          <input
            type="checkbox"
            checked={executionOptions.overwriteExisting}
            onChange={(e) =>
              setExecutionOptions({ overwriteExisting: e.target.checked })
            }
          />
          <span className="inspector__label">Overwrite existing</span>
        </label>
      </div>

      <button className="btn btn--primary" onClick={handleRun} disabled={!canRun}>
        {isRunning ? 'Running…' : 'Run mapping'}
      </button>

      {error && <div className="error-msg">{error}</div>}

      {lastRunResult && (
        <div className="run-results">
          <div className="run-results__status">
            {lastRunResult.status === 'ok' ? '✓' : '✗'} {lastRunResult.message}
          </div>

          {lastRunResult.downloadUrl && (
            <a
              className="btn btn--download"
              href={downloadUrl(lastRunResult.runId)}
              download
            >
              Download IFC
            </a>
          )}

          <details className="run-results__details">
            <summary>Node results ({lastRunResult.nodeResults.length})</summary>
            <table className="run-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Processed</th>
                  <th>Written</th>
                  <th>Skipped</th>
                </tr>
              </thead>
              <tbody>
                {lastRunResult.nodeResults.map((r) => (
                  <tr key={r.nodeId}>
                    <td>{r.nodeType}</td>
                    <td>{r.elementsProcessed}</td>
                    <td>{r.elementsWritten}</td>
                    <td>{r.elementsSkipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
    </div>
  );
}
