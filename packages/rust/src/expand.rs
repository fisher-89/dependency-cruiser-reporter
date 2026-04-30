use crate::types::{AggregationLevel, GraphNode, Module, NodeType};
use std::collections::{HashMap, HashSet};

/// Target maximum number of nodes to display
pub const TARGET_NODE_BUDGET: usize = 200;
/// Maximum direct children per directory before we refuse to expand it
const MAX_DIRECT_CHILDREN: usize = 50;

/// Auto-compute expanded_dirs using level-by-level transaction-based algorithm.
/// - Expands directories by depth level (depth 1 first, then depth 2, etc.)
/// - Each level is a "transaction": try all candidates, rollback if budget exceeded
/// - Guarantees total node count stays within TARGET_NODE_BUDGET
/// - Prioritizes directories with violations within each level
pub fn compute_auto_expanded_dirs(
    modules: &[Module],
    violation_counts: &HashMap<String, u32>,
) -> Vec<String> {
    if modules.is_empty() {
        return vec![];
    }

    // If total modules fit within budget, expand everything
    if modules.len() <= TARGET_NODE_BUDGET {
        let mut dirs: HashSet<String> = HashSet::new();
        dirs.insert("".to_string());
        for m in modules {
            let parts: Vec<&str> = m.source.split('/').collect();
            for i in 1..parts.len() {
                dirs.insert(parts[..i].join("/"));
            }
        }
        let mut result: Vec<String> = dirs.into_iter().collect();
        result.sort();
        return result;
    }

    // Pre-compute total descendants for each directory (all files under that path)
    let dir_total_descendants: HashMap<String, usize> = compute_total_descendants(modules);

    // Build: directory -> direct children (files + immediate subdirectories)
    let mut dir_direct_children: HashMap<String, HashSet<String>> = HashMap::new();
    // Build: directory -> violation sum
    let mut dir_violation_sum: HashMap<String, u32> = HashMap::new();

    for m in modules {
        let parts: Vec<&str> = m.source.split('/').collect();
        // Each file contributes to its immediate parent's direct children
        if parts.len() > 1 {
            let parent = parts[..parts.len() - 1].join("/");
            dir_direct_children
                .entry(parent)
                .or_default()
                .insert(m.source.clone());
        }
        // Add subdirectories as children of ancestor directories
        for i in 1..parts.len() - 1 {
            let ancestor = parts[..i].join("/");
            let child_dir = parts[..i + 1].join("/");
            dir_direct_children
                .entry(ancestor)
                .or_default()
                .insert(child_dir);
        }
        // Accumulate violations for all ancestors
        let vc = violation_counts.get(&m.source).copied().unwrap_or(0);
        for i in 1..parts.len() {
            let ancestor = parts[..i].join("/");
            *dir_violation_sum.entry(ancestor).or_default() += vc;
        }
    }

    // Compute baseline: one node per top-level directory
    let mut top_level_dirs: HashSet<String> = HashSet::new();
    for m in modules {
        let parts: Vec<&str> = m.source.split('/').collect();
        if parts.len() > 1 {
            top_level_dirs.insert(parts[0].to_string());
        }
    }
    let baseline_nodes = if top_level_dirs.is_empty() {
        1
    } else {
        top_level_dirs.len()
    };

    // Group directories by depth level
    // depth 1 = top-level dirs like "src", "packages"
    // depth 2 = second-level dirs like "src/utils", "packages/cli"
    let mut dirs_by_depth: HashMap<usize, Vec<String>> = HashMap::new();
    for dir in dir_direct_children.keys() {
        let depth = dir.matches('/').count() + 1;
        dirs_by_depth.entry(depth).or_default().push(dir.clone());
    }

    let max_depth = dirs_by_depth.keys().max().copied().unwrap_or(0);

    // Level-by-level expansion with transaction semantics
    let mut expanded: HashSet<String> = HashSet::new();
    let mut current_node_count = baseline_nodes;
    // Track all depth levels that were skipped due to budget
    // This allows deeper directories to expand even if their ancestors couldn't
    let mut skipped_depths: HashSet<usize> = HashSet::new();

    for depth in 1..=max_depth {
        // Get candidates at this depth
        let candidates: Vec<String> = dirs_by_depth
            .get(&depth)
            .map(|v| v.as_slice())
            .unwrap_or(&[])
            .iter()
            .filter(|dir| {
                // Skip directories with too many direct children
                let children_count = dir_direct_children.get(*dir).map(|s| s.len()).unwrap_or(0);
                if children_count > MAX_DIRECT_CHILDREN {
                    return false;
                }

                // Parent must be expanded, OR parent depth was skipped due to budget
                // This allows expanding subdirectories even if ancestors couldn't be expanded
                let parts: Vec<&str> = dir.split('/').collect();
                if parts.len() == 1 {
                    return true; // Top-level dirs always eligible
                }
                let parent = parts[..parts.len() - 1].join("/");
                if expanded.contains(&parent) {
                    return true;
                }
                // Allow if any ancestor depth was skipped due to budget (chain of skipped depths)
                let parent_depth = parent.matches('/').count() + 1;
                if skipped_depths.contains(&parent_depth) {
                    return true;
                }
                false
            })
            .cloned()
            .collect();

        if candidates.is_empty() {
            continue;
        }

        // Sort candidates by violations DESC (prioritize high-violation dirs)
        let mut sorted_candidates: Vec<(String, u32)> = candidates
            .iter()
            .map(|dir| {
                let violations = dir_violation_sum.get(dir).copied().unwrap_or(0);
                (dir.clone(), violations)
            })
            .collect();
        sorted_candidates.sort_by(|a, b| b.1.cmp(&a.1));

        // === BEGIN TRANSACTION: save current state ===
        let saved_expanded = expanded.clone();
        let saved_node_count = current_node_count;

        // Try expanding each candidate at this depth level
        for (dir, _violations) in &sorted_candidates {
            // Check if any ancestor was skipped (not expanded due to budget)
            let parts: Vec<&str> = dir.split('/').collect();
            let ancestor_skipped = (1..parts.len())
                .any(|i| skipped_depths.contains(&(i + 1)));

            let total_desc = dir_total_descendants.get(dir).copied().unwrap_or(0);

            // Calculate already-expanded descendants under this dir
            let already_expanded_count: usize = expanded
                .iter()
                .filter(|e| e.starts_with(&format!("{}/", dir)))
                .map(|e| dir_total_descendants.get(e.as_str()).copied().unwrap_or(0))
                .sum();

            let cost = if ancestor_skipped {
                // When ancestors were skipped, this dir's files are collapsed
                // into an ancestor node. Expanding splits them out:
                // - dir node itself: +1
                // - file nodes: +total_descendants (already_expanded already split out)
                // - ancestor node stays (still has other files), no removal
                total_desc
                    .saturating_sub(already_expanded_count)
                    .saturating_add(1)
            } else {
                // Normal case: dir replaces its own collapsed node
                // Cost = total_descendants - 1 (dir node) - already expanded
                total_desc
                    .saturating_sub(already_expanded_count)
                    .saturating_sub(1)
            };

            expanded.insert(dir.clone());
            current_node_count += cost;
        }

        // === CHECK BUDGET: rollback if exceeded ===
        if current_node_count > TARGET_NODE_BUDGET {
            // ROLLBACK: restore previous state and mark this depth as skipped
            expanded = saved_expanded;
            current_node_count = saved_node_count;
            skipped_depths.insert(depth);
            // Continue to next depth instead of breaking
            continue;
        }
        // === COMMIT: keep expanded state, continue to next depth ===
    }

    let mut result: Vec<String> = expanded.into_iter().collect();
    result.sort();
    result
}

/// Compute total descendants (all files) for each directory using path prefix matching.
fn compute_total_descendants(modules: &[Module]) -> HashMap<String, usize> {
    let mut counts: HashMap<String, usize> = HashMap::new();

    // Sort modules by source path for efficient prefix matching
    let mut sorted_sources: Vec<&str> = modules.iter().map(|m| m.source.as_str()).collect();
    sorted_sources.sort();

    // Build all directory paths
    let mut all_dirs: HashSet<String> = HashSet::new();
    for source in &sorted_sources {
        let parts: Vec<&str> = source.split('/').collect();
        for i in 1..parts.len() {
            all_dirs.insert(parts[..i].join("/"));
        }
    }

    // For each directory, count files that start with "dir/" or equal "dir"
    for dir in &all_dirs {
        let prefix = format!("{}/", dir);
        let count = sorted_sources
            .iter()
            .filter(|s| *s == dir || s.starts_with(&prefix))
            .count();
        counts.insert(dir.clone(), count);
    }

    counts
}

/// Build nodes using hybrid aggregation: directories in expanded_set show files,
/// directories not in expanded_set are collapsed to directory nodes.
pub fn build_hybrid_nodes(
    modules: &[Module],
    edges: &[super::RawEdge],
    violation_counts: &HashMap<String, u32>,
    expanded_set: &HashSet<&str>,
) -> (Vec<GraphNode>, HashMap<(String, String), EdgeInfo>, AggregationLevel) {
    // Determine aggregation level from expanded_set
    let agg_level = if expanded_set.is_empty() {
        AggregationLevel::Package
    } else {
        // Check if all directories are expanded (file level)
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
            // Expanded: module becomes its own file node
            node_lookup.insert(m.source.clone(), m.source.clone());
        } else {
            // Collapsed: group by closest unexpanded ancestor directory
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
    // Empty string means root directory is expanded — all top-level files expand
    if expanded_set.contains("") {
        return true;
    }
    let parts: Vec<&str> = path.split('/').collect();
    // Check if any ancestor directory of this path is expanded
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
/// This gives the right level of collapsing: expanded dirs show files inside,
/// and the first unexpanded ancestor becomes the collapsed node.
fn find_closest_unexpanded_ancestor(path: &str, expanded_set: &HashSet<&str>) -> String {
    let parts: Vec<&str> = path.split('/').collect();
    // Walk from top to bottom, find the first ancestor that's not expanded
    // but whose parent is expanded (or is a top-level dir)
    for i in 1..parts.len() {
        let ancestor = parts[..i].join("/");
        if !expanded_set.contains(ancestor.as_str()) {
            return if ancestor.is_empty() { "root".to_string() } else { ancestor };
        }
    }
    // All ancestors are expanded — this shouldn't happen since is_path_expanded
    // returned false, but handle it gracefully
    "root".to_string()
}

pub struct EdgeInfo {
    pub dep_types: Vec<String>,
    pub count: u32,
    pub has_circular: bool,
}
