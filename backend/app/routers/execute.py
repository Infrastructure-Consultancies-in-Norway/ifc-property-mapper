"""Execute router – POST /execute, GET /download/{run_id}."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from app.models import ExecuteRequest, ExecuteResponse
from app.engine.graph import run_graph

RUNS_DIR = Path(__file__).parent.parent.parent.parent / "runs"
RUNS_DIR.mkdir(parents=True, exist_ok=True)

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"

router = APIRouter()


@router.post("/execute", response_model=ExecuteResponse)
async def execute(request: ExecuteRequest) -> JSONResponse:
    """Run the mapping graph on an uploaded IFC file."""
    ifc_path = UPLOAD_DIR / f"{request.upload_token}.ifc"
    if not ifc_path.exists():
        raise HTTPException(status_code=404, detail="Upload token not found.")

    run_id = uuid.uuid4().hex
    output_path = RUNS_DIR / f"{run_id}.ifc"
    report_path = RUNS_DIR / f"{run_id}.json"

    try:
        result = run_graph(
            ifc_path=str(ifc_path),
            output_path=str(output_path),
            nodes=request.nodes,
            edges=request.edges,
            options=request.execution_options,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    import json as _json

    result["runId"] = run_id
    result["downloadUrl"] = f"/download/{run_id}"
    report_path.write_text(_json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    return JSONResponse(content=result)


@router.get("/download/{run_id}")
async def download(run_id: str) -> FileResponse:
    """Download the modified IFC file produced by a run."""
    output_path = RUNS_DIR / f"{run_id}.ifc"
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Run not found or file not yet available.")

    return FileResponse(
        path=str(output_path),
        media_type="application/octet-stream",
        filename=f"mapped_{run_id[:8]}.ifc",
    )
