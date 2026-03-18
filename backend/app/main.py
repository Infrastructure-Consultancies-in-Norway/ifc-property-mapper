"""IFC Property Mapper – FastAPI application entry point."""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routers import ifc, templates, execute

app = FastAPI(
    title="IFC Property Mapper",
    description="Visual node-based IFC property mapping tool API",
    version="0.1.0",
)

# In production (Docker) the frontend is served by FastAPI StaticFiles on the
# same origin, so CORS is not required.  Allow dev origins for local work.
_cors_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ifc.router, prefix="/ifc", tags=["ifc"])
app.include_router(templates.router, prefix="/templates", tags=["templates"])
app.include_router(execute.router, tags=["execute"])


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}


# Serve the built React frontend (only present in the Docker image).
_static_dir = Path(__file__).parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=_static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        """Return index.html for all unknown routes (SPA client-side routing)."""
        return FileResponse(_static_dir / "index.html")
