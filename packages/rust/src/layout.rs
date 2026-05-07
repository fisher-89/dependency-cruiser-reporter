use crate::types::{GraphCombo, GraphNode, Rect};

const NODE_SIZE: f32 = 20.0;
const COMBO_PADDING: f32 = 20.0;
const GAP: f32 = 30.0;

/// Compute layout for all nodes and combos.
///
/// Arranges children of each combo in a grid, bottom-up (deepest first).
/// Nodes are sized NODE_SIZE×NODE_SIZE; combos enclose children + COMBO_PADDING.
pub(crate) fn compute_layout(nodes: &mut [GraphNode], combos: &mut [GraphCombo]) {
    if nodes.is_empty() && combos.is_empty() {
        return;
    }

    // Build index: combo_id -> Vec of child node indices
    let mut node_children: std::collections::HashMap<String, Vec<usize>> =
        std::collections::HashMap::new();
    for (i, n) in nodes.iter().enumerate() {
        if let Some(ref combo_id) = n.combo {
            node_children
                .entry(combo_id.clone())
                .or_default()
                .push(i);
        }
    }

    // Build index: combo_id -> Vec of child combo indices
    let mut combo_children: std::collections::HashMap<String, Vec<usize>> =
        std::collections::HashMap::new();
    for (i, c) in combos.iter().enumerate() {
        if let Some(ref parent_id) = c.combo {
            combo_children
                .entry(parent_id.clone())
                .or_default()
                .push(i);
        }
    }

    // Sort combos by depth (deepest first) for bottom-up processing
    // Depth = number of path segments after "combo:" prefix
    // Special case: "combo:root" has depth 0
    fn combo_depth(id: &str) -> usize {
        id.strip_prefix("combo:")
            .map(|s| if s == "root" { 0 } else { s.split('/').count() })
            .unwrap_or(0)
    }
    let mut sorted_indices: Vec<usize> = (0..combos.len()).collect();
    sorted_indices.sort_by(|&a, &b| {
        let depth_a = combo_depth(&combos[a].id);
        let depth_b = combo_depth(&combos[b].id);
        depth_b.cmp(&depth_a) // deepest first
    });

    // Process each combo bottom-up
    for combo_idx in &sorted_indices {
        let combo_id = combos[*combo_idx].id.clone();

        // Collect direct children: (index, width, height)
        // Nodes first, then sub-combos — sorted by id for determinism
        let mut child_nodes: Vec<usize> = node_children
            .get(&combo_id)
            .cloned()
            .unwrap_or_default();
        let mut child_combos: Vec<usize> = combo_children
            .get(&combo_id)
            .cloned()
            .unwrap_or_default();

        // Sort by id for deterministic layout
        child_nodes.sort_by(|&a, &b| nodes[a].id.cmp(&nodes[b].id));
        child_combos.sort_by(|&a, &b| combos[a].id.cmp(&combos[b].id));

        let total_children = child_nodes.len() + child_combos.len();
        if total_children == 0 {
            // Empty combo: still give it a minimal rect
            combos[*combo_idx].rect = Some(Rect {
                top: 0.0,
                left: 0.0,
                width: 2.0 * COMBO_PADDING,
                height: 2.0 * COMBO_PADDING,
            });
            continue;
        }

        // Grid layout: ceil(sqrt(n)) columns
        let cols = (total_children as f32).sqrt().ceil() as usize;
        let rows = (total_children + cols - 1) / cols;

        // Compute max child size per column/row for non-uniform children
        // First pass: determine child widths and heights
        let mut child_sizes: Vec<(f32, f32)> = Vec::with_capacity(total_children);

        for _ni in &child_nodes {
            child_sizes.push((NODE_SIZE, NODE_SIZE));
        }
        for &ci in &child_combos {
            let (w, h) = if let Some(ref rect) = combos[ci].rect {
                (rect.width, rect.height)
            } else {
                (NODE_SIZE, NODE_SIZE)
            };
            child_sizes.push((w, h));
        }

        // Compute column widths and row heights
        let mut col_widths = vec![0.0f32; cols];
        let mut row_heights = vec![0.0f32; rows];

        for (i, &(w, h)) in child_sizes.iter().enumerate() {
            let col = i % cols;
            let row = i / cols;
            col_widths[col] = col_widths[col].max(w);
            row_heights[row] = row_heights[row].max(h);
        }

        let total_width: f32 = col_widths.iter().sum::<f32>() + (cols.saturating_sub(1)) as f32 * GAP;
        let total_height: f32 =
            row_heights.iter().sum::<f32>() + (rows.saturating_sub(1)) as f32 * GAP;

        let combo_width = total_width + 2.0 * COMBO_PADDING;
        let combo_height = total_height + 2.0 * COMBO_PADDING;

        // We need the combo's position first. For the root combo, it's (0, 0).
        // For others, we'll set children relative positions and fix combo position later.
        // Use (0, 0) as combo top-left for now; parent will offset later.
        let combo_left = 0.0f32;
        let combo_top = 0.0f32;

        // Position children
        let mut child_idx = 0;

        for row in 0..rows {
            let y_offset = combo_top + COMBO_PADDING
                + (0..row).map(|r| row_heights[r]).sum::<f32>()
                + row as f32 * GAP;

            for col in 0..cols {
                if child_idx >= total_children {
                    break;
                }

                let child_left = combo_left + COMBO_PADDING
                    + (0..col).map(|c| col_widths[c]).sum::<f32>()
                    + col as f32 * GAP;

                let (w, h) = child_sizes[child_idx];

                let node_count = child_nodes.len();
                if child_idx < node_count {
                    // It's a node
                    let ni = child_nodes[child_idx];
                    nodes[ni].rect = Some(Rect {
                        top: y_offset,
                        left: child_left,
                        width: w,
                        height: h,
                    });
                } else {
                    // It's a sub-combo
                    let ci = child_combos[child_idx - node_count];
                    let (old_left, old_top) = combos[ci]
                        .rect
                        .as_ref()
                        .map(|r| (r.left, r.top))
                        .unwrap_or((0.0, 0.0));
                    let dx = child_left - old_left;
                    let dy = y_offset - old_top;
                    if let Some(ref mut sub_rect) = combos[ci].rect {
                        sub_rect.left = child_left;
                        sub_rect.top = y_offset;
                    } else {
                        combos[ci].rect = Some(Rect {
                            top: y_offset,
                            left: child_left,
                            width: w,
                            height: h,
                        });
                    }
                    // Also offset all nodes and combos inside this sub-combo
                    offset_subtree(ci, dx, dy, nodes, combos);
                }

                child_idx += 1;
            }
        }

        combos[*combo_idx].rect = Some(Rect {
            top: combo_top,
            left: combo_left,
            width: combo_width,
            height: combo_height,
        });
    }
}

/// Recursively offset all nodes and combos within a combo by (dx, dy).
fn offset_subtree(
    combo_idx: usize,
    dx: f32,
    dy: f32,
    nodes: &mut [GraphNode],
    combos: &mut [GraphCombo],
) {
    let combo_id = combos[combo_idx].id.clone();

    // Offset all nodes in this combo
    for n in nodes.iter_mut() {
        if n.combo.as_ref() == Some(&combo_id) {
            if let Some(ref mut rect) = n.rect {
                rect.left += dx;
                rect.top += dy;
            }
        }
    }

    // Collect sub-combo indices first to avoid borrow conflicts
    let sub_indices: Vec<usize> = combos
        .iter()
        .enumerate()
        .filter(|(_, c)| c.combo.as_ref() == Some(&combo_id))
        .map(|(i, _)| i)
        .collect();

    for i in sub_indices {
        if let Some(ref mut rect) = combos[i].rect {
            rect.left += dx;
            rect.top += dy;
        }
        offset_subtree(i, dx, dy, nodes, combos);
    }
}

#[cfg(test)]
#[path = "layout_test.rs"]
mod layout_test;
