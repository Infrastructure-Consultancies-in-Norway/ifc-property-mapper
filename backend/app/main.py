"""IFC Property Mapper – FastAPI application entry point."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ifc, templates, execute

app = FastAPI(
    title="IFC Property Mapper",
    description="Visual node-based IFC property mapping tool API",
    version="0.1.0",
)

# In production (Docker) the frontend is served by Nginx on the same host,
# so requests never cross origins.  Allow the dev origins too for local work.
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
