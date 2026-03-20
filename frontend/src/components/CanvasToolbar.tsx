/**
 * Canvas toolbar with undo/redo buttons
 */

import { useStore } from '../store';

export function CanvasToolbar() {
  const { past, future, undo, redo } = useStore();
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return (
    <div className="canvas-toolbar">
      <button
        className="canvas-toolbar__btn"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        ↶
      </button>
      <button
        className="canvas-toolbar__btn"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
      >
        ↷
      </button>
    </div>
  );
}
