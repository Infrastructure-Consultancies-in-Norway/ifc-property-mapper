"""Node execution handlers for the mapping graph."""

from __future__ import annotations

from typing import Any

from app.models import (
    CastTarget,
    FilterOperator,
    NullPolicy,
)
from app.ifc.writer import read_property


# ---------------------------------------------------------------------------
# Value helpers
# ---------------------------------------------------------------------------


def _to_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _cast_value(value: Any, target: CastTarget) -> Any:
    raw = _to_str(value)
    if target == CastTarget.text:
        return raw
    if target == CastTarget.number:
        try:
            if "." in raw:
                return float(raw)
            return int(raw)
        except (ValueError, TypeError):
            return None
    if target == CastTarget.bool:
        return raw.lower() in ("true", "1", "yes", "ja", "sant")
    return value


def _filter_passes(element: Any, filter_data: dict) -> bool:
    """Return True if element matches the filter node criteria."""
    ifc_class = filter_data.get("ifc_class") or filter_data.get("ifcClass")
    pset = filter_data.get("pset")
    prop = filter_data.get("property")
    operator_str = filter_data.get("operator", FilterOperator.exists.value)
    compare_value = filter_data.get("value")

    # Class filter
    if ifc_class and not element.is_a(ifc_class):
        return False

    # Property condition filter
    if pset and prop:
        actual = read_property(element, pset, prop)
        op = FilterOperator(operator_str)

        if op == FilterOperator.exists:
            return actual is not None
        if op == FilterOperator.not_exists:
            return actual is None
        if op == FilterOperator.equals:
            return _to_str(actual) == _to_str(compare_value)
        if op == FilterOperator.not_equals:
            return _to_str(actual) != _to_str(compare_value)
        if op == FilterOperator.contains:
            return _to_str(compare_value) in _to_str(actual)
        if op == FilterOperator.not_contains:
            return _to_str(compare_value) not in _to_str(actual)
        if op == FilterOperator.greater_than:
            try:
                return float(_to_str(actual)) > float(_to_str(compare_value))
            except (ValueError, TypeError):
                return False
        if op == FilterOperator.less_than:
            try:
                return float(_to_str(actual)) < float(_to_str(compare_value))
            except (ValueError, TypeError):
                return False

    return True


# ---------------------------------------------------------------------------
# Node evaluators
# Each evaluator receives the node data dict, a list of input values, and the
# element being processed. Returns the computed output value.
# ---------------------------------------------------------------------------


def eval_source_property(node_data: dict, _inputs: list, element: Any) -> Any:
    """Reads a single Pset.property from the element."""
    pset = node_data.get("pset", "")
    prop = node_data.get("property", "")
    if pset and prop:
        return read_property(element, pset, prop)
    return None


def eval_source_properties(node_data: dict, _inputs: list, element: Any) -> dict[int, Any]:
    """
    Reads multiple properties from a single PSet.
    Returns a dict keyed by property index: {0: value0, 1: value1, ...}
    """
    pset = node_data.get("pset", "")
    properties: list[str] = node_data.get("properties", [])
    result: dict[int, Any] = {}
    for i, prop_name in enumerate(properties):
        result[i] = read_property(element, pset, prop_name) if pset and prop_name else None
    return result


def eval_const(_node_data: dict, _inputs: list, _element: Any) -> Any:
    return _node_data.get("value", "")


def eval_concat(node_data: dict, inputs: list, _element: Any) -> str:
    delimiter = node_data.get("delimiter", " ")
    parts = [_to_str(v) for v in inputs if v is not None]
    return delimiter.join(parts)


def eval_split(node_data: dict, inputs: list, _element: Any) -> Any:
    delimiter = node_data.get("delimiter", " ")
    index = int(node_data.get("index", 0))
    raw = _to_str(inputs[0] if inputs else "")
    parts = raw.split(delimiter)
    if index < len(parts):
        return parts[index]
    return None


def eval_cast(node_data: dict, inputs: list, _element: Any) -> Any:
    target_str = node_data.get("target_type") or node_data.get("targetType", "text")
    target = CastTarget(target_str)
    value = inputs[0] if inputs else None
    return _cast_value(value, target)


def eval_preview(_node_data: dict, inputs: list, _element: Any) -> Any:
    return inputs[0] if inputs else None


def eval_filter(node_data: dict, inputs: list, element: Any) -> Any:
    """Filter passes the upstream value through if the element matches, else None."""
    if _filter_passes(element, node_data):
        return inputs[0] if inputs else True
    return None  # sentinel: element filtered out
