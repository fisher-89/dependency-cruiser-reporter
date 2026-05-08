use super::*;

/// Helper to serialize modules into a JSON string for aggregate
fn make_json(modules: Vec<Module>) -> String {
    let cruise = CruiseResult {
        modules: Some(modules),
        summary: None,
    };
    serde_json::to_string(&cruise).unwrap()
}

/// Helper to serialize modules + summary (with violations) into JSON
fn make_json_with_violations(modules: Vec<Module>, violations: Vec<RawViolation>) -> String {
    let cruise = CruiseResult {
        modules: Some(modules),
        summary: Some(Summary {
            violations: Some(violations),
            error: None,
            warn: None,
            info: None,
            total_cruised: None,
            total_dependencies_cruised: None,
        }),
    };
    serde_json::to_string(&cruise).unwrap()
}

// --- aggregate integration tests ---

#[test]
fn test_aggregate_returns_non_empty_expanded_dirs() {
    let modules: Vec<Module> = (0..50)
        .map(|i| Module {
            source: format!("src/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        })
        .collect();

    let json = make_json(modules);
    let result = aggregate(&json, 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(
        !expanded.is_empty(),
        "expanded_dirs should not be empty for non-empty modules"
    );
    assert!(
        expanded.contains(&"src".to_string()),
        "expanded_dirs should contain 'src'"
    );
}

#[test]
fn test_aggregate_small_project_expands_all() {
    let modules: Vec<Module> = (0..10)
        .map(|i| Module {
            source: format!("src/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        })
        .collect();

    let json = make_json(modules);
    let result = aggregate(&json, 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(!expanded.is_empty(), "expanded_dirs should not be empty");
    assert!(
        expanded.contains(&"".to_string()),
        "small project should expand root"
    );
}

#[test]
fn test_aggregate_large_project_has_expanded_dirs() {
    let mut modules: Vec<Module> = vec![];
    for c in 0..10 {
        for f in 0..10 {
            modules.push(Module {
                source: format!("src/components/dir{}/file{}.ts", c, f),
                dependencies: vec![],
                dependents: None,
                orphan: None,
                valid: None,
                rules: None,
            });
        }
    }
    for i in 0..300 {
        modules.push(Module {
            source: format!("lib/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    let json = make_json(modules);
    let result = aggregate(&json, 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(
        !expanded.is_empty(),
        "expanded_dirs should not be empty even for large projects"
    );
}

#[test]
fn test_aggregate_empty_modules_returns_empty_expanded_dirs() {
    let modules: Vec<Module> = vec![];
    let json = make_json(modules);
    let result = aggregate(&json, 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(
        expanded.is_empty(),
        "empty modules should have empty expanded_dirs"
    );
}

#[test]
fn test_aggregate_with_dependencies() {
    let modules = vec![
        Module {
            source: "src/index.ts".to_string(),
            dependencies: vec![Dependency {
                module: "./utils".to_string(),
                module_system: "es6".to_string(),
                dynamic: None,
                resolved: "src/utils.ts".to_string(),
                core_module: None,
                dependency_types: vec!["local".to_string()],
                circular: None,
                valid: None,
                rules: None,
            }],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "src/utils.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
    ];

    let json = make_json(modules);
    let result = aggregate(&json, 200, None).unwrap();

    // Should have edges between the two modules
    assert!(
        !result.edges.is_empty(),
        "should have edges between modules"
    );
    assert_eq!(result.edges[0].source, "src/index.ts");
    assert_eq!(result.edges[0].target, "src/utils.ts");
    assert_eq!(result.edges[0].edge_type, EdgeType::Local);
}

#[test]
fn test_aggregate_with_violations() {
    let modules = vec![
        Module {
            source: "src/a.ts".to_string(),
            dependencies: vec![Dependency {
                module: "./b".to_string(),
                module_system: "es6".to_string(),
                dynamic: None,
                resolved: "src/b.ts".to_string(),
                core_module: None,
                dependency_types: vec!["local".to_string()],
                circular: None,
                valid: Some(false),
                rules: Some(vec![Rule {
                    severity: Some("error".to_string()),
                    name: Some("no-circular".to_string()),
                }]),
            }],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "src/b.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
    ];

    let violations = vec![RawViolation {
        violation_type: Some("dependency".to_string()),
        from: Some("src/a.ts".to_string()),
        to: Some("src/b.ts".to_string()),
        rule: Some(Rule {
            severity: Some("error".to_string()),
            name: Some("no-circular".to_string()),
        }),
        message: Some("circular dependency".to_string()),
    }];

    let json = make_json_with_violations(modules, violations);
    let result = aggregate(&json, 200, None).unwrap();

    assert_eq!(result.meta.total_violations, 1);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].from, "src/a.ts");
    assert_eq!(result.violations[0].severity, "error");

    // Edge should have error_count
    let edge = &result.edges[0];
    assert_eq!(edge.error_count, Some(1));
}

#[test]
fn test_aggregate_with_explicit_expanded_dirs() {
    let modules: Vec<Module> = (0..10)
        .map(|i| Module {
            source: format!("src/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        })
        .collect();

    let json = make_json(modules);
    let result = aggregate(&json, 200, Some(vec!["src".to_string()])).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert_eq!(expanded, vec!["src".to_string()]);
}

#[test]
fn test_aggregate_expanded_dirs_produces_file_nodes() {
    // Test that expandedDirs actually causes files to be shown as file nodes
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
            source: "src/components/Input.tsx".to_string(),
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

    let json = make_json(modules);

    // With expandedDirs = ["src"], files under src should be file nodes
    let result = aggregate(&json, 200, Some(vec!["src".to_string()])).unwrap();

    // Check that src files are file nodes
    let src_index = result.nodes.iter().find(|n| n.id == "src/index.ts");
    let src_button = result.nodes.iter().find(|n| n.id == "src/components/Button.tsx");
    let src_input = result.nodes.iter().find(|n| n.id == "src/components/Input.tsx");
    let lib_node = result.nodes.iter().find(|n| n.id == "lib");

    assert!(
        src_index.is_some(),
        "src/index.ts should be present as file node"
    );
    assert_eq!(src_index.unwrap().node_type, NodeType::File);

    assert!(
        src_button.is_some(),
        "src/components/Button.tsx should be present as file node"
    );
    assert_eq!(src_button.unwrap().node_type, NodeType::File);

    assert!(
        src_input.is_some(),
        "src/components/Input.tsx should be present as file node"
    );
    assert_eq!(src_input.unwrap().node_type, NodeType::File);

    // lib should be collapsed to a directory node (not expanded)
    assert!(lib_node.is_some(), "lib should be present as directory node");
    assert_eq!(lib_node.unwrap().node_type, NodeType::Directory);
}

#[test]
fn test_aggregate_expanded_dirs_nested() {
    // Test expanding a nested directory (src/components)
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
            source: "src/utils/format.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
    ];

    let json = make_json(modules);

    // Expand only src/components, not src
    let result = aggregate(
        &json,
        200,
        Some(vec!["src/components".to_string()]),
    )
    .unwrap();

    // src/components/Button.tsx should be a file node
    let button = result.nodes.iter().find(|n| n.id == "src/components/Button.tsx");
    assert!(
        button.is_some(),
        "src/components/Button.tsx should be a file node"
    );
    assert_eq!(button.unwrap().node_type, NodeType::File);

    // src/index.ts should NOT be a file node (src is not expanded)
    let src_index = result.nodes.iter().find(|n| n.id == "src/index.ts");
    assert!(
        src_index.is_none(),
        "src/index.ts should not be a separate node when src is not expanded"
    );

    // src should be a directory node
    let src_dir = result.nodes.iter().find(|n| n.id == "src");
    assert!(src_dir.is_some(), "src should be a directory node");
    assert_eq!(src_dir.unwrap().node_type, NodeType::Directory);
}

// --- wasm_aggregate tests ---
// These tests only run on wasm32 target (via wasm-pack test --node)

#[cfg(target_arch = "wasm32")]
mod wasm_tests {
    use super::*;
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn test_wasm_aggregate_basic() {
        let modules: Vec<Module> = (0..10)
            .map(|i| Module {
                source: format!("src/mod{}.ts", i),
                dependencies: vec![],
                dependents: None,
                orphan: None,
                valid: None,
                rules: None,
            })
            .collect();
        let json = make_json(modules);

        let result = aggregate(&json, 200, None);
        assert!(
            result.is_ok(),
            "wasm_aggregate should succeed with valid input"
        );

        let graph = result.unwrap();
        assert!(!graph.nodes.is_empty(), "result should have nodes");
        assert!(
            !graph.meta.expanded_dirs.unwrap().is_empty(),
            "result should have expanded_dirs"
        );
    }

    #[wasm_bindgen_test]
    fn test_wasm_aggregate_invalid_json() {
        let result = aggregate("invalid json", 200, None);
        assert!(
            result.is_err(),
            "wasm_aggregate should return error for invalid JSON"
        );
    }

    #[wasm_bindgen_test]
    fn test_wasm_aggregate_with_expanded_dirs() {
        let modules: Vec<Module> = (0..10)
            .map(|i| Module {
                source: format!("src/mod{}.ts", i),
                dependencies: vec![],
                dependents: None,
                orphan: None,
                valid: None,
                rules: None,
            })
            .collect();
        let json = make_json(modules);

        let result = aggregate(&json, 200, Some(vec!["src".to_string()]));
        assert!(
            result.is_ok(),
            "wasm_aggregate with expandedDirs should succeed"
        );
    }

    #[wasm_bindgen_test]
    fn test_wasm_aggregate_with_dependencies() {
        let modules = vec![
            Module {
                source: "src/app.ts".to_string(),
                dependencies: vec![Dependency {
                    module: "./lib".to_string(),
                    module_system: "es6".to_string(),
                    dynamic: None,
                    resolved: "src/lib.ts".to_string(),
                    core_module: None,
                    dependency_types: vec!["local".to_string()],
                    circular: None,
                    valid: None,
                    rules: None,
                }],
                dependents: None,
                orphan: None,
                valid: None,
                rules: None,
            },
            Module {
                source: "src/lib.ts".to_string(),
                dependencies: vec![Dependency {
                    module: "lodash".to_string(),
                    module_system: "cjs".to_string(),
                    dynamic: None,
                    resolved: "node_modules/lodash/index.js".to_string(),
                    core_module: None,
                    dependency_types: vec!["npm".to_string()],
                    circular: None,
                    valid: None,
                    rules: None,
                }],
                dependents: None,
                orphan: None,
                valid: None,
                rules: None,
            },
        ];
        let json = make_json(modules);

        let result = aggregate(&json, 200, None);
        assert!(
            result.is_ok(),
            "wasm_aggregate with dependencies should succeed"
        );
    }

    #[wasm_bindgen_test]
    fn test_wasm_aggregate_empty_modules() {
        let json = make_json(vec![]);
        let result = aggregate(&json, 200, None);
        assert!(result.is_ok(), "wasm_aggregate should handle empty modules");
    }

    #[wasm_bindgen_test]
    fn test_aggregate_invalid_json() {
        let result = aggregate("not valid json", 200, None);
        assert!(result.is_err(), "should return error for invalid JSON");
    }
}

// --- Layout overlap tests ---

/// Helper to check if two rects overlap
fn rects_overlap(a: &Rect, b: &Rect) -> bool {
    a.left < b.left + b.width
        && a.left + a.width > b.left
        && a.top < b.top + b.height
        && a.top + a.height > b.top
}

#[test]
fn test_sample_no_sibling_combo_overlap() {
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
            source: "src/app.ts".to_string(),
            dependencies: vec![Dependency {
                module: "./utils".to_string(),
                module_system: "es6".to_string(),
                dynamic: None,
                resolved: "src/utils.ts".to_string(),
                core_module: None,
                dependency_types: vec!["local".to_string()],
                circular: None,
                valid: None,
                rules: None,
            }],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "src/utils.ts".to_string(),
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
            source: "src/components/Input.tsx".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
    ];

    let json = make_json(modules);
    let graph = aggregate(&json, 200, None).unwrap();

    // Group combos by parent
    let mut by_parent: std::collections::HashMap<Option<String>, Vec<&GraphCombo>> =
        std::collections::HashMap::new();
    for c in &graph.combos {
        by_parent.entry(c.combo.clone()).or_default().push(c);
    }

    // Check no siblings overlap
    for (parent, siblings) in &by_parent {
        for i in 0..siblings.len() {
            for j in (i + 1)..siblings.len() {
                let a = siblings[i].rect.as_ref().unwrap();
                let b = siblings[j].rect.as_ref().unwrap();

                assert!(
                    !rects_overlap(a, b),
                    "Sibling combos {:?} and {:?} under parent {:?} overlap:\n  {:?}\n  {:?}",
                    siblings[i].id,
                    siblings[j].id,
                    parent,
                    a,
                    b
                );
            }
        }
    }
}

#[test]
fn test_larger_project_no_overlap() {
    // Larger test case: multiple directories with nested structures
    let mut modules = vec![
        Module {
            source: "src/index.ts".to_string(),
            dependencies: vec![
                Dependency {
                    module: "./app".to_string(),
                    module_system: "es6".to_string(),
                    dynamic: None,
                    resolved: "src/app.ts".to_string(),
                    core_module: None,
                    dependency_types: vec!["local".to_string()],
                    circular: None,
                    valid: None,
                    rules: None,
                },
                Dependency {
                    module: "./components/App".to_string(),
                    module_system: "es6".to_string(),
                    dynamic: None,
                    resolved: "src/components/App.tsx".to_string(),
                    core_module: None,
                    dependency_types: vec!["local".to_string()],
                    circular: None,
                    valid: None,
                    rules: None,
                },
            ],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "src/app.ts".to_string(),
            dependencies: vec![Dependency {
                module: "./utils/format".to_string(),
                module_system: "es6".to_string(),
                dynamic: None,
                resolved: "src/utils/format.ts".to_string(),
                core_module: None,
                dependency_types: vec!["local".to_string()],
                circular: None,
                valid: None,
                rules: None,
            }],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "src/components/App.tsx".to_string(),
            dependencies: vec![
                Dependency {
                    module: "./Button".to_string(),
                    module_system: "es6".to_string(),
                    dynamic: None,
                    resolved: "src/components/Button.tsx".to_string(),
                    core_module: None,
                    dependency_types: vec!["local".to_string()],
                    circular: None,
                    valid: None,
                    rules: None,
                },
                Dependency {
                    module: "./Input".to_string(),
                    module_system: "es6".to_string(),
                    dynamic: None,
                    resolved: "src/components/Input.tsx".to_string(),
                    core_module: None,
                    dependency_types: vec!["local".to_string()],
                    circular: None,
                    valid: None,
                    rules: None,
                },
            ],
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
            source: "src/components/Input.tsx".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "src/utils/format.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "src/utils/style.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "lib/helper.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "lib/validator.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
        Module {
            source: "test/main.test.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        },
    ];

    // Add more files to stress test the layout
    for i in 0..10 {
        modules.push(Module {
            source: format!("src/features/feature{}/index.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    let json = make_json(modules);
    let graph = aggregate(&json, 200, None).unwrap();

    println!("Nodes: {}", graph.nodes.len());
    println!("Combos: {}", graph.combos.len());
    for c in &graph.combos {
        println!(
            "  {} (parent: {:?}): {:?}",
            c.id, c.combo, c.rect
        );
    }

    // Group combos by parent
    let mut by_parent: std::collections::HashMap<Option<String>, Vec<&GraphCombo>> =
        std::collections::HashMap::new();
    for c in &graph.combos {
        by_parent.entry(c.combo.clone()).or_default().push(c);
    }

    // Check no siblings overlap
    for (parent, siblings) in &by_parent {
        for i in 0..siblings.len() {
            for j in (i + 1)..siblings.len() {
                let a = siblings[i].rect.as_ref().unwrap();
                let b = siblings[j].rect.as_ref().unwrap();

                assert!(
                    !rects_overlap(a, b),
                    "Sibling combos {:?} and {:?} under parent {:?} overlap:\n  {:?}\n  {:?}",
                    siblings[i].id,
                    siblings[j].id,
                    parent,
                    a,
                    b
                );
            }
        }
    }
}
