use crate::types::{EdgeType, GraphEdge, Module};
use crate::violations::EdgeViolationCounts;
use std::collections::HashMap;

/// Aggregated edge information for building GraphEdge.
pub struct EdgeInfo {
    pub dep_types: Vec<String>,
    pub count: u32,
    pub has_circular: bool,
    pub error_count: u32,
    pub warn_count: u32,
    pub info_count: u32,
}

/// Internal representation of a raw edge extracted from dependency-cruiser data.
#[cfg_attr(test, allow(dead_code))]
pub struct RawEdge {
    pub from: String,
    pub to: String,
    pub dep_types: Vec<String>,
    pub circular: bool,
}

/// Extract edges from modules' dependencies.
pub fn extract_edges(modules: &[Module]) -> Vec<RawEdge> {
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

/// Aggregate edges from raw edges using node_lookup, producing sorted, truncated GraphEdge list.
pub fn aggregate_edges(
    raw_edges: &[RawEdge],
    node_lookup: &HashMap<String, String>,
    edge_violations: &HashMap<(String, String), EdgeViolationCounts>,
    max_nodes: usize,
) -> Vec<GraphEdge> {
    // Build edge map from raw edges
    let mut edge_map: HashMap<(String, String), EdgeInfo> = HashMap::new();
    for e in raw_edges {
        let src_node = node_lookup
            .get(&e.from)
            .cloned()
            .unwrap_or_else(|| e.from.clone());
        let tgt_node = node_lookup
            .get(&e.to)
            .cloned()
            .unwrap_or_else(|| e.to.clone());
        if src_node != tgt_node {
            let info = edge_map.entry((src_node.clone(), tgt_node.clone())).or_insert(EdgeInfo {
                dep_types: Vec::new(),
                count: 0,
                has_circular: false,
                error_count: 0,
                warn_count: 0,
                info_count: 0,
            });
            info.dep_types.extend(e.dep_types.clone());
            info.count += 1;
            if e.circular {
                info.has_circular = true;
            }
            if let Some(viol_counts) = edge_violations.get(&(e.from.clone(), e.to.clone())) {
                info.error_count += viol_counts.error_count;
                info.warn_count += viol_counts.warn_count;
                info.info_count += viol_counts.info_count;
            }
        }
    }

    // Convert to GraphEdge list
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
                error_count: if info.error_count > 0 { Some(info.error_count) } else { None },
                warn_count: if info.warn_count > 0 { Some(info.warn_count) } else { None },
                info_count: if info.info_count > 0 { Some(info.info_count) } else { None },
            }
        })
        .collect();

    all_edges.sort_by(|a, b| b.weight.cmp(&a.weight));
    all_edges.truncate(max_nodes.min(10000));

    all_edges
}

pub fn detect_edge_type(dep_types: &[String]) -> EdgeType {
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
