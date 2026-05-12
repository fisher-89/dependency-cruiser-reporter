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
/// 3. Force layout positioning: position children within each combo using force-directed layout
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

    // Phase 3: Position children within each combo using force layout (top-down)
    // Reverse sorted_indices to process from root to leaves
    let mut top_down_indices = sorted_indices.clone();
    top_down_indices.reverse();

    for combo_idx in &top_down_indices {
        position_children_in_combo(*combo_idx, &node_children, &combo_children, nodes, combos);
    }

    // Phase 4: Re-resolve sibling combo overlaps at all levels after Phase 3 may have expanded combos
    // Process top-down: for each combo, resolve overlaps among its direct child combos
    for combo_idx in &top_down_indices {
        let combo_id = combos[*combo_idx].id.clone();
        let child_combos: Vec<usize> = combo_children
            .get(&combo_id)
            .cloned()
            .unwrap_or_default();
        if child_combos.len() > 1 {
            // Save positions before overlap resolution
            let positions_before: Vec<(f32, f32)> = child_combos
                .iter()
                .map(|&ci| {
                    combos[ci]
                        .rect
                        .as_ref()
                        .map(|r| (r.left, r.top))
                        .unwrap_or((0.0, 0.0))
                })
                .collect();

            resolve_overlaps(&child_combos, combos);

            // Offset subtrees for combos that moved
            for (i, &ci) in child_combos.iter().enumerate() {
                let (old_left, old_top) = positions_before[i];
                let (new_left, new_top) = combos[ci]
                    .rect
                    .as_ref()
                    .map(|r| (r.left, r.top))
                    .unwrap_or((0.0, 0.0));
                let dx = new_left - old_left;
                let dy = new_top - old_top;
                if dx.abs() > 1e-6 || dy.abs() > 1e-6 {
                    offset_subtree(ci, dx, dy, nodes, combos, &node_children, &combo_children);
                }
            }
        }

        // Expand combo to contain all children if they now extend beyond
        let child_nodes: Vec<usize> = node_children
            .get(&combo_id)
            .cloned()
            .unwrap_or_default();
        let child_combos: Vec<usize> = combo_children
            .get(&combo_id)
            .cloned()
            .unwrap_or_default();

        if !child_nodes.is_empty() || !child_combos.is_empty() {
            let mut min_left = f32::MAX;
            let mut min_top = f32::MAX;
            let mut max_right = f32::MIN;
            let mut max_bottom = f32::MIN;

            for &ni in &child_nodes {
                if let Some(ref rect) = nodes[ni].rect {
                    min_left = min_left.min(rect.left);
                    min_top = min_top.min(rect.top);
                    max_right = max_right.max(rect.left + rect.width);
                    max_bottom = max_bottom.max(rect.top + rect.height);
                }
            }
            for &ci in &child_combos {
                if let Some(ref rect) = combos[ci].rect {
                    min_left = min_left.min(rect.left);
                    min_top = min_top.min(rect.top);
                    max_right = max_right.max(rect.left + rect.width);
                    max_bottom = max_bottom.max(rect.top + rect.height);
                }
            }

            // Compute required bounds with padding
            let required_left = min_left - COMBO_PADDING;
            let required_top = min_top - COMBO_PADDING;
            let required_right = max_right + COMBO_PADDING;
            let required_bottom = max_bottom + COMBO_PADDING;
            let required_width = required_right - required_left;
            let required_height = required_bottom - required_top;

            if let Some(ref mut rect) = combos[*combo_idx].rect {
                let needs_expand = required_width > rect.width + 1e-3
                    || required_height > rect.height + 1e-3
                    || required_left < rect.left - 1e-3
                    || required_top < rect.top - 1e-3;

                if needs_expand {
                    rect.left = rect.left.min(required_left);
                    rect.top = rect.top.min(required_top);
                    rect.width = rect.width.max(required_width);
                    rect.height = rect.height.max(required_height);
                }
            }
        }
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

    // Post-processing: resolve any remaining overlaps
    resolve_overlaps(combo_indices, combos);
}

/// Resolve overlaps between sibling combos by iteratively separating overlapping rectangles.
/// Works on a subset of combos identified by `combo_indices`.
///
/// Uses nearest-neighbor coordinate for tension calculation to reduce oscillation probability.
fn resolve_overlaps(combo_indices: &[usize], combos: &mut [GraphCombo]) {
    let n = combo_indices.len();
    if n <= 1 {
        return;
    }

    let max_iterations = n * 2;
    for iter in 0..max_iterations {
        let mut has_overlap = false;
        for i in 0..n {
            for j in (i + 1)..n {
                let ri = combos[combo_indices[i]].rect.as_ref().unwrap();
                let rj = combos[combo_indices[j]].rect.as_ref().unwrap();

                if is_overlapping(ri, rj) {
                    has_overlap = true;

                    // Calculate overlap on each axis
                    let center_dx = (ri.left + ri.width / 2.0) - (rj.left + rj.width / 2.0);
                    let center_dy = (ri.top + ri.height / 2.0) - (rj.top + rj.height / 2.0);

                    let half_width_sum = (ri.width + rj.width) / 2.0;
                    let half_height_sum = (ri.height + rj.height) / 2.0;

                    let overlap_x = half_width_sum - center_dx.abs();
                    let overlap_y = half_height_sum - center_dy.abs();

                    let idx_i = combo_indices[i];
                    let idx_j = combo_indices[j];

                    // Axis-aligned separation: move only along the axis with smaller overlap
                    // (the "easier" escape direction). Add small epsilon for float safety.
                    const EPSILON: f32 = 0.5;

                    if overlap_x < overlap_y {
                        // Separate horizontally
                        let needed_x = half_width_sum + GAP + EPSILON;
                        let current_dist_x = center_dx.abs().max(1e-6);
                        let shift_x = (needed_x - current_dist_x).max(0.0);
                        let move_x = shift_x / 2.0 * center_dx.signum();

                        if let Some(ref mut rect) = combos[idx_i].rect {
                            rect.left += move_x;
                        }
                        if let Some(ref mut rect) = combos[idx_j].rect {
                            rect.left -= move_x;
                        }
                    } else {
                        // Separate vertically
                        let needed_y = half_height_sum + GAP + EPSILON;
                        let current_dist_y = center_dy.abs().max(1e-6);
                        let shift_y = (needed_y - current_dist_y).max(0.0);
                        let move_y = shift_y / 2.0 * center_dy.signum();

                        if let Some(ref mut rect) = combos[idx_i].rect {
                            rect.top += move_y;
                        }
                        if let Some(ref mut rect) = combos[idx_j].rect {
                            rect.top -= move_y;
                        }
                    }
                }
            }
        }
        if !has_overlap {
            break;
        }
        debug_assert!(
            iter + 1 < max_iterations,
            "resolve_overlaps did not converge after {} iterations for {} combos",
            max_iterations,
            n
        );
    }
}

/// Check if two rectangles overlap
fn is_overlapping(a: &Rect, b: &Rect) -> bool {
    a.left < b.left + b.width
        && a.left + a.width > b.left
        && a.top < b.top + b.height
        && a.top + a.height > b.top
}

/// Resolve overlaps between all elements (nodes + combos) in a positions array.
/// Each element is: (width, height, is_combo, index)
/// Positions are modified in-place to eliminate overlaps.
fn resolve_element_overlaps(
    positions: &mut [(f32, f32)],
    elements: &[(f32, f32, bool, usize)],
) {
    let n = positions.len();
    if n <= 1 {
        return;
    }

    let max_iterations = n * 2;
    for iter in 0..max_iterations {
        let mut has_overlap = false;
        for i in 0..n {
            for j in (i + 1)..n {
                let (xi, yi) = positions[i];
                let (wi, hi) = (elements[i].0, elements[i].1);
                let (xj, yj) = positions[j];
                let (wj, hj) = (elements[j].0, elements[j].1);

                // Check overlap
                let overlap = xi < xj + wj
                    && xi + wi > xj
                    && yi < yj + hj
                    && yi + hi > yj;

                if overlap {
                    has_overlap = true;

                    // Calculate overlap on each axis
                    let center_dx = (xi + wi / 2.0) - (xj + wj / 2.0);
                    let center_dy = (yi + hi / 2.0) - (yj + hj / 2.0);

                    let half_width_sum = (wi + wj) / 2.0;
                    let half_height_sum = (hi + hj) / 2.0;

                    let overlap_x = half_width_sum - center_dx.abs();
                    let overlap_y = half_height_sum - center_dy.abs();

                    // Axis-aligned separation: move only along the axis with smaller overlap
                    // (the "easier" escape direction). Add small epsilon for float safety.
                    const EPSILON: f32 = 0.5;

                    if overlap_x < overlap_y {
                        // Separate horizontally
                        let needed_x = half_width_sum + GAP + EPSILON;
                        let current_dist_x = center_dx.abs().max(1e-6);
                        let shift_x = (needed_x - current_dist_x).max(0.0);
                        let move_x = shift_x / 2.0 * center_dx.signum();

                        positions[i].0 += move_x;
                        positions[j].0 -= move_x;
                    } else {
                        // Separate vertically
                        let needed_y = half_height_sum + GAP + EPSILON;
                        let current_dist_y = center_dy.abs().max(1e-6);
                        let shift_y = (needed_y - current_dist_y).max(0.0);
                        let move_y = shift_y / 2.0 * center_dy.signum();

                        positions[i].1 += move_y;
                        positions[j].1 -= move_y;
                    }
                }
            }
        }
        if !has_overlap {
            break;
        }
        debug_assert!(
            iter + 1 < max_iterations,
            "resolve_element_overlaps did not converge after {} iterations for {} elements",
            max_iterations,
            n
        );
    }
}

/// Position children within a combo using force-directed layout.
///
/// Both nodes and child combos are treated as rectangular elements in the force simulation.
/// After force layout resolves, child combos are moved with their subtrees.
fn position_children_in_combo(
    combo_idx: usize,
    node_children: &std::collections::HashMap<String, Vec<usize>>,
    combo_children: &std::collections::HashMap<String, Vec<usize>>,
    nodes: &mut [GraphNode],
    combos: &mut [GraphCombo],
) {
    let combo_id = combos[combo_idx].id.clone();
    let combo_rect = combos[combo_idx].rect.clone().unwrap();

    let mut child_node_indices: Vec<usize> =
        node_children.get(&combo_id).cloned().unwrap_or_default();
    let mut child_combo_indices: Vec<usize> =
        combo_children.get(&combo_id).cloned().unwrap_or_default();

    child_node_indices.sort_by(|&a, &b| nodes[a].id.cmp(&nodes[b].id));
    child_combo_indices.sort_by(|&a, &b| combos[a].id.cmp(&combos[b].id));

    let total_children = child_node_indices.len() + child_combo_indices.len();
    if total_children == 0 {
        return;
    }

    // Collect child sizes and build a unified list of elements
    // Each element: (width, height, is_combo, index)
    let mut elements: Vec<(f32, f32, bool, usize)> = Vec::with_capacity(total_children);
    for &ni in &child_node_indices {
        elements.push((NODE_SIZE * 2.0, NODE_SIZE, false, ni));
    }
    for &ci in &child_combo_indices {
        let (w, h) = combos[ci]
            .rect
            .as_ref()
            .map(|r| (r.width, r.height))
            .unwrap_or((NODE_SIZE * 2.0, NODE_SIZE));
        elements.push((w, h, true, ci));
    }

    // Initialize positions: place elements in a circle within the combo as starting positions
    // Circle layout provides more uniform initial distribution than grid
    let n = elements.len();
    let inner_width = combo_rect.width - 2.0 * COMBO_PADDING;
    let inner_height = combo_rect.height - 2.0 * COMBO_PADDING;

    // Compute total area to estimate needed radius
    let total_area: f32 = elements.iter().map(|&(w, h, _, _)| w * h).sum();
    let estimated_radius = (total_area / std::f32::consts::PI).sqrt();
    // Clamp radius to fit within combo, leaving padding
    let max_radius = (inner_width.min(inner_height) / 2.0).max(50.0);
    let radius = estimated_radius.min(max_radius).max(50.0);

    // Center of the combo
    let center_x = combo_rect.left + combo_rect.width / 2.0;
    let center_y = combo_rect.top + combo_rect.height / 2.0;

    let mut positions: Vec<(f32, f32)> = Vec::with_capacity(n);
    for (i, &(w, h, _, _)) in elements.iter().enumerate() {
        let angle = 2.0 * std::f32::consts::PI * i as f32 / n as f32;
        // Position element so its center is on the circle
        let x = center_x + radius * angle.cos() - w / 2.0;
        let y = center_y + radius * angle.sin() - h / 2.0;
        positions.push((x, y));
    }

    // Define boundaries for constraint
    let min_x = combo_rect.left + COMBO_PADDING;
    let min_y = combo_rect.top + COMBO_PADDING;
    let max_x = combo_rect.left + combo_rect.width - COMBO_PADDING;
    let max_y = combo_rect.top + combo_rect.height - COMBO_PADDING;

    // Run force simulation for all elements within the combo
    let mut temperature = 20.0;
    let inner_iterations = 200;

    for _ in 0..inner_iterations {
        let mut forces: Vec<(f32, f32)> = vec![(0.0, 0.0); n];

        for i in 0..n {
            let (xi, yi) = positions[i];
            let (wi, hi) = (elements[i].0, elements[i].1);

            for j in 0..n {
                if i == j {
                    continue;
                }

                let (xj, yj) = positions[j];
                let (wj, hj) = (elements[j].0, elements[j].1);

                let dx = xi + wi / 2.0 - (xj + wj / 2.0);
                let dy = yi + hi / 2.0 - (yj + hj / 2.0);
                let dist = (dx * dx + dy * dy).sqrt().max(1.0);

                // Overlap-based repulsion (same logic as apply_force_layout)
                let overlap_x = (wi / 2.0 + wj / 2.0) - dx.abs();
                let overlap_y = (hi / 2.0 + hj / 2.0) - dy.abs();

                let repulsion = if overlap_x > 0.0 && overlap_y > 0.0 {
                    let overlap_area = overlap_x * overlap_y;
                    REPULSION_STRENGTH * (1.0 + overlap_area / 100.0) / dist
                } else {
                    REPULSION_STRENGTH / (dist * dist)
                };

                forces[i].0 += repulsion * dx / dist;
                forces[i].1 += repulsion * dy / dist;
            }

            // Attraction to combo center (keeps layout compact within combo)
            let center_x = combo_rect.left + combo_rect.width / 2.0;
            let center_y = combo_rect.top + combo_rect.height / 2.0;
            forces[i].0 += ATTRACTION_STRENGTH * 2.0 * (center_x - xi - wi / 2.0);
            forces[i].1 += ATTRACTION_STRENGTH * 2.0 * (center_y - yi - hi / 2.0);
        }

        // Apply forces with temperature annealing
        for i in 0..n {
            positions[i].0 += forces[i].0 * temperature;
            positions[i].1 += forces[i].1 * temperature;
        }

        // Constrain positions to stay within combo boundaries
        for i in 0..n {
            let (w, h, _, _) = elements[i];
            // Ensure max >= min to avoid clamp panic (can happen when element is wider than container)
            let effective_max_x = (max_x.max(min_x + w) - w).max(min_x);
            let effective_max_y = (max_y.max(min_y + h) - h).max(min_y);
            positions[i].0 = positions[i].0.clamp(min_x, effective_max_x);
            positions[i].1 = positions[i].1.clamp(min_y, effective_max_y);
        }

        temperature *= COOLING_FACTOR;
    }

    // Apply positions: set nodes directly, move combos with subtrees
    for (i, &(w, h, is_combo, idx)) in elements.iter().enumerate() {
        let (x, y) = positions[i];

        if !is_combo {
            // It's a node - set position directly
            nodes[idx].rect = Some(Rect {
                top: y,
                left: x,
                width: w,
                height: h,
            });
        }
    }

    // Apply combo positions with subtree offset
    for (i, &(_w, _h, is_combo, idx)) in elements.iter().enumerate() {
        if !is_combo {
            continue;
        }

        let (x, y) = positions[i];
        let (old_left, old_top) = combos[idx]
            .rect
            .as_ref()
            .map(|r| (r.left, r.top))
            .unwrap_or((0.0, 0.0));
        let dx = x - old_left;
        let dy = y - old_top;

        if let Some(ref mut rect) = combos[idx].rect {
            rect.left = x;
            rect.top = y;
        }

        if dx.abs() > 1e-6 || dy.abs() > 1e-6 {
            offset_subtree(idx, dx, dy, nodes, combos, node_children, combo_children);
        }
    }

    // Post-processing: resolve any remaining overlaps between ALL elements (nodes + combos)
    // First, update positions array from actual node/combo positions (in case force simulation moved them differently)
    for (i, &(_, _, is_combo, idx)) in elements.iter().enumerate() {
        if is_combo {
            positions[i] = combos[idx]
                .rect
                .as_ref()
                .map(|r| (r.left, r.top))
                .unwrap_or(positions[i]);
        } else {
            positions[i] = nodes[idx]
                .rect
                .as_ref()
                .map(|r| (r.left, r.top))
                .unwrap_or(positions[i]);
        }
    }

    // Resolve overlaps for all elements
    resolve_element_overlaps(&mut positions, &elements);

    // Apply resolved positions to nodes
    for (i, &(w, h, is_combo, idx)) in elements.iter().enumerate() {
        if !is_combo {
            let (x, y) = positions[i];
            nodes[idx].rect = Some(Rect {
                top: y,
                left: x,
                width: w,
                height: h,
            });
        }
    }

    // Apply resolved positions to combos with subtree offset
    let combo_positions_before: Vec<(f32, f32)> = child_combo_indices
        .iter()
        .map(|&ci| {
            combos[ci]
                .rect
                .as_ref()
                .map(|r| (r.left, r.top))
                .unwrap_or((0.0, 0.0))
        })
        .collect();

    for (i, &(_, _, is_combo, idx)) in elements.iter().enumerate() {
        if !is_combo {
            continue;
        }
        let (x, y) = positions[i];
        if let Some(ref mut rect) = combos[idx].rect {
            rect.left = x;
            rect.top = y;
        }
    }

    // Re-clamp child combos to parent boundary after overlap resolution.
    let min_x = combo_rect.left + COMBO_PADDING;
    let min_y = combo_rect.top + COMBO_PADDING;
    let max_x = combo_rect.left + combo_rect.width - COMBO_PADDING;
    let max_y = combo_rect.top + combo_rect.height - COMBO_PADDING;

    for &ci in &child_combo_indices {
        if let Some(ref mut rect) = combos[ci].rect {
            let effective_max_x = (max_x.max(min_x + rect.width) - rect.width).max(min_x);
            let effective_max_y = (max_y.max(min_y + rect.height) - rect.height).max(min_y);
            rect.left = rect.left.clamp(min_x, effective_max_x);
            rect.top = rect.top.clamp(min_y, effective_max_y);
        }
    }

    // Offset subtrees for combos that moved
    for (i, &ci) in child_combo_indices.iter().enumerate() {
        let (old_left, old_top) = combo_positions_before[i];
        let (new_left, new_top) = combos[ci]
            .rect
            .as_ref()
            .map(|r| (r.left, r.top))
            .unwrap_or((0.0, 0.0));
        let dx = new_left - old_left;
        let dy = new_top - old_top;
        if dx.abs() > 1e-6 || dy.abs() > 1e-6 {
            offset_subtree(ci, dx, dy, nodes, combos, node_children, combo_children);
        }
    }

    // Update combo size to accommodate all children if they exceed current bounds
    // Compute bounding box of all children
    let mut min_child_left = f32::MAX;
    let mut min_child_top = f32::MAX;
    let mut max_child_right = f32::MIN;
    let mut max_child_bottom = f32::MIN;

    for (i, &(w, h, _, _)) in elements.iter().enumerate() {
        let (x, y) = positions[i];
        min_child_left = min_child_left.min(x);
        min_child_top = min_child_top.min(y);
        max_child_right = max_child_right.max(x + w);
        max_child_bottom = max_child_bottom.max(y + h);
    }

    // Required size to contain all children with padding
    let required_width = (max_child_right - min_child_left) + 2.0 * COMBO_PADDING;
    let required_height = (max_child_bottom - min_child_top) + 2.0 * COMBO_PADDING;

    // Expand combo if needed
    if let Some(ref mut rect) = combos[combo_idx].rect {
        let new_width = rect.width.max(required_width);
        let new_height = rect.height.max(required_height);

        // If expanding, adjust position to keep children centered
        if new_width > rect.width || new_height > rect.height {
            let width_diff = new_width - rect.width;
            let height_diff = new_height - rect.height;
            rect.left -= width_diff / 2.0;
            rect.top -= height_diff / 2.0;
            rect.width = new_width;
            rect.height = new_height;

            // Offset subtree to account for combo position change
            if width_diff.abs() > 1e-6 || height_diff.abs() > 1e-6 {
                offset_subtree(
                    combo_idx,
                    -width_diff / 2.0,
                    -height_diff / 2.0,
                    nodes,
                    combos,
                    node_children,
                    combo_children,
                );
            }
        }
    }
}

/// Offset all nodes and combos within a combo by (dx, dy).
/// Uses iteration instead of recursion to avoid stack overflow in WASM.
/// Uses pre-built indexes for O(size_of_subtree) instead of O(size_of_graph) per call.
fn offset_subtree(
    combo_idx: usize,
    dx: f32,
    dy: f32,
    nodes: &mut [GraphNode],
    combos: &mut [GraphCombo],
    node_children: &std::collections::HashMap<String, Vec<usize>>,
    combo_children: &std::collections::HashMap<String, Vec<usize>>,
) {
    // Use a Vec as a work queue to process combos iteratively
    let mut queue: Vec<usize> = vec![combo_idx];

    while let Some(current_idx) = queue.pop() {
        let current_id = &combos[current_idx].id;

        // Offset nodes in this combo using pre-built index (O(1) lookup)
        if let Some(child_indices) = node_children.get(current_id) {
            for &ni in child_indices {
                if let Some(ref mut rect) = nodes[ni].rect {
                    rect.left += dx;
                    rect.top += dy;
                }
            }
        }

        // Offset child combos and add them to queue using pre-built index (O(1) lookup)
        if let Some(child_indices) = combo_children.get(current_id) {
            for &ci in child_indices {
                if let Some(ref mut rect) = combos[ci].rect {
                    rect.left += dx;
                    rect.top += dy;
                }
                queue.push(ci);
            }
        }
    }
}

#[cfg(test)]
#[path = "layout_test.rs"]
mod layout_test;
