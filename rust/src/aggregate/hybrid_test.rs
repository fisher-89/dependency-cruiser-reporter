use super::*;

#[test]
fn test_is_path_expanded() {
    let set: HashSet<&str> = ["src", "src/components"].into_iter().collect();
    assert!(is_path_expanded("src/index.ts", &set));
    assert!(is_path_expanded("src/components/Button.tsx", &set));
    assert!(!is_path_expanded("lib/utils.ts", &set));
    assert!(!is_path_expanded("index.ts", &set));
}

#[test]
fn test_is_path_expanded_root() {
    let set: HashSet<&str> = [""].into_iter().collect();
    assert!(is_path_expanded("index.ts", &set));
    assert!(is_path_expanded("src/mod.ts", &set));
}

#[test]
fn test_is_path_expanded_ancestor() {
    // If "src" is expanded, all files under src (including nested dirs) should be expanded
    let set: HashSet<&str> = ["src"].into_iter().collect();
    assert!(is_path_expanded("src/index.ts", &set), "direct child of src");
    assert!(
        is_path_expanded("src/components/Button.tsx", &set),
        "nested file under src"
    );
    assert!(
        is_path_expanded("src/utils/helpers/format.ts", &set),
        "deeply nested file under src"
    );
    assert!(!is_path_expanded("lib/utils.ts", &set), "file outside src");
}

#[test]
fn test_build_hybrid_nodes_with_expanded_dirs() {
    let modules = vec![
        Module {
            source: "src/index.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "src/components/Button.tsx".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "lib/utils.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
    ];

    let violation_counts = std::collections::HashMap::new();
    let expanded_set: HashSet<&str> = ["src"].into_iter().collect();

    let (nodes, _, _) = build_hybrid_nodes(&modules, &violation_counts, &expanded_set);

    // src/index.ts and src/components/Button.tsx should be file nodes (expanded)
    let src_index = nodes.iter().find(|n| n.id == "src/index.ts");
    let src_button = nodes.iter().find(|n| n.id == "src/components/Button.tsx");
    let lib_node = nodes.iter().find(|n| n.id == "lib");

    assert!(src_index.is_some(), "src/index.ts should be a file node");
    assert_eq!(src_index.unwrap().node_type, NodeType::File);

    assert!(
        src_button.is_some(),
        "src/components/Button.tsx should be a file node"
    );
    assert_eq!(src_button.unwrap().node_type, NodeType::File);

    assert!(lib_node.is_some(), "lib should be a directory node");
    assert_eq!(lib_node.unwrap().node_type, NodeType::Directory);
}