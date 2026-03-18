# Agent Guidelines for IFC Property Mapper

This document guides agentic coding systems (Claude, Copilot agents, etc.) working on this codebase.

## Build & Development Commands

### Frontend
```bash
# Install dependencies
npm install

# Development server (http://localhost:5173)
npm run dev

# Type-check + build for production
npm run build

# Lint TypeScript and React files
npm run lint

# Preview production build
npm run preview
```

### Canvas Shortcuts

- **Shift + Click on wire**: Delete the wire
- **Right-click on wire**: Confirm deletion dialog
- **Delete key**: Delete selected nodes
- **Ctrl+Z / Cmd+Z**: Undo
- **Ctrl+Y / Cmd+Shift+Z**: Redo

### Backend
```bash
# Activate virtual environment
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server (http://localhost:8000)
uvicorn app.main:app --reload --port 8000

# API docs at http://localhost:8000/docs
```

## Code Style & Architecture Guidelines

### **Frontend (React + TypeScript)**

#### Imports
- ESM imports only: `import { Component } from 'module'`
- Relative imports for local files: `import { useStore } from '../../store'`
- Group imports: external libraries, then relative imports
- Use named imports; default exports only for React components

#### TypeScript & Types
- Use `type` for interfaces: `type NodeType = 'Source' | 'Target' | ...`
- Use `interface` for objects with optional properties or React props
- Avoid `any`; use specific types or `Record<string, unknown>` as fallback
- Export types from `src/types/index.ts` for sharing between components
- Use type predicates for runtime checks: `if (typeof x === 'string')`

#### React Components
- Functional components with hooks only (no class components)
- CSS class names follow pattern: `component__element--modifier` (BEM-like)
- CSS imports in component files when local to that component
- Use `useStore` (Zustand) for global state, never prop drilling for store data
- Event handlers: `onEventName` prop pattern, `handleEventName` function pattern

#### Naming Conventions
- Components: PascalCase (`PreviewNode.tsx`, `InspectorPanel.tsx`)
- Functions/variables: camelCase (`sampleValues`, `updateNodeData`)
- CSS classes: kebab-case (`.node__preview-scroll`, `.btn--primary`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_SAMPLE_LIMIT`)

#### Error Handling
- Network errors caught at API call sites, set to store state or show toast
- Form validation: display inline error messages in inspector panels
- Type errors: lean on TypeScript compiler to catch at build time

### **Backend (Python + FastAPI)**

#### Code Structure
- `main.py`: FastAPI app setup, middleware, router includes
- `models.py`: Pydantic models (requests, responses, shared types)
- `routers/`: API endpoint definitions, use `async def` handlers
- `engine/`: Core business logic (graph executor, node evaluators)
- `ifc/`: IfcOpenShell utilities (read, write, validation)

#### Imports & Style
- Absolute imports: `from app.models import ...` (not relative)
- Use `from __future__ import annotations` at file top for forward references
- PEP 8: 4-space indents, snake_case for functions/variables
- Docstrings for modules, classes, and public functions

#### Pydantic Models
- Define all request/response shapes as Pydantic models
- Use `Field(alias="camelCase")` for frontend JSON compatibility
- Set `model_config = {"populate_by_name": True}` to accept both snake_case and camelCase
- Validation: use Field constraints (`ge=1, le=100`) over separate validators

#### Error Handling
- Raise `HTTPException(status_code=400, detail="message")` for client errors
- Catch and wrap unexpected exceptions: `except Exception as exc: raise HTTPException(...) from exc`
- Log errors (use standard `logging` module) before raising to API

#### Naming Conventions
- Functions/variables: snake_case (`run_graph`, `sample_limit`)
- Classes: PascalCase (`PreviewData`, `GraphNode`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_SAMPLE_LIMIT`)
- Private: prefix with `_` (`_build_input_map`, `_topological_sort`)

### **File & Project Organization**

- **One component per file**: `PreviewNode.tsx` contains only `PreviewNode`
- **Shared types in `src/types/index.ts`**: No duplicate type definitions
- **CSS co-located with layout**: `App.css` for app structure, node styles grouped together
- **Store actions in one place**: All state mutations in `src/store/index.ts` via Zustand
- **Backend models in `models.py`**: Frontend types mirror backend exactly

### **Testing Strategy**

Frontend: No Jest/Vitest setup currently. Manual testing via `npm run dev`.
Backend: No pytest setup currently. Manual testing via FastAPI docs (`/docs`).

Future: Add tests before major refactors to prevent regressions.

### **Common Patterns**

**Zustand Store Updates:**
```typescript
// Good: single action that handles history + state
updateNodeData: (id, data) => set((state) => ({
  nodes: state.nodes.map(...),
  past: pushPast(state.past, { nodes: state.nodes, edges: state.edges }),
  future: [],
}))
```

**Pydantic Field Aliases:**
```python
# Backend: snake_case internally, camelCase in JSON
class PreviewData(BaseModel):
  max_samples: int = Field(100, alias="maxSamples")
  model_config = {"populate_by_name": True}
```

**Graph Execution:**
- Topological sort + element-by-element evaluation in `engine/graph.py`
- Each node gets per-element input values, computes output, stores samples
- `TargetProperty` nodes write to IFC; others just pass values downstream

## When to Ask for Clarification

- Ambiguous error messages or unclear requirements
- Trade-offs between code simplicity and performance (ask about scale first)
- Breaking changes to types or API contracts (coordinate with PR review)
- Whether to add new node types or extend existing ones

## Key Links

- Frontend: `src/components/nodes/` — node implementations
- Backend: `app/engine/graph.py` — core execution logic
- Shared types: `frontend/src/types/index.ts` and `backend/app/models.py`
- API docs: http://localhost:8000/docs (when backend running)
