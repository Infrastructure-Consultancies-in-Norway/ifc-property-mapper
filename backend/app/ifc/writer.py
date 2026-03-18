"""IFC write utilities – property set creation and property assignment."""

from __future__ import annotations

from typing import Any

import ifcopenshell
import ifcopenshell.api
import ifcopenshell.util.element as ifc_util


def get_or_create_pset(
    ifc_file: ifcopenshell.file,
    element: Any,
    pset_name: str,
) -> Any:
    """Return an existing IfcPropertySet by name, or create a new one attached to element."""
    existing_psets = ifc_util.get_psets(element, verbose=True)
    if pset_name in existing_psets:
        pset_id = existing_psets[pset_name].get("id")
        if pset_id:
            return ifc_file.by_id(pset_id)

    # Create a new empty property set and attach it
    pset = ifcopenshell.api.run(
        "pset.add_pset",
        ifc_file,
        product=element,
        name=pset_name,
    )
    return pset


def write_property(
    ifc_file: ifcopenshell.file,
    element: Any,
    pset_name: str,
    prop_name: str,
    value: Any,
    create_pset_if_missing: bool = True,
    overwrite_existing: bool = True,
) -> bool:
    """
    Write a single property to an element's property set.

    Returns True if a write occurred, False if skipped.
    """
    existing_psets = ifc_util.get_psets(element, verbose=True)

    if pset_name not in existing_psets:
        if not create_pset_if_missing:
            return False
        pset = get_or_create_pset(ifc_file, element, pset_name)
    else:
        pset_id = existing_psets[pset_name].get("id")
        pset = ifc_file.by_id(pset_id) if pset_id else get_or_create_pset(ifc_file, element, pset_name)

    # Check if property already exists
    if not overwrite_existing:
        props = existing_psets.get(pset_name, {})
        if prop_name in props and props[prop_name] is not None:
            return False

    # IfcOpenShell API call to edit/add the property
    ifcopenshell.api.run(
        "pset.edit_pset",
        ifc_file,
        pset=pset,
        properties={prop_name: value},
    )
    return True


def read_property(element: Any, pset_name: str, prop_name: str) -> Any:
    """Read a property value from an element. Returns None if not found."""
    psets = ifc_util.get_psets(element)
    pset = psets.get(pset_name)
    if pset is None:
        return None
    return pset.get(prop_name)
