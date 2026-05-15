use crate::types::{GraphCombo, GraphNode, Rect};
use std::collections::HashMap;

const NODE_SIZE: f32 = 20.0;
const COMBO_PADDING: f32 = 20.0;
const GAP: f32 = 30.0;

/// Force layout parameters
const ITERATIONS: usize = 500;
const REPULSION_STRENGTH: f32 = 60.0;
const ATTRACTION_STRENGTH: f32 = 0.05;
const COOLING_FACTOR: f32 = 0.98;

#[derive(Clone, Copy)]
struct ElementRef {
    kind: ElementKind,
    index: usize,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum ElementKind {
    Node,
    Combo,
}

fn element_combo<'a>(
    el: ElementRef,
    nodes: &'a [GraphNode],
    combos: &'a [GraphCombo],
) -> Option<&'a str> {
    match el.kind {
        ElementKind::Node => nodes[el.index].combo.as_deref(),
        ElementKind::Combo => combos[el.index].combo.as_deref(),
    }
}

fn element_rect(el: ElementRef, nodes: &[GraphNode], combos: &[GraphCombo]) -> Option<Rect> {
    match el.kind {
        ElementKind::Node => nodes[el.index].rect,
        ElementKind::Combo => combos[el.index].rect,
    }
}

fn set_element_rect(
    el: ElementRef,
    nodes: &mut [GraphNode],
    combos: &mut [GraphCombo],
    rect: Option<Rect>,
) {
    match el.kind {
        ElementKind::Node => nodes[el.index].rect = rect,
        ElementKind::Combo => combos[el.index].rect = rect,
    }
}

fn default_element_size(el: ElementRef) -> (f32, f32) {
    match el.kind {
        ElementKind::Node => (NODE_SIZE * 2.0, NODE_SIZE),
        ElementKind::Combo => (NODE_SIZE * 2.0, NODE_SIZE),
    }
}

/// Compute layout for all nodes and combos.
///
/// Three-phase algorithm:
/// 1. Bottom-up sizing: compute combo sizes from children (force layout within each combo)
/// 2. Force layout: position top-level combos without overlap
/// 3. Top-down offset: translate subtrees to their parent combo positions
pub(crate) fn compute_layout(nodes: &mut [GraphNode], combos: &mut [GraphCombo]) {
    if nodes.is_empty() && combos.is_empty() {
        return;
    }

    let elements = merge_elements(nodes, combos);
    let children_index = build_children_index(&elements, nodes, combos);

    // Phase 1: Compute combo sizes bottom-up (deepest first)
    let sorted_indices = sort_combos_by_depth(combos);
    for &combo_idx in &sorted_indices {
        compute_combo_size(combo_idx, &children_index, &elements, nodes, combos);
    }

    // Phase 2: Force layout for top-level combos
    let top_level_elements: Vec<usize> = elements
        .iter()
        .enumerate()
        .filter(|(_, el)| element_combo(**el, nodes, combos).is_none())
        .map(|(i, _)| i)
        .collect();

    if !top_level_elements.is_empty() {
        apply_force_layout(&top_level_elements, &elements, nodes, combos);
    }

    // Phase 3: Offset subtrees to match parent combo positions (top-down)
    for &combo_idx in sorted_indices.iter().rev() {
        if let Some(ref rect) = combos[combo_idx].rect {
            offset_subtree(
                combo_idx,
                rect.left,
                rect.top,
                &children_index,
                &elements,
                nodes,
                combos,
            );
        }
    }
}

fn merge_elements(nodes: &[GraphNode], combos: &[GraphCombo]) -> Vec<ElementRef> {
    let mut elements = Vec::with_capacity(nodes.len() + combos.len());
    for i in 0..combos.len() {
        elements.push(ElementRef {
            kind: ElementKind::Combo,
            index: i,
        });
    }
    for i in 0..nodes.len() {
        elements.push(ElementRef {
            kind: ElementKind::Node,
            index: i,
        });
    }
    elements
}

fn build_children_index(
    elements: &[ElementRef],
    nodes: &[GraphNode],
    combos: &[GraphCombo],
) -> HashMap<String, Vec<usize>> {
    let mut index: HashMap<String, Vec<usize>> = HashMap::new();
    for (i, &el) in elements.iter().enumerate() {
        if let Some(combo_id) = element_combo(el, nodes, combos) {
            index.entry(combo_id.to_string()).or_default().push(i);
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

/// Compute combo size from its children (force-directed layout)
fn compute_combo_size(
    combo_idx: usize,
    children_index: &HashMap<String, Vec<usize>>,
    elements: &[ElementRef],
    nodes: &mut [GraphNode],
    combos: &mut [GraphCombo],
) {
    let combo_id = combos[combo_idx].id.clone();
    let children_indices: Vec<usize> = children_index.get(&combo_id).cloned().unwrap_or_default();

    apply_force_layout(&children_indices, elements, nodes, combos);

    let total_children = children_indices.len();
    if total_children == 0 {
        combos[combo_idx].rect = Some(Rect {
            top: 0.0,
            left: 0.0,
            width: 2.0 * COMBO_PADDING,
            height: 2.0 * COMBO_PADDING,
        });
        return;
    }

    let mut min_x = f32::INFINITY;
    let mut max_x = -f32::INFINITY;
    let mut min_y = f32::INFINITY;
    let mut max_y = -f32::INFINITY;

    for &i in &children_indices {
        if let Some(mut rect) = element_rect(elements[i], nodes, combos) {
            min_x = min_x.min(rect.left);
            max_x = max_x.max(rect.left + rect.width);
            min_y = min_y.min(rect.top);
            max_y = max_y.max(rect.top + rect.height);
            rect.left += COMBO_PADDING;
            rect.top += COMBO_PADDING;
            set_element_rect(elements[i], nodes, combos, Some(rect));
        }
    }

    let total_width: f32 = max_x - min_x;
    let total_height: f32 = max_y - min_y;

    combos[combo_idx].rect = Some(Rect {
        top: 0.0,
        left: 0.0,
        width: total_width + 2.0 * COMBO_PADDING,
        height: total_height + 2.0 * COMBO_PADDING,
    });
    offset_subtree(
        combo_idx,
        -min_x,
        -min_y,
        children_index,
        elements,
        nodes,
        combos,
    );
}

/// Apply force-directed layout to position elements without overlap
fn apply_force_layout(
    element_indices: &[usize],
    elements: &[ElementRef],
    nodes: &mut [GraphNode],
    combos: &mut [GraphCombo],
) {
    if element_indices.len() <= 1 {
        for &idx in element_indices {
            let el = elements[idx];
            let (default_w, default_h) = default_element_size(el);
            if let Some(mut rect) = element_rect(el, nodes, combos) {
                rect.left = 0.0;
                rect.top = 0.0;
                set_element_rect(el, nodes, combos, Some(rect));
            } else {
                set_element_rect(
                    el,
                    nodes,
                    combos,
                    Some(Rect {
                        left: 0.0,
                        top: 0.0,
                        width: default_w,
                        height: default_h,
                    }),
                );
            }
        }
        return;
    }

    // Initialize positions in a circle with enough spacing
    let n = element_indices.len();

    // Compute total area to estimate needed radius
    let total_area: f32 = element_indices
        .iter()
        .map(|&idx| {
            let el = elements[idx];
            element_rect(el, nodes, combos)
                .map(|r| r.width * r.height)
                .unwrap_or_else(|| {
                    let (w, h) = default_element_size(el);
                    w * h
                })
        })
        .sum();
    let radius = (total_area / std::f32::consts::PI).sqrt().max(200.0);

    for (i, &idx) in element_indices.iter().enumerate() {
        let angle = 2.0 * std::f32::consts::PI * i as f32 / n as f32;
        let el = elements[idx];
        let new_left = radius * angle.cos();
        let new_top = radius * angle.sin();
        if let Some(mut rect) = element_rect(el, nodes, combos) {
            rect.left = new_left;
            rect.top = new_top;
            set_element_rect(el, nodes, combos, Some(rect));
        } else {
            let (default_w, default_h) = default_element_size(el);
            set_element_rect(
                el,
                nodes,
                combos,
                Some(Rect {
                    left: new_left,
                    top: new_top,
                    width: default_w,
                    height: default_h,
                }),
            );
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

                let el_i = elements[element_indices[i]];
                let el_j = elements[element_indices[j]];
                let ri = element_rect(el_i, nodes, combos).unwrap();
                let rj = element_rect(el_j, nodes, combos).unwrap();

                // Centers
                let xi = ri.left + ri.width / 2.0;
                let yi = ri.top + ri.height / 2.0;
                let xj = rj.left + rj.width / 2.0;
                let yj = rj.top + rj.height / 2.0;

                let dx = xi - xj;
                let dy = yi - yj;
                let dist = (dx * dx + dy * dy).sqrt();

                // Compute overlap-based repulsion
                let overlap_x = (ri.width / 2.0 + rj.width / 2.0 + GAP) - dx.abs();
                let overlap_y = (ri.height / 2.0 + rj.height / 2.0 + GAP) - dy.abs();

                let repulsion = if overlap_x > 0.0 && overlap_y > 0.0 {
                    // Rectangles overlap - use stronger separation force
                    let overlap_area = overlap_x * overlap_y;
                    REPULSION_STRENGTH * (1.0 + overlap_area / 5.0) / dist
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
            let el_i = elements[element_indices[i]];
            let ri = element_rect(el_i, nodes, combos).unwrap();
            forces[i].0 -= ATTRACTION_STRENGTH * (ri.left + ri.width / 2.0);
            forces[i].1 -= ATTRACTION_STRENGTH * (ri.top + ri.height / 2.0);
        }

        // Apply forces with temperature annealing
        for (i, &idx) in element_indices.iter().enumerate() {
            let el = elements[idx];
            if let Some(mut rect) = element_rect(el, nodes, combos) {
                rect.left += forces[i].0 * temperature;
                rect.top += forces[i].1 * temperature;
                set_element_rect(el, nodes, combos, Some(rect));
            }
        }

        temperature *= COOLING_FACTOR;
    }

    // Post-processing: resolve any remaining overlaps
    resolve_overlaps(element_indices, elements, nodes, combos);
}

/// Resolve overlaps between sibling combos by iteratively separating overlapping rectangles.
/// Works on a subset of combos identified by `combo_indices`.
///
/// Uses nearest-neighbor coordinate for tension calculation to reduce oscillation probability.
fn resolve_overlaps(
    element_indices: &[usize],
    elements: &[ElementRef],
    nodes: &mut [GraphNode],
    combos: &mut [GraphCombo],
) {
    let n = element_indices.len();
    if n <= 1 {
        return;
    }

    let max_iterations = n * 2;
    for iter in 0..max_iterations {
        let mut has_overlap = false;
        for i in 0..n {
            for j in (i + 1)..n {
                let el_i = elements[element_indices[i]];
                let el_j = elements[element_indices[j]];
                let ri = element_rect(el_i, nodes, combos).unwrap();
                let rj = element_rect(el_j, nodes, combos).unwrap();

                if is_overlapping(&ri, &rj) {
                    has_overlap = true;

                    // Calculate overlap on each axis
                    let center_dx = (ri.left + ri.width / 2.0) - (rj.left + rj.width / 2.0);
                    let center_dy = (ri.top + ri.height / 2.0) - (rj.top + rj.height / 2.0);

                    let half_width_sum = (ri.width + rj.width) / 2.0;
                    let half_height_sum = (ri.height + rj.height) / 2.0;

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

                        if let Some(mut rect) = element_rect(el_i, nodes, combos) {
                            rect.left += move_x;
                            set_element_rect(el_i, nodes, combos, Some(rect));
                        }
                        if let Some(mut rect) = element_rect(el_j, nodes, combos) {
                            rect.left -= move_x;
                            set_element_rect(el_j, nodes, combos, Some(rect));
                        }
                    } else {
                        // Separate vertically
                        let needed_y = half_height_sum + GAP + EPSILON;
                        let current_dist_y = center_dy.abs().max(1e-6);
                        let shift_y = (needed_y - current_dist_y).max(0.0);
                        let move_y = shift_y / 2.0 * center_dy.signum();

                        if let Some(mut rect) = element_rect(el_i, nodes, combos) {
                            rect.top += move_y;
                            set_element_rect(el_i, nodes, combos, Some(rect));
                        }
                        if let Some(mut rect) = element_rect(el_j, nodes, combos) {
                            rect.top -= move_y;
                            set_element_rect(el_j, nodes, combos, Some(rect));
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
    a.left < b.left + b.width + (GAP / 2.0)
        && a.left + a.width + (GAP / 2.0) > b.left
        && a.top < b.top + b.height + (GAP / 2.0)
        && a.top + a.height + (GAP / 2.0) > b.top
}

/// Offset all nodes and combos within a combo by (dx, dy).
/// Uses iteration instead of recursion to avoid stack overflow in WASM.
/// Uses pre-built indexes for O(size_of_subtree) instead of O(size_of_graph) per call.
fn offset_subtree(
    combo_idx: usize,
    dx: f32,
    dy: f32,
    children_index: &HashMap<String, Vec<usize>>,
    elements: &[ElementRef],
    nodes: &mut [GraphNode],
    combos: &mut [GraphCombo],
) {
    // Use a Vec as a work queue to process combos iteratively
    let mut queue: Vec<usize> = vec![combo_idx];

    while let Some(current_idx) = queue.pop() {
        let current_id = &combos[current_idx].id;

        // Offset nodes in this combo using pre-built index (O(1) lookup)
        if let Some(child_indices) = children_index.get(current_id) {
            for &ni in child_indices {
                if let Some(mut rect) = element_rect(elements[ni], nodes, combos) {
                    rect.left += dx;
                    rect.top += dy;
                    set_element_rect(elements[ni], nodes, combos, Some(rect));
                }
            }
        }
    }
}

#[cfg(test)]
#[path = "layout_test.rs"]
mod layout_test;
