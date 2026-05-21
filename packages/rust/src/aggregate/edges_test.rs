use super::*;

#[test]
fn test_edge_type_detection() {
    assert_eq!(detect_edge_type(&["local".to_string()]), EdgeType::Local);
    assert_eq!(detect_edge_type(&["npm".to_string()]), EdgeType::Npm);
    assert_eq!(detect_edge_type(&["core".to_string()]), EdgeType::Core);
    assert_eq!(
        detect_edge_type(&["dynamic".to_string()]),
        EdgeType::Dynamic
    );
}