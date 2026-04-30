mod types;
mod expand;

pub use types::*;

use std::collections::{HashMap, HashSet};
use std::path::Path;

use expand::{build_hybrid_nodes, compute_auto_expanded_dirs, EdgeInfo};

// Re-export for tests
pub use expand::is_path_expanded;

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

/// Extract edges from modules' dependencies: (from_source, resolved, dep_types, circular)
pub(crate) struct RawEdge {
    pub from: String,
    pub to: String,
    pub dep_types: Vec<String>,
    pub circular: bool,
}

fn extract_edges(modules: &[Module]) -> Vec<RawEdge> {
    let mut edges = Vec::new();
    for m in modules {
        for dep in &m.dependencies {
            edges.push(RawEdge {
                from: m.source.clone(),
                to: dep.resolved.clone(),
                dep_types: dep.dependency_types.clone(),
                circular: dep.circular.unwrap_or(false),
            });
        }
    }
    edges
}

fn compute_violation_counts(violations: &[ViolationInfo]) -> HashMap<String, u32> {
    let mut counts: HashMap<String, u32> = HashMap::new();
    for v in violations {
        *counts.entry(v.from.clone()).or_default() += 1;
        *counts.entry(v.to.clone()).or_default() += 1;
    }
    counts
}

fn aggregate_edges(
    edge_map: &HashMap<(String, String), EdgeInfo>,
    max_nodes: usize,
) -> Vec<GraphEdge> {
    let mut all_edges: Vec<GraphEdge> = edge_map
        .iter()
        .map(|((source, target), info)| {
            let edge_type = detect_edge_type(&info.dep_types);
            GraphEdge {
                source: source.clone(),
                target: target.clone(),
                edge_type,
                weight: info.count,
                circular: if info.has_circular { Some(true) } else { None },
            }
        })
        .collect();

    // Sort by weight descending and limit
    all_edges.sort_by(|a, b| b.weight.cmp(&a.weight));
    all_edges.truncate(max_nodes.min(10000));

    all_edges
}

fn detect_edge_type(dep_types: &[String]) -> EdgeType {
    if dep_types.iter().any(|t| t == "npm" || t == "node_modules") {
        EdgeType::Npm
    } else if dep_types.iter().any(|t| t == "core") {
        EdgeType::Core
    } else if dep_types.iter().any(|t| t == "dynamic") {
        EdgeType::Dynamic
    } else {
        EdgeType::Local
    }
}

#[cfg(test)]
mod lib_test;