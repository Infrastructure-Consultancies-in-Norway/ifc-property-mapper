# IFC Property Mapper

A visual, node-based tool for mapping, transforming, and writing IFC property sets — built with React Flow + FastAPI + IfcOpenShell.

## What it does

- Upload an IFC file (IFC2X3 or IFC4X3)
- Inspect all available property sets and properties
- Build a visual node graph to define property mappings:
  - Read from one or multiple source property sets
  - Apply transformations: `concat`, `split`, `cast`, `const`
  - Filter by IFC class and/or property conditions
  - Write into new or existing target property sets
- Save/load reusable mapping templates as local JSON files
- Execute the mapping graph and download the modified IFC
- View a structured run report (elements changed, warnings, errors)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TypeScript + React Flow |
| Backend | FastAPI + Pydantic + IfcOpenShell |
| Storage | Local JSON files (templates/, runs/) |

## Project Structure

```
ifc-property-mapper/
├── backend/          # FastAPI service + execution engine
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── engine/   # graph executor
│   │   └── ifc/      # IfcOpenShell utilities
│   ├── requirements.txt
│   └── .venv/
├── frontend/         # React Flow app
│   ├── src/
│   │   ├── components/
│   │   ├── nodes/
│   │   ├── hooks/
│   │   └── api/
│   └── package.json
├── templates/        # Saved mapping templates (JSON)
├── runs/             # Execution reports + output IFC metadata
└── samples/          # Optional test IFC files
```

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173  
Backend API on http://localhost:8000  
API docs at http://localhost:8000/docs

## Node Types

| Node | Purpose |
|------|---------|
| `SourceProperty` | Read a specific `Pset.Property` from IFC elements |
| `Filter` | Filter elements by IFC class and/or property condition |
| `Concat` | Combine multiple values with a delimiter |
| `Split` | Split a value into multiple outputs |
| `Const` | Emit a fixed static value |
| `Cast` | Convert value to text / number / bool |
| `TargetProperty` | Write value into a target `Pset.Property` |
| `Preview` | Inspect sampled values without writing |

## Template Format (v1)

```json
{
  "version": "1",
  "name": "My Mapping",
  "description": "...",
  "schemaHints": ["IFC2X3", "IFC4X3"],
  "nodes": [...],
  "edges": [...],
  "executionOptions": {
    "createPsetIfMissing": true,
    "overwriteExisting": true,
    "nullPolicy": "skip"
  },
  "metadata": {
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## IFC Schema Support

- **IFC2X3**: Full support
- **IFC4X3**: Full support
- Schema auto-detected from IFC file header
- Compatibility warnings emitted (not hard failures) when behaviour differs

## Execution Semantics

- Graph is executed in topological order
- Each value stream carries element identity (GlobalId, expressId) + current value
- Write always produces a **new IFC file** — the original is never modified
- Null/empty handling configurable: `skip`, `writeEmpty`, `useDefault`
