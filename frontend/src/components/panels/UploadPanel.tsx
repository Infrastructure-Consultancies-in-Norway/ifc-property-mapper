/**
 * UploadPanel – IFC file upload + inspect trigger.
 */

import { useRef, useState } from 'react';
import { uploadIfc, inspectIfc } from '../../api/client';
import { useStore } from '../../store';

export function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setUpload, setInspectResult, uploadToken, filename, schemaVersion, ifcClasses } =
    useStore();

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const { uploadToken: token, filename: name } = await uploadIfc(file);
      setUpload(token, name);
      const inspect = await inspectIfc(token);
      setInspectResult(inspect.schemaVersion, inspect.classes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="panel panel--upload">
      <h3 className="panel__title">IFC File</h3>

      {!uploadToken ? (
        <div
          className="upload-zone"
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".ifc"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
          {loading ? (
            <span className="upload-zone__hint">Uploading &amp; inspecting…</span>
          ) : (
            <>
              <span className="upload-zone__icon">⬆</span>
              <span className="upload-zone__hint">Drop .ifc here or click to browse</span>
            </>
          )}
        </div>
      ) : (
        <div className="upload-info">
          <div className="upload-info__row">
            <span className="upload-info__label">File</span>
            <span className="upload-info__value">{filename}</span>
          </div>
          <div className="upload-info__row">
            <span className="upload-info__label">Schema</span>
            <span className="upload-info__value">{schemaVersion}</span>
          </div>
          <div className="upload-info__row">
            <span className="upload-info__label">Classes</span>
            <span className="upload-info__value">{ifcClasses.length}</span>
          </div>
          <button
            className="btn btn--ghost"
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            Change file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".ifc"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}
    </div>
  );
}
