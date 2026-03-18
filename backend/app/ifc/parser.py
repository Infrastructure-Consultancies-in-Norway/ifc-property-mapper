"""IFC inspection utilities using IfcOpenShell."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

import ifcopenshell
import ifcopenshell.util.element as ifc_util


def _schema_version(ifc_file: ifcopenshell.file) -> str:
    """Return human-readable schema identifier, e.g. 'IFC2X3' or 'IFC4X3'."""
    schema = ifc_file.schema
    # IfcOpenShell uses 'IFC2X3', 'IFC4', 'IFC4X3', etc.
    return schema if schema else "UNKNOWN"


def inspect_ifc(path: str) -> dict[str, Any]:
    """
    Open an IFC file and return a structured summary:
    {
        "schemaVersion": "IFC4X3",
        "classes": [
            {
                "ifcClass": "IfcWall",
                "count": 12,
                "psets": [
                    {"name": "Pset_WallCommon", "properties": ["Reference", "IsExternal", ...]},
                    ...
                ]
            },
            ...
        ]
    }
    """
    ifc_file = ifcopenshell.open(path)
    schema = _schema_version(ifc_file)

    # Collect all rooted product/element types
    # We consider all IfcObject subclasses that have property sets
    class_data: dict[str, dict] = {}  # ifcClass -> {"count": int, "psets": {psetName: set[props]}}

    for element in ifc_file.by_type("IfcObject"):
        cls_name = element.is_a()

        if cls_name not in class_data:
            class_data[cls_name] = {"count": 0, "psets": defaultdict(set)}

        class_data[cls_name]["count"] += 1

        # Gather property sets
        psets = ifc_util.get_psets(element)
        for pset_name, props in psets.items():
            if pset_name == "id":
                continue
            for prop_name in props:
                if prop_name == "id":
                    continue
                class_data[cls_name]["psets"][pset_name].add(prop_name)

    # Build output structure
    classes_out = []
    for cls_name, info in sorted(class_data.items()):
        psets_out = [
            {"name": pset_name, "properties": sorted(props)}
            for pset_name, props in sorted(info["psets"].items())
        ]
        classes_out.append(
            {
                "ifcClass": cls_name,
                "count": info["count"],
                "psets": psets_out,
            }
        )

    return {"schemaVersion": schema, "classes": classes_out}
