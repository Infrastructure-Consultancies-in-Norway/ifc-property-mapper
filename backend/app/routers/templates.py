"""Templates router – CRUD for local JSON mapping templates."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.models import MappingTemplate

TEMPLATES_DIR = Path(__file__).parent.parent.parent.parent / "templates"
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()


def _template_path(name: str) -> Path:
    safe = name.replace("/", "_").replace("\\", "_")
    return TEMPLATES_DIR / f"{safe}.json"


@router.get("")
async def list_templates() -> list[dict]:
    """Return a list of all saved templates (name + description)."""
    results = []
    for path in sorted(TEMPLATES_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            results.append(
                {
                    "name": data.get("name", path.stem),
                    "description": data.get("description", ""),
                    "schemaHints": data.get("schemaHints", []),
                    "updatedAt": data.get("metadata", {}).get("updatedAt", ""),
                }
            )
        except Exception:
            pass
    return results


@router.get("/{name}")
async def get_template(name: str) -> JSONResponse:
    """Load a single template by name, with validation."""
    path = _template_path(name)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{name}' not found.")
    
    try:
        raw_data = json.loads(path.read_text(encoding="utf-8"))
        # Validate and normalize through Pydantic model
        template = MappingTemplate(**raw_data)
        # Return normalized JSON (ensures consistent schema)
        return JSONResponse(content=template.model_dump(by_alias=True))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in template: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid template format: {str(e)}")


@router.post("")
async def save_template(template: MappingTemplate) -> JSONResponse:
    """Create or overwrite a template."""
    now = datetime.now(timezone.utc).isoformat()
    path = _template_path(template.name)

    if path.exists():
        existing = json.loads(path.read_text(encoding="utf-8"))
        created_at = existing.get("metadata", {}).get("createdAt", now)
    else:
        created_at = now

    payload = template.model_dump(by_alias=True)
    payload["metadata"]["createdAt"] = created_at
    payload["metadata"]["updatedAt"] = now

    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return JSONResponse(content=payload, status_code=200)


@router.delete("/{name}")
async def delete_template(name: str) -> dict:
    """Delete a template by name."""
    path = _template_path(name)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{name}' not found.")
    path.unlink()
    return {"deleted": name}
