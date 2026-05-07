#![warn(unreachable_pub)]
use wasm_bindgen::prelude::*;
use std::collections::HashSet;

mod aggregate;
mod types;
mod violations;

use types::*;
use aggregate::{aggregate_edges, build_hybrid_nodes, compute_auto_expanded_dirs, extract_edges};
use violations::{build_edge_violations, compute_violation_counts, parse_violations};

/// WASM entry point: aggregate dependency-cruiser JSON output
///
/// @param content - dependency-cruiser JSON string
/// @param maxNodes - maximum number of nodes in the output graph
/// @param expandedDirs - optional list of directory paths to expand (show files)
/// @returns ProcessedGraph with nodes, edges, combos, meta, and violations

#[wasm_bindgen]
pub fn aggregate(
    content: &str,
    #[wasm_bindgen(js_name = maxNodes)] max_nodes: usize,
    #[wasm_bindgen(js_name = expandedDirs)] expanded_dirs: Option<Vec<String>>,
) -> Result<ProcessedGraph, JsError> {
    let cruise: CruiseResult = serde_json::from_str(content)
        .map_err(|e: serde_json::Error| JsError::new(&format!("Invalid JSON: {}", e)))?;

    // Collect all modules
    let modules = cruise.modules.unwrap_or_default();
    let module_count = modules.len();

    // Extract edges from modules' dependencies (source is the module, resolved is the target)
    let all_edges = extract_edges(&modules);

    // Collect and parse violations from summary
    let raw_violations = cruise
        .summary
        .as_ref()
        .and_then(|s| s.violations.as_ref())
        .map(|v| v.as_slice())
        .unwrap_or(&[]);
    let violation_count = raw_violations.len();

    let violations = parse_violations(raw_violations);

    // Count violation per module
    let violation_counts = compute_violation_counts(&violations);

    // Build edge-to-violations mapping
    let edge_violations = build_edge_violations(&violations);

    // Determine expanded directories - either provided or auto-computed
    let expanded =
        expanded_dirs.unwrap_or_else(|| compute_auto_expanded_dirs(&modules, &violation_counts));
    let expanded_set: HashSet<&str> = expanded.iter().map(|s| s.as_str()).collect();

    // Build nodes using hybrid aggregation based on expanded_dirs
    let (nodes, combos, node_lookup) =
        build_hybrid_nodes(&modules, &violation_counts, &expanded_set);

    // Aggregate edges
    let edges = aggregate_edges(&all_edges, &node_lookup, &edge_violations, max_nodes);

    let meta = GraphMeta {
        original_node_count: module_count,
        aggregated_node_count: nodes.len(),
        total_violations: violation_count,
        expanded_dirs: Some(expanded),
    };

    Ok(ProcessedGraph {
        nodes,
        edges,
        combos,
        meta,
        violations,
    })
}

#[cfg(test)]
#[path = "lib_test.rs"]
mod lib_test;
