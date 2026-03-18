"""Pydantic models shared across the application."""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class NullPolicy(str, Enum):
    skip = "skip"
    write_empty = "writeEmpty"
    use_default = "useDefault"


class NodeType(str, Enum):
    source_property = "SourceProperty"
    source_properties = "SourceProperties"
    filter_ = "Filter"
    concat = "Concat"
    split_ = "Split"
    const = "Const"
    cast = "Cast"
    target_property = "TargetProperty"
    target_properties = "TargetProperties"
    preview = "Preview"


class CastTarget(str, Enum):
    text = "text"
    number = "number"
    bool = "bool"


class FilterOperator(str, Enum):
    equals = "equals"
    not_equals = "notEquals"
    contains = "contains"
    not_contains = "notContains"
    exists = "exists"
    not_exists = "notExists"
    greater_than = "greaterThan"
    less_than = "lessThan"


# ---------------------------------------------------------------------------
# Node data payloads
# ---------------------------------------------------------------------------


class PropertySelector(BaseModel):
    pset: str
    property: str


class SourcePropertyData(BaseModel):
    ifc_class: str | None = None
    pset: str = ""
    property: str = ""


class SourcePropertiesData(BaseModel):
    ifc_class: str | None = None
    pset: str = ""
    properties: list[str] = Field(default_factory=list)


class FilterData(BaseModel):
    ifc_class: str | None = None
    pset: str | None = None
    property: str | None = None
    operator: FilterOperator = FilterOperator.exists
    value: str | None = None


class ConcatData(BaseModel):
    delimiter: str = " "
    input_count: int = Field(default=2, ge=2, le=10)


class SplitData(BaseModel):
    delimiter: str = " "
    index: int = 0  # which part to emit (0-based)


class ConstData(BaseModel):
    value: str


class CastData(BaseModel):
    target_type: CastTarget


class TargetPropertyData(BaseModel):
    ifc_class: str | None = None  # restrict writes to this class
    pset: str = ""
    property: str = ""


class TargetPropertiesData(BaseModel):
    ifc_class: str | None = None
    pset: str = ""
    properties: list[str] = Field(default_factory=list)


class PreviewData(BaseModel):
    label: str = "Preview"
    max_samples: int = Field(100, alias="maxSamples", ge=1, le=10000)

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Graph nodes and edges
# ---------------------------------------------------------------------------


class NodePosition(BaseModel):
    x: float
    y: float


class GraphNode(BaseModel):
    id: str
    type: NodeType
    position: NodePosition
    data: dict[str, Any]


class GraphEdge(BaseModel):
    id: str
    source: str
    source_handle: str | None = Field(None, alias="sourceHandle")
    target: str
    target_handle: str | None = Field(None, alias="targetHandle")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Execution options
# ---------------------------------------------------------------------------


class ExecutionOptions(BaseModel):
    create_pset_if_missing: bool = Field(True, alias="createPsetIfMissing")
    overwrite_existing: bool = Field(True, alias="overwriteExisting")
    null_policy: NullPolicy = Field(NullPolicy.skip, alias="nullPolicy")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Template
# ---------------------------------------------------------------------------


class TemplateMetadata(BaseModel):
    created_at: str = Field("", alias="createdAt")
    updated_at: str = Field("", alias="updatedAt")

    model_config = {"populate_by_name": True}


class MappingTemplate(BaseModel):
    version: Literal["1"] = "1"
    name: str
    description: str = ""
    schema_hints: list[str] = Field(default_factory=lambda: ["IFC2X3", "IFC4X3"], alias="schemaHints")
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    execution_options: ExecutionOptions = Field(
        default_factory=lambda: ExecutionOptions(), alias="executionOptions"
    )
    metadata: TemplateMetadata = Field(default_factory=lambda: TemplateMetadata())

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# IFC inspect response
# ---------------------------------------------------------------------------


class PsetInfo(BaseModel):
    name: str
    properties: list[str]


class IfcClassInfo(BaseModel):
    ifc_class: str = Field(alias="ifcClass")
    count: int
    psets: list[PsetInfo]

    model_config = {"populate_by_name": True}


class InspectResponse(BaseModel):
    schema_version: str = Field(alias="schemaVersion")
    classes: list[IfcClassInfo]

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Execute request / response
# ---------------------------------------------------------------------------


class ExecuteRequest(BaseModel):
    upload_token: str = Field(alias="uploadToken")
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    execution_options: ExecutionOptions = Field(
        default_factory=lambda: ExecutionOptions(), alias="executionOptions"
    )

    model_config = {"populate_by_name": True}


class NodeResult(BaseModel):
    node_id: str = Field(alias="nodeId")
    node_type: str = Field(alias="nodeType")
    elements_processed: int = Field(0, alias="elementsProcessed")
    elements_written: int = Field(0, alias="elementsWritten")
    elements_skipped: int = Field(0, alias="elementsSkipped")
    sample_values: list[Any] = Field(default_factory=list, alias="sampleValues")
    warnings: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class ExecuteResponse(BaseModel):
    run_id: str = Field(alias="runId")
    status: Literal["ok", "error"] = "ok"
    message: str = ""
    node_results: list[NodeResult] = Field(default_factory=list, alias="nodeResults")
    download_url: str = Field("", alias="downloadUrl")

    model_config = {"populate_by_name": True}
