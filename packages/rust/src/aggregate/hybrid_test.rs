use super::*;

#[test]
fn test_is_path_expanded() {
    let set: HashSet<&str> = ["src", "src/components"].into_iter().collect();
    assert!(is_path_expanded("src/index.ts", &set));
    assert!(is_path_expanded("src/components/Button.tsx", &set));
    assert!(!is_path_expanded("lib/utils.ts", &set));
    assert!(is_path_expanded("index.ts", &set));
}

#[test]
fn test_is_path_expanded_root() {
    let set: HashSet<&str> = [].into_iter().collect();
    assert!(is_path_expanded("index.ts", &set));
    assert!(is_path_expanded("src", &set));
    assert!(!is_path_expanded("src/mod.ts", &set));
}

#[test]
fn test_is_path_expanded_ancestor() {
    // Only the direct parent directory matters — ancestor expansion does NOT
    // cascade to nested subdirectories
    let set: HashSet<&str> = ["src"].into_iter().collect();
    assert!(
        is_path_expanded("src/index.ts", &set),
        "direct child of src"
    );
    assert!(
        !is_path_expanded("src/components/Button.tsx", &set),
        "nested file — direct parent (src/components) is not expanded"
    );
    assert!(
        !is_path_expanded("src/utils/helpers/format.ts", &set),
        "deeply nested file — direct parent not expanded"
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
            core_module: None,
        },
        Module {
            source: "src/components/Button.tsx".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
        },
        Module {
            source: "lib/utils.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
        },
    ];

    let violation_counts = std::collections::HashMap::new();
    let expanded_set: HashSet<&str> = ["src"].into_iter().collect();

    let (nodes, _, _) = build_hybrid_nodes(&modules, &violation_counts, &expanded_set);

    // src/index.ts should be a file node (direct parent "src" is expanded)
    let src_index = nodes.iter().find(|n| n.id == "src/index.ts");
    assert!(src_index.is_some(), "src/index.ts should be a file node");
    assert_eq!(src_index.unwrap().node_type, NodeType::File);

    // src/components/Button.tsx should be collapsed into a directory node
    // because its direct parent "src/components" is NOT in expanded_set
    let components_dir = nodes.iter().find(|n| n.id == "src/components");
    assert!(
        components_dir.is_some(),
        "src/components should be a directory node (parent not expanded)"
    );
    assert_eq!(components_dir.unwrap().node_type, NodeType::Directory);

    let lib_node = nodes.iter().find(|n| n.id == "lib");
    assert!(lib_node.is_some(), "lib should be a directory node");
    assert_eq!(lib_node.unwrap().node_type, NodeType::Directory);
}
