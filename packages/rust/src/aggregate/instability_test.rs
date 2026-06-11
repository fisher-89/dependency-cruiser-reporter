//! Tests for `compute_instability()` in `aggregate/instability.rs`.
//!
//! Coverage targets (from test-design.md):
//! - AC-1: Rust compute_instability weighted calculation
//! - AC-10: Isolated node returns None
//! - F-1 through F-5: Forward acceptance criteria
//! - R-1 through R-6: Reverse acceptance criteria (error/edge cases)
//! - B-1 through B-8: Boundary cases
//!
//! All tests are enabled once `compute_instability()` was implemented.

use super::*;
use crate::types::{EdgeType, NodeType};

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/// Create a minimal GraphNode with only the fields needed for instability tests.
fn make_node(id: &str, instability: Option<f32>) -> GraphNode {
    GraphNode {
        id: id.to_string(),
        label: id.to_string(),
        node_type: NodeType::File,
        path: None,
        violation_count: 0,
        orphan: None,
        children: None,
        combo: None,
        rect: None,
        instability,
    }
}

/// Create a minimal GraphEdge with only the fields needed for instability tests.
fn make_edge(source: &str, target: &str, weight: u32) -> GraphEdge {
    GraphEdge {
        source: source.to_string(),
        target: target.to_string(),
        edge_type: EdgeType::Local,
        weight,
        circular: None,
        error_count: None,
        warn_count: None,
        info_count: None,
    }
}

// ===========================================================================
// Forward ACs (Happy Path)
// ===========================================================================

/// F-1: Basic weighted instability calculation.
///
/// Nodes A, B, C with edges:
///   A->B (weight=5), A->B (weight=25 aggregated), B->C (weight=10),
///   C->A (weight=70)
/// Expected: A: Ce=30, Ca=70, I=30/(30+70)=0.3
#[test]
fn test_f1_basic_weighted_instability() {
    let mut nodes = vec![make_node("A", None), make_node("B", None), make_node("C", None)];
    let edges = vec![
        make_edge("A", "B", 5),
        make_edge("A", "B", 25),
        make_edge("B", "C", 10),
        make_edge("C", "A", 70),
    ];

    compute_instability(&mut nodes, &edges);

    // A: Ce = 5+25 = 30, Ca = 70, I = 30/(30+70) = 0.3 (0.3000 rounded)
    assert_eq!(nodes.iter().find(|n| n.id == "A").unwrap().instability, Some(0.3));
    // B: Ce = 10, Ca = 30, I = 10/40 = 0.25
    assert_eq!(
        nodes.iter().find(|n| n.id == "B").unwrap().instability,
        Some(0.25)
    );
    // C: Ce = 70, Ca = 10, I = 70/80 = 0.875
    assert_eq!(
        nodes.iter().find(|n| n.id == "C").unwrap().instability,
        Some(0.875)
    );
}

/// F-2: Node with only outgoing edges (instability = 1.0).
///
/// Node A has 3 outgoing edges, 0 incoming edges.
/// Ce=3, Ca=0, I=3/(3+0)=1.0
#[test]
fn test_f2_only_outgoing_edges() {
    let mut nodes = vec![make_node("A", None), make_node("B", None), make_node("C", None)];
    let edges = vec![
        make_edge("A", "B", 1),
        make_edge("A", "C", 1),
        make_edge("A", "D", 1),
    ];

    compute_instability(&mut nodes, &edges);

    assert_eq!(
        nodes.iter().find(|n| n.id == "A").unwrap().instability,
        Some(1.0)
    );
}

/// F-3: Node with only incoming edges (instability = 0.0).
///
/// Node A has 0 outgoing edges, 7 incoming edges (weight=7 total).
/// Ce=0, Ca=7, I=0/(0+7)=0.0
#[test]
fn test_f3_only_incoming_edges() {
    let mut nodes = vec![make_node("A", None), make_node("B", None)];
    let edges = vec![
        make_edge("B", "A", 1),
        make_edge("C", "A", 2),
        make_edge("D", "A", 4),
    ];

    compute_instability(&mut nodes, &edges);

    assert_eq!(
        nodes.iter().find(|n| n.id == "A").unwrap().instability,
        Some(0.0)
    );
}

/// F-4: Precision rounding to 4 decimal places.
///
/// Ce=5, Ca=12, I=5/(5+12)=0.294117...
/// Expected: 0.2941 (rounded to 4 decimal places)
#[test]
fn test_f4_precision_rounding() {
    let mut nodes = vec![make_node("A", None), make_node("B", None)];
    let edges = vec![
        make_edge("A", "B", 5),
        make_edge("B", "A", 12),
    ];

    compute_instability(&mut nodes, &edges);

    let instability = nodes.iter().find(|n| n.id == "A").unwrap().instability;
    assert!(instability.is_some());
    let value = instability.unwrap();
    // Should be rounded to 4 decimal places: 5/17 ≈ 0.294117... → 0.2941
    assert!((value - 0.2941).abs() < 0.0001, "Expected ~0.2941, got {}", value);
}

/// F-5: Multiple edge weight accumulation.
///
/// Edges: A->B (weight=3), A->B (weight=7), A->C (weight=10)
/// Expected: A's Ce = 3+7+10 = 20
#[test]
fn test_f5_multiple_edge_weight_accumulation() {
    let mut nodes = vec![make_node("A", None), make_node("B", None), make_node("C", None)];
    let edges = vec![
        make_edge("A", "B", 3),
        make_edge("A", "B", 7),
        make_edge("A", "C", 10),
    ];

    compute_instability(&mut nodes, &edges);

    // All edges are outgoing from A, so instability should be 1.0.
    // Ce = 3+7+10 = 20, Ca = 0
    assert_eq!(
        nodes.iter().find(|n| n.id == "A").unwrap().instability,
        Some(1.0)
    );
}

// ===========================================================================
// Reverse ACs (Sad Path / Error Handling)
// ===========================================================================

/// R-1: Isolated node (no edges) returns None.
///
/// Nodes A, B, C with no edges between them.
/// All nodes should have instability = None.
#[test]
fn test_r1_isolated_node_returns_none() {
    let mut nodes = vec![make_node("A", None), make_node("B", None), make_node("C", None)];
    let edges: Vec<GraphEdge> = vec![];

    compute_instability(&mut nodes, &edges);

    for node in &nodes {
        assert_eq!(
            node.instability, None,
            "Isolated node {} should have instability=None",
            node.id
        );
    }
}

/// R-2: Empty edges list.
///
/// compute_instability with empty edges slice.
/// No panic; all nodes should have instability = None.
#[test]
fn test_r2_empty_edges_list() {
    let mut nodes = vec![make_node("A", None), make_node("B", None)];
    let edges: Vec<GraphEdge> = vec![];

    compute_instability(&mut nodes, &edges);

    assert_eq!(
        nodes.iter().find(|n| n.id == "A").unwrap().instability,
        None
    );
    assert_eq!(
        nodes.iter().find(|n| n.id == "B").unwrap().instability,
        None
    );
}

/// R-3: Empty nodes list.
///
/// compute_instability with empty nodes slice.
/// No panic, no operation.
#[test]
fn test_r3_empty_nodes_list() {
    let mut nodes: Vec<GraphNode> = vec![];
    let edges = vec![make_edge("A", "B", 5)];

    // Should not panic
    compute_instability(&mut nodes, &edges);
}

/// R-4: Zero weight edges.
///
/// Edges: A->B (weight=0), A->C (weight=5)
/// Zero-weight edge should not contribute to Ce or Ca.
#[test]
fn test_r4_zero_weight_edges() {
    let mut nodes = vec![make_node("A", None), make_node("B", None), make_node("C", None)];
    let edges = vec![
        make_edge("A", "B", 0),
        make_edge("A", "C", 5),
    ];

    compute_instability(&mut nodes, &edges);

    // A has Ce = 5 (only from A->C), Ca = 0, I = 1.0
    assert_eq!(
        nodes.iter().find(|n| n.id == "A").unwrap().instability,
        Some(1.0)
    );
    // B has Ce = 0, Ca = 0, I = None (isolated, since weight=0 contributed nothing)
    assert_eq!(
        nodes.iter().find(|n| n.id == "B").unwrap().instability,
        None
    );
}

/// R-5: Self-loop edge.
///
/// Edge: A->A (weight=5)
/// Both Ce and Ca should count the self-loop.
/// I = 5/(5+5) = 0.5
#[test]
fn test_r5_self_loop_edge() {
    let mut nodes = vec![make_node("A", None)];
    let edges = vec![make_edge("A", "A", 5)];

    compute_instability(&mut nodes, &edges);

    // A: Ce = 5, Ca = 5, I = 5/10 = 0.5
    assert_eq!(
        nodes.iter().find(|n| n.id == "A").unwrap().instability,
        Some(0.5)
    );
}

/// R-6: f32 precision overflow/underflow.
///
/// Large Ce and Ca values should not cause panic and produce correct I.
/// Ce = 1e20, Ca = 1e20, I = 0.5
#[test]
fn test_r6_large_values_no_overflow() {
    let mut nodes = vec![make_node("A", None)];
    // Use the maximum allowed weight value (u32::MAX split across two edges)
    // to simulate large Ce/Ca without actual f32 overflow from sum.
    let large_weight = u32::MAX / 2;
    let edges = vec![
        make_edge("A", "B", large_weight),
        make_edge("C", "A", large_weight),
    ];

    compute_instability(&mut nodes, &edges);

    // Ce = large_weight, Ca = large_weight, I = 0.5 (approximately)
    let instability = nodes.iter().find(|n| n.id == "A").unwrap().instability;
    assert!(instability.is_some());
    let value = instability.unwrap();
    assert!(
        (value - 0.5).abs() < 0.001,
        "Expected ~0.5 for equal Ce and Ca, got {}",
        value
    );
}

// ===========================================================================
// Boundary Cases
// ===========================================================================

/// B-1: Single node, no edges at all.
/// instability should be None (isolated).
#[test]
fn test_b1_single_node_no_edges() {
    let mut nodes = vec![make_node("A", None)];
    let edges: Vec<GraphEdge> = vec![];

    compute_instability(&mut nodes, &edges);

    assert_eq!(nodes[0].instability, None);
}

/// B-2: Edge with weight = 0 should be treated as zero contribution.
#[test]
fn test_b2_weight_zero_no_contribution() {
    let mut nodes = vec![make_node("A", None), make_node("B", None)];
    let edges = vec![make_edge("A", "B", 0)];

    compute_instability(&mut nodes, &edges);

    // Zero-weight edge means A has Ce=0, B has Ca=0
    // Both are effectively isolated (no effective connectivity)
    assert_eq!(nodes[0].instability, None);
    assert_eq!(nodes[1].instability, None);
}

/// B-3: Self-loop accounted in both directions.
#[test]
fn test_b3_self_loop() {
    let mut nodes = vec![make_node("A", None)];
    let edges = vec![make_edge("A", "A", 3)];

    compute_instability(&mut nodes, &edges);

    // Ce = 3 (source=A), Ca = 3 (target=A)
    assert_eq!(
        nodes[0].instability,
        Some(0.5)
    );
}

/// B-4: Empty nodes slice should not panic.
#[test]
fn test_b4_empty_nodes_no_panic() {
    let mut nodes: Vec<GraphNode> = vec![];
    let edges = vec![make_edge("A", "B", 5)];

    compute_instability(&mut nodes, &edges);
    // No assertion needed -- just verifying no panic
}

/// B-5: Empty edges slice -- all nodes should have None instability.
#[test]
fn test_b5_empty_edges_all_none() {
    let mut nodes = vec![make_node("A", None), make_node("B", None)];
    let edges: Vec<GraphEdge> = vec![];

    compute_instability(&mut nodes, &edges);

    for node in &nodes {
        assert_eq!(node.instability, None);
    }
}

/// B-6: f32 rounding to 4 decimal places (precision test).
#[test]
fn test_b6_f32_precision_4dp() {
    let mut nodes = vec![make_node("A", None), make_node("B", None)];
    // Ce=1, Ca=3 => I = 0.25 (exactly representable)
    let edges = vec![make_edge("A", "B", 1), make_edge("B", "A", 3)];

    compute_instability(&mut nodes, &edges);

    let instability = nodes.iter().find(|n| n.id == "A").unwrap().instability;
    assert!(instability.is_some());
    assert_eq!(instability.unwrap(), 0.25);
}

/// B-7: Node exists but is not referenced by any edge.
/// That node should remain as instability=None.
#[test]
fn test_b7_node_not_in_edges() {
    let mut nodes = vec![make_node("A", None), make_node("B", None)];
    // Edge only references A and C; C is NOT in the nodes list.
    // B is in the nodes list but has NO edges referencing it.
    let edges = vec![make_edge("A", "C", 10)];

    compute_instability(&mut nodes, &edges);

    // A has edges, B does not
    assert!(
        nodes.iter().find(|n| n.id == "A").unwrap().instability.is_some()
    );
    assert_eq!(
        nodes.iter().find(|n| n.id == "B").unwrap().instability,
        None
    );
}
