use crate::types::{AggregationLevel, GraphCombo, GraphNode, Module, NodeType};
use std::collections::{HashMap, HashSet};

use super::edges::RawEdge;

const COMBO_PREFIX: &str = "combo:";

pub struct EdgeInfo {
    pub dep_types: Vec<String>,
    pub count: u32,
    pub has_circular: bool,
}

/// Build nodes and combos using hybrid aggregation: directories in expanded_set show files,
/// directories not in expanded_set are collapsed to directory nodes.
///
/// Combo IDs use a "combo:" prefix to avoid collision with node IDs.
/// Single-child combos are collapsed — the child is reassigned to the nearest
/// ancestor combo that has multiple children (or root).
pub fn build_hybrid_nodes(
    modules: &[Module],
    edges: &[RawEdge],
    violation_counts: &HashMap<String, u32>,
    expanded_set: &HashSet<&str>,
) -> (
    Vec<GraphNode>,
    Vec<GraphCombo>,
    HashMap<(String, String), EdgeInfo>,
    AggregationLevel,
) {
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

    let root_combo_id = format!("{}root", COMBO_PREFIX);

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

    // Build nodes with combo assignments
    let mut nodes: Vec<GraphNode> = Vec::new();
    let mut combo_map: HashMap<String, GraphCombo> = HashMap::new();

    // Ensure root combo exists
    combo_map.insert(
        root_combo_id.clone(),
        GraphCombo {
            id: root_combo_id.clone(),
            label: "/".to_string(),
            combo: None,
        },
    );

    // File nodes (expanded directories)
    let mut file_sources: HashSet<String> = HashSet::new();
    for m in modules {
        let node_id = &node_lookup[&m.source];
        if *node_id == m.source && !file_sources.contains(&m.source) {
            file_sources.insert(m.source.clone());

            // Compute combo for this node
            let path_parts: Vec<&str> = m.source.split('/').collect();
            let dir_parts: Vec<&str> = path_parts[..path_parts.len() - 1].to_vec();
            let combo_id = if dir_parts.is_empty() {
                root_combo_id.clone()
            } else {
                format!("{}{}", COMBO_PREFIX, dir_parts.join("/"))
            };

            // Register all ancestor combos
            for i in 1..=dir_parts.len() {
                let id = format!("{}{}", COMBO_PREFIX, dir_parts[..i].join("/"));
                if !combo_map.contains_key(&id) {
                    combo_map.insert(
                        id.clone(),
                        GraphCombo {
                            id: id.clone(),
                            label: dir_parts[i - 1].to_string(),
                            combo: if i > 1 {
                                Some(format!("{}{}", COMBO_PREFIX, dir_parts[..i - 1].join("/")))
                            } else {
                                Some(root_combo_id.clone())
                            },
                        },
                    );
                }
            }

            nodes.push(GraphNode {
                id: m.source.clone(),
                label: m.source.split('/').last().unwrap_or(&m.source).to_string(),
                node_type: NodeType::File,
                path: Some(m.source.clone()),
                violation_count: violation_counts.get(&m.source).copied().unwrap_or(0),
                orphan: m.orphan,
                children: None,
                combo: Some(combo_id),
            });
        }
    }

    // Directory nodes (collapsed directories)
    for (dir, children) in &dir_groups {
        let vc: u32 = children
            .iter()
            .filter_map(|c| violation_counts.get(c))
            .sum();

        // Compute combo for this directory node
        let path_parts: Vec<&str> = dir.split('/').collect();
        let combo_id = if path_parts.is_empty() || dir == "root" {
            root_combo_id.clone()
        } else {
            // Directory node goes into its parent directory's combo
            let parent_parts: Vec<&str> = path_parts[..path_parts.len() - 1].to_vec();
            if parent_parts.is_empty() {
                root_combo_id.clone()
            } else {
                format!("{}{}", COMBO_PREFIX, parent_parts.join("/"))
            }
        };

        // Register all ancestor combos
        let dir_parts: Vec<&str> = if dir == "root" { vec![] } else { dir.split('/').collect() };
        for i in 1..=dir_parts.len() {
            let id = format!("{}{}", COMBO_PREFIX, dir_parts[..i].join("/"));
            if !combo_map.contains_key(&id) {
                combo_map.insert(
                    id.clone(),
                    GraphCombo {
                        id: id.clone(),
                        label: dir_parts[i - 1].to_string(),
                        combo: if i > 1 {
                            Some(format!("{}{}", COMBO_PREFIX, dir_parts[..i - 1].join("/")))
                        } else {
                            Some(root_combo_id.clone())
                        },
                    },
                );
            }
        }

        nodes.push(GraphNode {
            id: dir.clone(),
            label: dir.split('/').last().unwrap_or(dir).to_string(),
            node_type: NodeType::Directory,
            path: Some(dir.clone()),
            violation_count: vc,
            orphan: None,
            children: Some(children.clone()),
            combo: Some(combo_id),
        });
    }

    // Collapse single-child combos
    // Count direct children (nodes + sub-combos) per combo
    let mut child_counts: HashMap<String, usize> = HashMap::new();
    for n in &nodes {
        if let Some(ref combo) = n.combo {
            *child_counts.entry(combo.clone()).or_insert(0) += 1;
        }
    }
    for c in combo_map.values() {
        if let Some(ref parent) = c.combo {
            *child_counts.entry(parent.clone()).or_insert(0) += 1;
        }
    }

    // Re-assign from deepest to shallowest: single-child combos collapse into parent
    let mut collapsed_combos: HashSet<String> = HashSet::new();

    // Sort combo IDs by depth (deepest first) - collect IDs to avoid borrow issues
    let mut sorted_combo_ids: Vec<String> = combo_map.keys().cloned().collect();
    sorted_combo_ids.sort_by(|a, b| {
        let depth_a = a.matches('/').count();
        let depth_b = b.matches('/').count();
        depth_b.cmp(&depth_a)
    });

    for combo_id in sorted_combo_ids {
        if combo_id == root_combo_id {
            continue;
        }
        if collapsed_combos.contains(&combo_id) {
            continue;
        }

        let combo = combo_map.get(&combo_id).cloned();
        let combo = match combo {
            Some(c) => c,
            None => continue,
        };

        let count = child_counts.get(&combo_id).copied().unwrap_or(0);
        if count > 1 {
            continue;
        }

        // Collapse: move nodes and sub-combos to parent
        let parent_id = combo.combo.clone().unwrap_or_else(|| root_combo_id.clone());
        collapsed_combos.insert(combo_id.clone());

        // Reassign nodes
        for n in &mut nodes {
            if n.combo.as_ref() == Some(&combo_id) {
                n.combo = Some(parent_id.clone());
            }
        }

        // Reassign sub-combos' parent
        for c in combo_map.values_mut() {
            if c.combo.as_ref() == Some(&combo_id) {
                c.combo = Some(parent_id.clone());
            }
        }

        // Update child counts
        *child_counts.entry(parent_id.clone()).or_insert(0) += count.saturating_sub(1);
    }

    // Filter out collapsed combos, sorted so parents appear before children
    let mut combos: Vec<GraphCombo> = combo_map
        .into_values()
        .filter(|c| !collapsed_combos.contains(&c.id))
        .collect();
    combos.sort_by(|a, b| {
        // Root has no parent, must come first
        if a.id == root_combo_id {
            return std::cmp::Ordering::Less;
        }
        if b.id == root_combo_id {
            return std::cmp::Ordering::Greater;
        }
        // Sort by path depth: fewer segments = shallower = first
        let depth_a = a.id[COMBO_PREFIX.len()..].split('/').count();
        let depth_b = b.id[COMBO_PREFIX.len()..].split('/').count();
        depth_a.cmp(&depth_b)
    });

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
            let info = edge_map.entry((src_node, tgt_node)).or_insert(EdgeInfo {
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

    (nodes, combos, edge_map, agg_level)
}

/// Check if a module path should be expanded (its parent dir or any ancestor is in expanded_set).
pub fn is_path_expanded(path: &str, expanded_set: &HashSet<&str>) -> bool {
    if expanded_set.contains("") {
        return true;
    }
    let parts: Vec<&str> = path.split('/').collect();
    let dir: String = parts[..parts.len() - 1].join("/");
    if expanded_set.contains(dir.as_str()) {
        return true;
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
            return if ancestor.is_empty() {
                "root".to_string()
            } else {
                ancestor
            };
        }
    }
    "root".to_string()
}
