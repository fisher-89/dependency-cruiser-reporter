use crate::types::Module;
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
    let mut dirs_by_depth: HashMap<usize, Vec<String>> = HashMap::new();
    for dir in dir_direct_children.keys() {
        let depth = dir.matches('/').count() + 1;
        dirs_by_depth.entry(depth).or_default().push(dir.clone());
    }

    let max_depth = dirs_by_depth.keys().max().copied().unwrap_or(0);

    // Level-by-level expansion with transaction semantics
    let mut expanded: HashSet<String> = HashSet::new();
    let mut current_node_count = baseline_nodes;
    let mut skipped_depths: HashSet<usize> = HashSet::new();

    for depth in 1..=max_depth {
        let candidates: Vec<String> = dirs_by_depth
            .get(&depth)
            .map(|v| v.as_slice())
            .unwrap_or(&[])
            .iter()
            .filter(|dir| {
                let children_count = dir_direct_children.get(*dir).map(|s| s.len()).unwrap_or(0);
                if children_count > MAX_DIRECT_CHILDREN {
                    return false;
                }

                let parts: Vec<&str> = dir.split('/').collect();
                if parts.len() == 1 {
                    return true;
                }
                let parent = parts[..parts.len() - 1].join("/");
                if expanded.contains(&parent) {
                    return true;
                }
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

        for (dir, _violations) in &sorted_candidates {
            let parts: Vec<&str> = dir.split('/').collect();
            let ancestor_skipped = (1..parts.len())
                .any(|i| skipped_depths.contains(&(i + 1)));

            let total_desc = dir_total_descendants.get(dir).copied().unwrap_or(0);

            let already_expanded_count: usize = expanded
                .iter()
                .filter(|e| e.starts_with(&format!("{}/", dir)))
                .map(|e| dir_total_descendants.get(e.as_str()).copied().unwrap_or(0))
                .sum();

            let cost = if ancestor_skipped {
                total_desc
                    .saturating_sub(already_expanded_count)
                    .saturating_add(1)
            } else {
                total_desc
                    .saturating_sub(already_expanded_count)
                    .saturating_sub(1)
            };

            expanded.insert(dir.clone());
            current_node_count += cost;
        }

        // === CHECK BUDGET: rollback if exceeded ===
        if current_node_count > TARGET_NODE_BUDGET {
            expanded = saved_expanded;
            current_node_count = saved_node_count;
            skipped_depths.insert(depth);
            continue;
        }
    }

    let mut result: Vec<String> = expanded.into_iter().collect();
    result.sort();
    result
}

/// Compute total descendants (all files) for each directory using path prefix matching.
pub fn compute_total_descendants(modules: &[Module]) -> HashMap<String, usize> {
    let mut counts: HashMap<String, usize> = HashMap::new();

    let mut sorted_sources: Vec<&str> = modules.iter().map(|m| m.source.as_str()).collect();
    sorted_sources.sort();

    let mut all_dirs: HashSet<String> = HashSet::new();
    for source in &sorted_sources {
        let parts: Vec<&str> = source.split('/').collect();
        for i in 1..parts.len() {
            all_dirs.insert(parts[..i].join("/"));
        }
    }

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
