use std::collections::HashMap;

use crate::types::{GraphEdge, GraphNode};

/// Compute instability (I = ΣW_out / (ΣW_out + ΣW_in)) for each node.
///
/// Uses `edge.weight` to weight the contribution of each edge.
/// Nodes with no edges (total == 0) get `instability = None`.
/// Results are rounded to 4 decimal places.
pub(crate) fn compute_instability(nodes: &mut [GraphNode], edges: &[GraphEdge]) {
    // Accumulate weighted out-degree and in-degree per node
    let mut sums: HashMap<&str, (f32, f32)> = HashMap::new();

    for edge in edges {
        let weight = edge.weight as f32;

        // Update source node's outgoing sum
        let entry = sums.entry(edge.source.as_str()).or_insert((0.0, 0.0));
        entry.0 += weight;

        // Update target node's incoming sum
        let entry = sums.entry(edge.target.as_str()).or_insert((0.0, 0.0));
        entry.1 += weight;
    }

    // Compute instability for each node
    for node in nodes.iter_mut() {
        let (sum_w_out, sum_w_in) = sums.get(node.id.as_str()).copied().unwrap_or((0.0, 0.0));
        let total = sum_w_out + sum_w_in;

        node.instability = if total == 0.0 {
            None
        } else {
            let value = sum_w_out / total;
            // Round to 4 decimal places
            Some((value * 10000.0).round() / 10000.0)
        };
    }
}

#[cfg(test)]
#[path = "instability_test.rs"]
mod instability_test;
