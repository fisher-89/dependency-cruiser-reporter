use crate::types::{EdgeType, GraphEdge, Module};
use std::collections::HashMap;

use super::hybrid::EdgeInfo;

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

/// Aggregate edge map into sorted, truncated GraphEdge list.
pub fn aggregate_edges(
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
