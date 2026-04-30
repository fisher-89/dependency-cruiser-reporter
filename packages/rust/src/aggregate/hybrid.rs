use crate::types::{AggregationLevel, GraphNode, Module, NodeType};
use std::collections::{HashMap, HashSet};

use super::edges::RawEdge;

pub struct EdgeInfo {
    pub dep_types: Vec<String>,
    pub count: u32,
    pub has_circular: bool,
}

/// Build nodes using hybrid aggregation: directories in expanded_set show files,
/// directories not in expanded_set are collapsed to directory nodes.
pub fn build_hybrid_nodes(
    modules: &[Module],
    edges: &[RawEdge],
    violation_counts: &HashMap<String, u32>,
    expanded_set: &HashSet<&str>,
) -> (Vec<GraphNode>, HashMap<(String, String), EdgeInfo>, AggregationLevel) {
    // Determine aggregation level from expanded_set
    let agg_level = if expanded_set.is_empty() {
        AggregationLevel::Package
    } else {
        let all_expanded = modules.iter().all(|m| {
            let parent = get_parent_directory(&m.source);
            parent.is_empty() || is_path_expanded(&m.source, expanded_set)
        });
        if all_expanded {
            AggregationLevel::File
        } else {
            AggregationLevel::Directory
        }
    };

    // Map each module source to its node ID (file path or directory path)
    let mut node_lookup: HashMap<String, String> = HashMap::new();
    let mut dir_groups: HashMap<String, Vec<String>> = HashMap::new();

    for m in modules {
        if is_path_expanded(&m.source, expanded_set) {
            node_lookup.insert(m.source.clone(), m.source.clone());
        } else {
            let dir_key = find_closest_unexpanded_ancestor(&m.source, expanded_set);
            dir_groups
                .entry(dir_key.clone())
                .or_default()
                .push(m.source.clone());
            node_lookup.insert(m.source.clone(), dir_key);
        }
    }

    // Build nodes
    let mut nodes: Vec<GraphNode> = Vec::new();

    // File nodes (expanded directories)
    let mut file_sources: HashSet<String> = HashSet::new();
    for m in modules {
        let node_id = &node_lookup[&m.source];
        if *node_id == m.source && !file_sources.contains(&m.source) {
            file_sources.insert(m.source.clone());
            nodes.push(GraphNode {
                id: m.source.clone(),
                label: m.source.split('/').last().unwrap_or(&m.source).to_string(),
                node_type: NodeType::File,
                path: Some(m.source.clone()),
                violation_count: violation_counts.get(&m.source).copied().unwrap_or(0),
                orphan: m.orphan,
                children: None,
            });
        }
    }

    // Directory nodes (collapsed directories)
    for (dir, children) in &dir_groups {
        let vc: u32 = children
            .iter()
            .filter_map(|c| violation_counts.get(c))
            .sum();
        nodes.push(GraphNode {
            id: dir.clone(),
            label: dir.split('/').last().unwrap_or(dir).to_string(),
            node_type: NodeType::Directory,
            path: Some(dir.clone()),
            violation_count: vc,
            orphan: None,
            children: Some(children.clone()),
        });
    }

    // Build edge map
    let mut edge_map: HashMap<(String, String), EdgeInfo> = HashMap::new();
    for e in edges {
        let src_node = node_lookup
            .get(&e.from)
            .cloned()
            .unwrap_or_else(|| e.from.clone());
        let tgt_node = node_lookup
            .get(&e.to)
            .cloned()
            .unwrap_or_else(|| e.to.clone());
        if src_node != tgt_node {
            let info = edge_map
                .entry((src_node, tgt_node))
                .or_insert(EdgeInfo {
                    dep_types: Vec::new(),
                    count: 0,
                    has_circular: false,
                });
            info.dep_types.extend(e.dep_types.clone());
            info.count += 1;
            if e.circular {
                info.has_circular = true;
            }
        }
    }

    (nodes, edge_map, agg_level)
}

/// Check if a module path should be expanded (its parent dir or any ancestor is in expanded_set).
pub fn is_path_expanded(path: &str, expanded_set: &HashSet<&str>) -> bool {
    if expanded_set.contains("") {
        return true;
    }
    let parts: Vec<&str> = path.split('/').collect();
    for i in 1..parts.len() {
        let dir: String = parts[..i].join("/");
        if expanded_set.contains(dir.as_str()) {
            return true;
        }
    }
    false
}

fn get_parent_directory(path: &str) -> String {
    path.rsplitn(2, '/').nth(1).unwrap_or("").to_string()
}

/// Find the lowest ancestor directory that is NOT expanded but whose parent IS expanded.
fn find_closest_unexpanded_ancestor(path: &str, expanded_set: &HashSet<&str>) -> String {
    let parts: Vec<&str> = path.split('/').collect();
    for i in 1..parts.len() {
        let ancestor = parts[..i].join("/");
        if !expanded_set.contains(ancestor.as_str()) {
            return if ancestor.is_empty() { "root".to_string() } else { ancestor };
        }
    }
    "root".to_string()
}
