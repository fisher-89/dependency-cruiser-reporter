//! Tests for `GraphNode` JSON serialization -- `instability` field behavior.
//!
//! Coverage targets (from test-design.md):
//! - AC-2: GraphNode JSON serialization includes `instability` field
//! - F-6: JSON serialization with `instability = Some(0.2941)`
//! - F-7: JSON serialization with `instability = None` (field skipped)
//! - R-7: JSON deserialization backward compatible (missing field = None)
//! - B-9: `instability = Some(0.0)` serialization
//! - B-10: `instability = Some(1.0)` serialization
//! - B-11: Old format JSON deserialization (no instability key)
//!
//! NOTE: The `instability` field has been added to `GraphNode` in types.rs.
//! All tests are enabled and active.

use super::*;

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/// Create a minimal GraphNode with a given instability value.
fn make_node_with_instability(id: &str, label: &str, instability: Option<f32>) -> GraphNode {
    GraphNode {
        id: id.to_string(),
        label: label.to_string(),
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

// ===========================================================================
// Forward ACs
// ===========================================================================

/// F-6: GraphNode JSON serialization includes instability field.
///
/// When `instability = Some(0.2941)`, the serialized JSON should contain
/// `"instability": 0.2941`.
#[test]
fn test_f6_serialization_includes_instability() {
    let node = make_node_with_instability("test-id", "Test Node", Some(0.2941));

    let json = serde_json::to_string(&node).expect("Serialization should succeed");

    assert!(
        json.contains("\"instability\""),
        "JSON should contain instability key. Got: {}",
        json
    );
    assert!(
        json.contains("0.2941"),
        "JSON should contain instability value 0.2941. Got: {}",
        json
    );
}

/// F-7: GraphNode JSON serialization skips field when instability is None.
///
/// When `instability = None`, the serialized JSON should NOT contain
/// the `"instability"` key (due to `#[serde(skip_serializing_if = "Option::is_none")]`).
#[test]
fn test_f7_serialization_skips_none() {
    let node = make_node_with_instability("test-id", "Test Node", None);

    let json = serde_json::to_string(&node).expect("Serialization should succeed");

    assert!(
        !json.contains("\"instability\""),
        "JSON should NOT contain instability key when None. Got: {}",
        json
    );
}

// ===========================================================================
// Reverse ACs
// ===========================================================================

/// R-7: Old JSON format (without instability field) deserializes correctly.
///
/// A JSON payload without the `instability` key should produce
/// `GraphNode.instability = None`.
#[test]
fn test_r7_deserialization_missing_field_is_none() {
    let json = r#"{"id":"a","label":"A","node_type":"file","violation_count":0}"#;

    let node: GraphNode = serde_json::from_str(json).expect("Deserialization should succeed");

    assert_eq!(
        node.instability, None,
        "Missing instability field should deserialize to None"
    );
}

// ===========================================================================
// Boundary Cases
// ===========================================================================

/// B-9: instability = Some(0.0) serializes as `"instability":0.0`.
#[test]
fn test_b9_instability_zero_serializes() {
    let node = make_node_with_instability("zero", "Zero", Some(0.0));

    let json = serde_json::to_string(&node).expect("Serialization should succeed");

    assert!(
        json.contains("\"instability\""),
        "JSON should contain instability key even when value is 0.0. Got: {}",
        json
    );
}

/// B-10: instability = Some(1.0) serializes as `"instability":1.0`.
#[test]
fn test_b10_instability_one_serializes() {
    let node = make_node_with_instability("one", "One", Some(1.0));

    let json = serde_json::to_string(&node).expect("Serialization should succeed");

    assert!(
        json.contains("\"instability\""),
        "JSON should contain instability key when value is 1.0. Got: {}",
        json
    );
}

/// B-11: Old format JSON with only minimal fields deserializes correctly.
///
/// Verify that a JSON string containing no optional fields at all
/// (including no instability, path, orphan, children, combo, rect)
/// deserializes properly with instability = None.
#[test]
fn test_b11_minimal_json_deserialization() {
    let json = r#"{"id":"min","label":"Min","node_type":"package","violation_count":0}"#;

    let node: GraphNode = serde_json::from_str(json).expect("Deserialization of minimal JSON should succeed");

    assert_eq!(node.id, "min");
    assert_eq!(node.label, "Min");
    assert_eq!(node.node_type, NodeType::Package);
    assert_eq!(node.violation_count, 0);
    assert_eq!(node.instability, None);
    assert_eq!(node.path, None);
}

/// Round-trip: Serialize a GraphNode with instability, then deserialize it
/// and verify the field is preserved correctly.
#[test]
fn test_round_trip_instability_preserved() {
    let original = make_node_with_instability("rt", "RoundTrip", Some(0.3333));

    let json = serde_json::to_string(&original).expect("Serialization should succeed");
    let deserialized: GraphNode = serde_json::from_str(&json).expect("Deserialization should succeed");

    assert_eq!(deserialized.instability, Some(0.3333));
}
