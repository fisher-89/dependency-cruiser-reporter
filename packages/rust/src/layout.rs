use crate::types::{GraphCombo, GraphNode, Rect};

const NODE_SIZE: f32 = 20.0;
const COMBO_PADDING: f32 = 20.0;
const GAP: f32 = 30.0;

/// Force layout parameters
const ITERATIONS: usize = 500;
const REPULSION_STRENGTH: f32 = 5000.0;
const ATTRACTION_STRENGTH: f32 = 0.001;
const COOLING_FACTOR: f32 = 0.98;

/// Compute layout for all nodes and combos.
///
/// Three-phase algorithm:
/// 1. Bottom-up sizing: compute combo sizes from children
/// 2. Force layout: position top-level combos without overlap
/// 3. Grid positioning: position children within each combo
pub(crate) fn compute_layout(nodes: &mut [GraphNode], combos: &mut [GraphCombo]) {
    if nodes.is_empty() && combos.is_empty() {
        return;
    }

    // Build indexes
    let node_children = build_node_children_index(nodes);
    let combo_children = build_combo_children_index(combos);

    // Phase 1: Compute combo sizes bottom-up (deepest first)
    let sorted_indices = sort_combos_by_depth(combos);
    for combo_idx in &sorted_indices {
        compute_combo_size(*combo_idx, &node_children, &combo_children, nodes, combos);
    }

    // Phase 2: Force layout for top-level combos
    let top_level_combos: Vec<usize> = combos
        .iter()
        .enumerate()
        .filter(|(_, c)| c.combo.is_none())
        .map(|(i, _)| i)
        .collect();

    if !top_level_combos.is_empty() {
        apply_force_layout(&top_level_combos, combos);
    }

    // Phase 3: Position children within each combo using grid (top-down)
    // Reverse sorted_indices to process from root to leaves
    let mut top_down_indices = sorted_indices.clone();
    top_down_indices.reverse();

    for combo_idx in &top_down_indices {
        position_children_in_combo(*combo_idx, &node_children, &combo_children, nodes, combos);
    }
}

/// Build index: combo_id -> Vec of child node indices
fn build_node_children_index(nodes: &[GraphNode]) -> std::collections::HashMap<String, Vec<usize>> {
    let mut index: std::collections::HashMap<String, Vec<usize>> = std::collections::HashMap::new();
    for (i, n) in nodes.iter().enumerate() {
        if let Some(ref combo_id) = n.combo {
            index.entry(combo_id.clone()).or_default().push(i);
        }
    }
    index
}

/// Build index: combo_id -> Vec of child combo indices
fn build_combo_children_index(combos: &[GraphCombo]) -> std::collections::HashMap<String, Vec<usize>> {
    let mut index: std::collections::HashMap<String, Vec<usize>> = std::collections::HashMap::new();
    for (i, c) in combos.iter().enumerate() {
        if let Some(ref parent_id) = c.combo {
            index.entry(parent_id.clone()).or_default().push(i);
        }
    }
    index
}

/// Sort combos by depth (deepest first) for bottom-up processing
fn sort_combos_by_depth(combos: &[GraphCombo]) -> Vec<usize> {
    fn combo_depth(id: &str) -> usize {
        id.strip_prefix("combo:")
            .map(|s| if s == "root" { 0 } else { s.split('/').count() })
            .unwrap_or(0)
    }

    let mut indices: Vec<usize> = (0..combos.len()).collect();
    indices.sort_by(|&a, &b| {
        let depth_a = combo_depth(&combos[a].id);
        let depth_b = combo_depth(&combos[b].id);
        depth_b.cmp(&depth_a) // deepest first
    });
    indices
}

/// Compute combo size from its children (grid layout)
fn compute_combo_size(
    combo_idx: usize,
    node_children: &std::collections::HashMap<String, Vec<usize>>,
    combo_children: &std::collections::HashMap<String, Vec<usize>>,
    nodes: &[GraphNode],
    combos: &mut [GraphCombo],
) {
    let combo_id = combos[combo_idx].id.clone();

    let mut child_nodes: Vec<usize> = node_children.get(&combo_id).cloned().unwrap_or_default();
    let mut child_combos: Vec<usize> = combo_children.get(&combo_id).cloned().unwrap_or_default();

    child_nodes.sort_by(|&a, &b| nodes[a].id.cmp(&nodes[b].id));
    child_combos.sort_by(|&a, &b| combos[a].id.cmp(&combos[b].id));

    let total_children = child_nodes.len() + child_combos.len();
    if total_children == 0 {
        combos[combo_idx].rect = Some(Rect {
            top: 0.0,
            left: 0.0,
            width: 2.0 * COMBO_PADDING,
            height: 2.0 * COMBO_PADDING,
        });
        return;
    }

    // Grid layout
    let cols = (total_children as f32).sqrt().ceil() as usize;
    let rows = (total_children + cols - 1) / cols;

    // Compute child sizes
    let mut child_sizes: Vec<(f32, f32)> = Vec::with_capacity(total_children);
    for _ in &child_nodes {
        child_sizes.push((NODE_SIZE * 2.0, NODE_SIZE));
    }
    for &ci in &child_combos {
        let (w, h) = combos[ci]
            .rect
            .as_ref()
            .map(|r| (r.width, r.height))
            .unwrap_or((NODE_SIZE * 2.0, NODE_SIZE));
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
    let total_height: f32 = row_heights.iter().sum::<f32>() + (rows.saturating_sub(1)) as f32 * GAP;

    combos[combo_idx].rect = Some(Rect {
        top: 0.0,
        left: 0.0,
        width: total_width + 2.0 * COMBO_PADDING,
        height: total_height + 2.0 * COMBO_PADDING,
    });
}

/// Apply force-directed layout to position combos without overlap
fn apply_force_layout(combo_indices: &[usize], combos: &mut [GraphCombo]) {
    if combo_indices.len() <= 1 {
        // Single combo: position at origin
        for &idx in combo_indices {
            if let Some(ref mut rect) = combos[idx].rect {
                rect.left = 0.0;
                rect.top = 0.0;
            }
        }
        return;
    }

    // Initialize positions in a circle with enough spacing
    let n = combo_indices.len();

    // Compute total area to estimate needed radius
    let total_area: f32 = combo_indices
        .iter()
        .map(|&idx| {
            combos[idx]
                .rect
                .as_ref()
                .map(|r| r.width * r.height)
                .unwrap_or(0.0)
        })
        .sum();
    let radius = (total_area / std::f32::consts::PI).sqrt().max(200.0);

    for (i, &idx) in combo_indices.iter().enumerate() {
        if let Some(ref mut rect) = combos[idx].rect {
            let angle = 2.0 * std::f32::consts::PI * i as f32 / n as f32;
            rect.left = radius * angle.cos();
            rect.top = radius * angle.sin();
        }
    }

    // Force simulation
    let mut temperature = 50.0;
    for _ in 0..ITERATIONS {
        // Compute forces
        let mut forces: Vec<(f32, f32)> = vec![(0.0, 0.0); n];

        for i in 0..n {
            for j in 0..n {
                if i == j {
                    continue;
                }

                let ri = combos[combo_indices[i]].rect.as_ref().unwrap();
                let rj = combos[combo_indices[j]].rect.as_ref().unwrap();

                // Centers
                let xi = ri.left + ri.width / 2.0;
                let yi = ri.top + ri.height / 2.0;
                let xj = rj.left + rj.width / 2.0;
                let yj = rj.top + rj.height / 2.0;

                let dx = xi - xj;
                let dy = yi - yj;
                let dist = (dx * dx + dy * dy).sqrt().max(1.0);

                // Compute overlap-based repulsion
                let overlap_x = (ri.width / 2.0 + rj.width / 2.0) - dx.abs();
                let overlap_y = (ri.height / 2.0 + rj.height / 2.0) - dy.abs();

                let repulsion = if overlap_x > 0.0 && overlap_y > 0.0 {
                    // Rectangles overlap - use stronger separation force
                    let overlap_area = overlap_x * overlap_y;
                    REPULSION_STRENGTH * (1.0 + overlap_area / 100.0) / dist
                } else {
                    // No overlap - use distance-based repulsion
                    REPULSION_STRENGTH / (dist * dist)
                };

                let fx = repulsion * dx / dist;
                let fy = repulsion * dy / dist;
                forces[i].0 += fx;
                forces[i].1 += fy;
            }

            // Attraction to center (keeps layout compact)
            let ri = combos[combo_indices[i]].rect.as_ref().unwrap();
            forces[i].0 -= ATTRACTION_STRENGTH * (ri.left + ri.width / 2.0);
            forces[i].1 -= ATTRACTION_STRENGTH * (ri.top + ri.height / 2.0);
        }

        // Apply forces with temperature annealing
        for (i, &idx) in combo_indices.iter().enumerate() {
            if let Some(ref mut rect) = combos[idx].rect {
                rect.left += forces[i].0 * temperature;
                rect.top += forces[i].1 * temperature;
            }
        }

        temperature *= COOLING_FACTOR;
    }

    // Post-processing: ensure no overlaps remain
    // If overlaps detected, apply additional separation
    for _ in 0..10 {
        let mut has_overlap = false;
        for i in 0..n {
            for j in (i + 1)..n {
                let ri = combos[combo_indices[i]].rect.as_ref().unwrap();
                let rj = combos[combo_indices[j]].rect.as_ref().unwrap();

                if is_overlapping(ri, rj) {
                    has_overlap = true;

                    // Centers
                    let xi = ri.left + ri.width / 2.0;
                    let yi = ri.top + ri.height / 2.0;
                    let xj = rj.left + rj.width / 2.0;
                    let yj = rj.top + rj.height / 2.0;

                    let dx = xi - xj;
                    let dy = yi - yj;
                    let dist = (dx * dx + dy * dy).sqrt().max(1.0);

                    // Compute required separation distance
                    let min_dist_x = (ri.width + rj.width) / 2.0 + GAP;
                    let min_dist_y = (ri.height + rj.height) / 2.0 + GAP;
                    let min_dist = min_dist_x.max(min_dist_y);

                    // Move each combo apart
                    let move_amount = (min_dist - dist) / 2.0 + GAP;
                    let idx_i = combo_indices[i];
                    let idx_j = combo_indices[j];

                    if let Some(ref mut rect) = combos[idx_i].rect {
                        rect.left += move_amount * dx / dist;
                        rect.top += move_amount * dy / dist;
                    }
                    if let Some(ref mut rect) = combos[idx_j].rect {
                        rect.left -= move_amount * dx / dist;
                        rect.top -= move_amount * dy / dist;
                    }
                }
            }
        }
        if !has_overlap {
            break;
        }
    }
}

/// Check if two rectangles overlap
fn is_overlapping(a: &Rect, b: &Rect) -> bool {
    a.left < b.left + b.width
        && a.left + a.width > b.left
        && a.top < b.top + b.height
        && a.top + a.height > b.top
}

/// Position children within a combo using grid layout
fn position_children_in_combo(
    combo_idx: usize,
    node_children: &std::collections::HashMap<String, Vec<usize>>,
    combo_children: &std::collections::HashMap<String, Vec<usize>>,
    nodes: &mut [GraphNode],
    combos: &mut [GraphCombo],
) {
    let combo_id = combos[combo_idx].id.clone();
    let combo_rect = combos[combo_idx].rect.clone().unwrap();

    let mut child_nodes: Vec<usize> = node_children.get(&combo_id).cloned().unwrap_or_default();
    let mut child_combos: Vec<usize> = combo_children.get(&combo_id).cloned().unwrap_or_default();

    child_nodes.sort_by(|&a, &b| nodes[a].id.cmp(&nodes[b].id));
    child_combos.sort_by(|&a, &b| combos[a].id.cmp(&combos[b].id));

    let total_children = child_nodes.len() + child_combos.len();
    if total_children == 0 {
        return;
    }

    // Collect child sizes
    let mut child_sizes: Vec<(f32, f32)> = Vec::with_capacity(total_children);
    for _ in &child_nodes {
        child_sizes.push((NODE_SIZE * 2.0, NODE_SIZE));
    }
    for &ci in &child_combos {
        let (w, h) = combos[ci]
            .rect
            .as_ref()
            .map(|r| (r.width, r.height))
            .unwrap_or((NODE_SIZE * 2.0, NODE_SIZE));
        child_sizes.push((w, h));
    }

    // Grid layout
    let cols = (total_children as f32).sqrt().ceil() as usize;
    let rows = (total_children + cols - 1) / cols;

    // Compute column widths and row heights
    let mut col_widths = vec![0.0f32; cols];
    let mut row_heights = vec![0.0f32; rows];

    for (i, &(w, h)) in child_sizes.iter().enumerate() {
        let col = i % cols;
        let row = i / cols;
        col_widths[col] = col_widths[col].max(w);
        row_heights[row] = row_heights[row].max(h);
    }

    // Position children in grid
    let mut child_idx = 0;
    let node_count = child_nodes.len();

    for row in 0..rows {
        let y_offset = combo_rect.top
            + COMBO_PADDING
            + (0..row).map(|r| row_heights[r]).sum::<f32>()
            + row as f32 * GAP;

        for col in 0..cols {
            if child_idx >= total_children {
                break;
            }

            let x_offset = combo_rect.left
                + COMBO_PADDING
                + (0..col).map(|c| col_widths[c]).sum::<f32>()
                + col as f32 * GAP;

            let (w, h) = child_sizes[child_idx];

            if child_idx < node_count {
                // It's a node
                let ni = child_nodes[child_idx];
                nodes[ni].rect = Some(Rect {
                    top: y_offset,
                    left: x_offset,
                    width: w,
                    height: h,
                });
            } else {
                // It's a sub-combo
                let ci = child_combos[child_idx - node_count];

                // Get old position and compute delta
                let (old_left, old_top) = combos[ci]
                    .rect
                    .as_ref()
                    .map(|r| (r.left, r.top))
                    .unwrap_or((0.0, 0.0));
                let dx = x_offset - old_left;
                let dy = y_offset - old_top;

                // Set new position for this combo
                if let Some(ref mut rect) = combos[ci].rect {
                    rect.left = x_offset;
                    rect.top = y_offset;
                }

                // Offset all nodes and combos inside this sub-combo
                offset_subtree(ci, dx, dy, nodes, combos);
            }

            child_idx += 1;
        }
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

    for n in nodes.iter_mut() {
        if n.combo.as_ref() == Some(&combo_id) {
            if let Some(ref mut rect) = n.rect {
                rect.left += dx;
                rect.top += dy;
            }
        }
    }

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
