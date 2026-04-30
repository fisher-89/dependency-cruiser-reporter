mod aggregate;
mod types;

pub use types::*;

use aggregate::{
    aggregate_edges, build_hybrid_nodes, compute_auto_expanded_dirs, compute_violation_counts,
    extract_edges,
};
use std::collections::HashSet;
use std::path::Path;

// Re-export for tests
pub use aggregate::is_path_expanded;

/// Parse dependency-cruiser JSON and aggregate graph
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
    let cruise: CruiseResult = serde_json::from_str(&content)
        .map_err(|e| DcrError::InvalidInput(format!("Invalid JSON: {}", e)))?;

    // Collect all modules
    let modules = cruise.modules.unwrap_or_default();
    let module_count = modules.len();

    // Extract edges from modules' dependencies (source is the module, resolved is the target)
    let all_edges = extract_edges(&modules);

    // Collect violations from summary
    let raw_violations = cruise
        .summary
        .as_ref()
        .and_then(|s| s.violations.as_ref())
        .map(|v| v.as_slice())
        .unwrap_or(&[]);
    let violation_count = raw_violations.len();

    let violations: Vec<ViolationInfo> = raw_violations
        .iter()
        .filter_map(|v| {
            Some(ViolationInfo {
                from: v.from.clone()?,
                to: v.to.clone()?,
                rule: v
                    .rule
                    .as_ref()
                    .and_then(|r| r.name.clone())
                    .unwrap_or_default(),
                severity: v
                    .rule
                    .as_ref()
                    .and_then(|r| r.severity.clone())
                    .unwrap_or_else(|| "warn".to_string()),
                message: v.message.clone(),
            })
        })
        .collect();

    // Count violation per module
    let violation_counts = compute_violation_counts(&violations);

    // Determine expanded directories - either provided or auto-computed
    let expanded = expanded_dirs.unwrap_or_else(|| compute_auto_expanded_dirs(&modules, &violation_counts));
    let expanded_set: HashSet<&str> = expanded.iter().map(|s| s.as_str()).collect();

    // Build nodes using hybrid aggregation based on expanded_dirs
    let (nodes, edge_map, agg_level) =
        build_hybrid_nodes(&modules, &all_edges, &violation_counts, &expanded_set);

    // Aggregate edges
    let edges = aggregate_edges(&edge_map, max_nodes);

    let meta = GraphMeta {
        original_node_count: module_count,
        aggregated_node_count: nodes.len(),
        aggregation_level: agg_level,
        total_violations: violation_count,
        expanded_dirs: Some(expanded),
    };

    Ok(ProcessedGraph {
        nodes,
        edges,
        meta,
        violations,
    })
}

#[cfg(test)]
mod lib_test;
