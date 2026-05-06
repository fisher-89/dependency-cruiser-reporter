mod aggregate;
mod types;
mod violations;

pub use types::*;

use aggregate::{aggregate_edges, build_hybrid_nodes, compute_auto_expanded_dirs, extract_edges};
use std::collections::HashSet;
use std::path::Path;

use violations::{build_edge_violations, compute_violation_counts, parse_violations};

// Re-export for tests
pub use aggregate::is_path_expanded;

/// Core aggregation logic - parses JSON string and produces aggregated graph
///
/// This is the shared implementation used by both WASM and binary targets.
fn aggregate_from_str(
    content: &str,
    max_nodes: usize,
    expanded_dirs: Option<Vec<String>>,
) -> Result<ProcessedGraph, DcrError> {
    let cruise: CruiseResult = serde_json::from_str(content)
        .map_err(|e| DcrError::InvalidInput(format!("Invalid JSON: {}", e)))?;

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

/// Parse dependency-cruiser JSON and aggregate graph (file-based, for binary target)
///
/// When `expanded_dirs` is provided, directories in that set are expanded (show files),
/// while directories not in that set are collapsed (show as single directory node).
/// When `expanded_dirs` is None, it's auto-computed based on module count thresholds.
pub fn parse_and_aggregate(
    input: &Path,
    max_nodes: usize,
    expanded_dirs: Option<Vec<String>>,
) -> Result<ProcessedGraph, DcrError> {
    let content = std::fs::read_to_string(input)?;
    aggregate_from_str(&content, max_nodes, expanded_dirs)
}

#[cfg(test)]
mod lib_test;
