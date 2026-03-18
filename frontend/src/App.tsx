import './App.css';
import { UploadPanel } from './components/panels/UploadPanel';
import { NodePalette } from './components/panels/NodePalette';
import { InspectorPanel } from './components/panels/InspectorPanel';
import { RunPanel } from './components/panels/RunPanel';
import { TemplateManager } from './components/panels/TemplateManager';
import { MappingCanvas } from './components/MappingCanvas';

function App() {
  return (
    <div className="app-layout">
      {/* Left sidebar */}
      <aside className="sidebar sidebar--left">
        <div className="app-title">IFC Property Mapper</div>
        <UploadPanel />
        <NodePalette />
        <TemplateManager />
      </aside>

      {/* Canvas */}
      <main className="canvas-area">
        <MappingCanvas />
      </main>

      {/* Right sidebar */}
      <aside className="sidebar sidebar--right">
        <InspectorPanel />
        <RunPanel />
      </aside>
    </div>
  );
}

export default App;
