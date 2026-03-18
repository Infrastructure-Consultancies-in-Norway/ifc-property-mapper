"""IFC inspect router – POST /ifc/inspect, POST /ifc/upload."""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path

import ifcopenshell
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from app.ifc.parser import inspect_ifc

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()


@router.post("/upload")
async def upload_ifc(file: UploadFile = File(...)) -> dict:
    """Accept an IFC file, store it temporarily, return an upload token."""
    if not file.filename or not file.filename.lower().endswith(".ifc"):
        raise HTTPException(status_code=400, detail="Only .ifc files are accepted.")

    token = uuid.uuid4().hex
    dest = UPLOAD_DIR / f"{token}.ifc"

    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    return {"uploadToken": token, "filename": file.filename}


@router.post("/inspect")
async def inspect(upload_token: str) -> JSONResponse:
    """Inspect an uploaded IFC file; return classes, psets, and property names."""
    ifc_path = UPLOAD_DIR / f"{upload_token}.ifc"
    if not ifc_path.exists():
        raise HTTPException(status_code=404, detail="Upload token not found.")

    try:
        result = inspect_ifc(str(ifc_path))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return JSONResponse(content=result)
