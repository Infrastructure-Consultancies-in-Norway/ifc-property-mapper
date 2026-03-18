"""Graph executor – topological sort + element-by-element evaluation."""

from __future__ import annotations

import shutil
from collections import defaultdict, deque
from typing import Any, Union

import ifcopenshell

from app.models import ExecutionOptions, GraphEdge, GraphNode, NullPolicy
from app.ifc.writer import write_property
from app.engine.nodes import (
    eval_cast,
    eval_concat,
    eval_const,
    eval_filter,
    eval_preview,
    eval_source_properties,
    eval_source_property,
    eval_split,
)

# Map node type string -> evaluator function
NODE_EVALUATORS = {
    "SourceProperty": eval_source_property,
    "Const": eval_const,
    "Concat": eval_concat,
    "Split": eval_split,
    "Cast": eval_cast,
    "Preview": eval_preview,
    "Filter": eval_filter,
}


def _topological_sort(nodes: list[GraphNode], edges: list[GraphEdge]) -> list[GraphNode]:
    """Kahn's algorithm – returns nodes in dependency order."""
    node_map = {n.id: n for n in nodes}
    in_degree: dict[str, int] = {n.id: 0 for n in nodes}
    adjacency: dict[str, list[str]] = defaultdict(list)

    for edge in edges:
        adjacency[edge.source].append(edge.target)
        in_degree[edge.target] = in_degree.get(edge.target, 0) + 1

    queue: deque[str] = deque(nid for nid, deg in in_degree.items() if deg == 0)
    order: list[GraphNode] = []

    while queue:
        nid = queue.popleft()
        order.append(node_map[nid])
        for neighbor in adjacency[nid]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(order) != len(nodes):
        raise ValueError("Graph contains a cycle.")

    return order


def _build_input_map(edges: list[GraphEdge]) -> dict[str, list[tuple[str, str | None, str | None]]]:
    """
    Returns a mapping: target_node_id -> list of (source_node_id, source_handle, target_handle)
    This allows nodes to know which handle ID to use when retrieving values.
    """
    inp: dict[str, list[tuple[str, str | None, str | None]]] = defaultdict(list)
    for edge in edges:
        inp[edge.target].append((edge.source, edge.source_handle, edge.target_handle))
    return inp


def run_graph(
    ifc_path: str,
    output_path: str,
    nodes: list[GraphNode],
    edges: list[GraphEdge],
    options: ExecutionOptions,
) -> dict[str, Any]:
    """
    Execute the mapping graph over all IFC elements.

    Steps:
    1. Copy input IFC to output path (never mutate original)
    2. Open the output IFC for editing
    3. Topological sort the graph
    4. For each IfcObject element:
       a. Evaluate nodes in order, passing values along edges
       b. For TargetProperty nodes: write the incoming value
    5. Save the IFC file
    6. Return a run report dict
    """
    # 1. Copy IFC
    shutil.copy2(ifc_path, output_path)
    ifc_file = ifcopenshell.open(output_path)

    # 2. Sort graph
    sorted_nodes = _topological_sort(nodes, edges)
    input_map = _build_input_map(edges)

    # 3. Build per-node result accumulators
    node_results: dict[str, dict] = {
        n.id: {
            "nodeId": n.id,
            "nodeType": n.type.value if hasattr(n.type, "value") else str(n.type),
            "elementsProcessed": 0,
            "elementsWritten": 0,
            "elementsSkipped": 0,
            "sampleValues": [],
            "warnings": [],
        }
        for n in nodes
    }

    # 4. Evaluate per element
    elements = list(ifc_file.by_type("IfcObject"))
    DEFAULT_SAMPLE_LIMIT = 100

    for element in elements:
        # values computed so far this element pass: (node_id, handle_id) -> value
        # where handle_id is "value" for single-output nodes, or "out-0", "out-1", etc. for multi-output
        computed: dict[Union[tuple[str, str], str], Any] = {}
        element_filtered = False

        for node in sorted_nodes:
            ndata = node.data
            ntype = node.type.value if hasattr(node.type, "value") else str(node.type)
            nr = node_results[node.id]

            # Gather inputs for this node
            # inputs dict uses target_handle as key (e.g., "in-0", "in-1" for multi-input)
            inputs: dict[str, Any] = {}
            for src_id, src_handle, tgt_handle in input_map.get(node.id, []):
                src_handle_id = src_handle or "value"  # default handle
                tgt_handle_id = tgt_handle or "value"  # default handle
                # Retrieve computed value by (source_id, source_handle)
                key = (src_id, src_handle_id)
                inputs[tgt_handle_id] = computed.get(key) or computed.get(src_id)
            
            # For single-input nodes, also support legacy list format
            legacy_inputs: list[Any] = [
                computed.get((src_id, src_handle or "value")) or computed.get(src_id)
                for src_id, src_handle, _ in input_map.get(node.id, [])
            ]

            if ntype == "SourceProperty":
                # Single pset + property → single output handle "value"
                result = eval_source_property(ndata, [], element)
                computed[(node.id, "value")] = result
                nr["elementsProcessed"] += 1
                if len(nr["sampleValues"]) < DEFAULT_SAMPLE_LIMIT and result is not None:
                    nr["sampleValues"].append(str(result))

            elif ntype == "SourceProperties":
                # Shared PSet, list of property names → one output per property (out-0, out-1, ...)
                result_dict = eval_source_properties(ndata, [], element)
                for i, value in result_dict.items():
                    computed[(node.id, f"out-{i}")] = value
                nr["elementsProcessed"] += 1
                sample = str(result_dict) if result_dict else None
                if len(nr["sampleValues"]) < DEFAULT_SAMPLE_LIMIT and sample:
                    nr["sampleValues"].append(sample)

            elif ntype == "TargetProperty":
                # Single pset + property; value comes from upstream via the "value" handle
                value = legacy_inputs[0] if legacy_inputs else None

                # Apply null policy
                if value is None or value == "":
                    policy = options.null_policy
                    if policy == NullPolicy.skip:
                        nr["elementsSkipped"] += 1
                        computed[(node.id, "value")] = None
                        continue
                    elif policy == NullPolicy.use_default:
                        value = ndata.get("default", "")

                # Class filter
                target_class = ndata.get("ifc_class") or ndata.get("ifcClass")
                if target_class and not element.is_a(target_class):
                    nr["elementsSkipped"] += 1
                    computed[(node.id, "value")] = None
                    continue

                nr["elementsProcessed"] += 1
                try:
                    written = write_property(
                        ifc_file,
                        element,
                        ndata.get("pset", ""),
                        ndata.get("property", ""),
                        value,
                        create_pset_if_missing=options.create_pset_if_missing,
                        overwrite_existing=options.overwrite_existing,
                    )
                    if written:
                        nr["elementsWritten"] += 1
                    else:
                        nr["elementsSkipped"] += 1
                except Exception as exc:
                    nr["warnings"].append(str(exc))
                    nr["elementsSkipped"] += 1
                    value = None

                computed[(node.id, "value")] = value

            elif ntype == "TargetProperties":
                # Shared PSet, list of property names; each gets its own input handle (in-0, in-1, ...)
                pset = ndata.get("pset", "")
                properties: list[str] = ndata.get("properties", [])

                # Class filter (applied once for the whole node)
                target_class = ndata.get("ifc_class") or ndata.get("ifcClass")
                if target_class and not element.is_a(target_class):
                    nr["elementsSkipped"] += len(properties)
                    computed[(node.id, "value")] = None
                    continue

                for i, prop_name in enumerate(properties):
                    value = inputs.get(f"in-{i}")

                    if value is None or value == "":
                        policy = options.null_policy
                        if policy == NullPolicy.skip:
                            nr["elementsSkipped"] += 1
                            continue
                        elif policy == NullPolicy.use_default:
                            value = ndata.get("default", "")

                    nr["elementsProcessed"] += 1
                    try:
                        written = write_property(
                            ifc_file,
                            element,
                            pset,
                            prop_name,
                            value,
                            create_pset_if_missing=options.create_pset_if_missing,
                            overwrite_existing=options.overwrite_existing,
                        )
                        if written:
                            nr["elementsWritten"] += 1
                        else:
                            nr["elementsSkipped"] += 1
                    except Exception as exc:
                        nr["warnings"].append(str(exc))
                        nr["elementsSkipped"] += 1

                computed[(node.id, "value")] = True  # pass-through sentinel

            elif ntype == "Filter":
                result = eval_filter(ndata, legacy_inputs, element)
                computed[(node.id, "value")] = result
                if result is None:
                    element_filtered = True
                    break  # skip remaining nodes for this element

            elif ntype == "Preview":
                # For preview, get the single input value
                value = legacy_inputs[0] if legacy_inputs else None
                value = eval_preview(ndata, [value] if value else [], element)
                computed[(node.id, "value")] = value
                nr["elementsProcessed"] += 1
                sample_limit = int(ndata.get("maxSamples", DEFAULT_SAMPLE_LIMIT))
                if len(nr["sampleValues"]) < sample_limit and value is not None:
                    nr["sampleValues"].append(str(value))

            else:
                evaluator = NODE_EVALUATORS.get(ntype)
                if evaluator:
                    result = evaluator(ndata, legacy_inputs, element)
                    computed[(node.id, "value")] = result
                    nr["elementsProcessed"] += 1
                    if len(nr["sampleValues"]) < DEFAULT_SAMPLE_LIMIT and result is not None:
                        nr["sampleValues"].append(str(result))

    # 5. Save
    ifc_file.write(output_path)

    return {
        "status": "ok",
        "message": f"Processed {len(elements)} elements.",
        "nodeResults": list(node_results.values()),
        "downloadUrl": "",  # filled in by router
        "runId": "",        # filled in by router
    }
