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
            core_module: None,
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
            core_module: None,
        })
        .collect();

    let json = make_json(modules);
    let result = aggregate(&json, 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(!expanded.is_empty(), "expanded_dirs should not be empty");
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
                core_module: None,
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
            core_module: None,
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
            core_module: None,
        },
        Module {
            source: "src/utils.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
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

    // instability assertions
    let index_node = result.nodes.iter().find(|n| n.id == "src/index.ts").unwrap();
    assert_eq!(index_node.instability, Some(1.0), "src/index.ts has Ce=1, Ca=0, I=1.0");

    let utils_node = result.nodes.iter().find(|n| n.id == "src/utils.ts").unwrap();
    assert_eq!(utils_node.instability, Some(0.0), "src/utils.ts has Ce=0, Ca=1, I=0.0");
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
            core_module: None,
        },
        Module {
            source: "src/b.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
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
            core_module: None,
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
            source: "src/components/Input.tsx".to_string(),
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

    let json = make_json(modules);

    // With expandedDirs = ["src"], only files directly under "src" are file nodes.
    // Files under "src/components" have direct parent "src/components" which is NOT expanded,
    // so they are collapsed into a directory node.
    let result = aggregate(&json, 200, Some(vec!["src".to_string()])).unwrap();

    // Check that src files are file nodes
    let src_index = result.nodes.iter().find(|n| n.id == "src/index.ts");
    let components_dir = result
        .nodes
        .iter()
        .find(|n| n.id == "src/components");
    let lib_node = result.nodes.iter().find(|n| n.id == "lib");

    assert!(
        src_index.is_some(),
        "src/index.ts should be present as file node"
    );
    assert_eq!(src_index.unwrap().node_type, NodeType::File);

    // src/components should be a directory node (its parent "src" is expanded,
    // but "src/components" itself is NOT in expanded_set)
    assert!(
        components_dir.is_some(),
        "src/components should be present as directory node"
    );
    assert_eq!(components_dir.unwrap().node_type, NodeType::Directory);

    // lib should be collapsed to a directory node (not expanded)
    assert!(
        lib_node.is_some(),
        "lib should be present as directory node"
    );
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
            source: "src/utils/format.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
        },
    ];

    let json = make_json(modules);

    // Expand only src/components, not src
    let result = aggregate(&json, 200, Some(vec!["src/components".to_string()])).unwrap();

    // src/components/Button.tsx should be a file node
    let button = result
        .nodes
        .iter()
        .find(|n| n.id == "src/components/Button.tsx");
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
                core_module: None,
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
                core_module: None,
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
                core_module: None,
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
                core_module: None,
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

    // --- Instability integration tests ---
    //
    // These tests verify that the `aggregate()` pipeline correctly calls
    // `compute_instability` and populates `instability` on GraphNode.

    /// F-8: aggregate pipeline populates instability for connected nodes.
    #[wasm_bindgen_test]
    fn test_aggregate_pipeline_populates_instability() {
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
                core_module: None,
            },
            Module {
                source: "src/utils.ts".to_string(),
                dependencies: vec![],
                dependents: None,
                orphan: None,
                valid: None,
                rules: None,
                core_module: None,
            },
        ];

        let json = make_json(modules);
        let result = aggregate(&json, 200, None).unwrap();

        // Both nodes should exist
        let index_node = result
            .nodes
            .iter()
            .find(|n| n.id == "src/index.ts")
            .expect("index node should exist");
        let utils_node = result
            .nodes
            .iter()
            .find(|n| n.id == "src/utils.ts")
            .expect("utils node should exist");

        // Connected nodes should have instability != None
        assert!(
            index_node.instability.is_some(),
            "Connected node 'src/index.ts' should have instability set"
        );
        // utils is a sink (Ca=1, Ce=0), instability should be 0.0
        assert!(
            utils_node.instability.is_some(),
            "Connected node 'src/utils.ts' should have instability set"
        );
    }

    /// F-8 variant: aggregate pipeline with more complex dependencies
    /// verifies instability values are correct.
    #[wasm_bindgen_test]
    fn test_aggregate_instability_values() {
        let modules = vec![
            Module {
                source: "src/a.ts".to_string(),
                dependencies: vec![
                    Dependency {
                        module: "./b".to_string(),
                        module_system: "es6".to_string(),
                        dynamic: None,
                        resolved: "src/b.ts".to_string(),
                        core_module: None,
                        dependency_types: vec!["local".to_string()],
                        circular: None,
                        valid: None,
                        rules: None,
                    },
                    Dependency {
                        module: "./c".to_string(),
                        module_system: "es6".to_string(),
                        dynamic: None,
                        resolved: "src/c.ts".to_string(),
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
                core_module: None,
            },
            Module {
                source: "src/b.ts".to_string(),
                dependencies: vec![Dependency {
                    module: "./c".to_string(),
                    module_system: "es6".to_string(),
                    dynamic: None,
                    resolved: "src/c.ts".to_string(),
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
                core_module: None,
            },
            Module {
                source: "src/c.ts".to_string(),
                dependencies: vec![],
                dependents: None,
                orphan: None,
                valid: None,
                rules: None,
                core_module: None,
            },
        ];

        let json = make_json(modules);
        let result = aggregate(&json, 200, None).unwrap();

        // a.ts: Ce=2 (deps to b and c), Ca=0, I=1.0
        let a = result.nodes.iter().find(|n| n.id == "src/a.ts").unwrap();
        assert!(a.instability.is_some());
        assert_eq!(a.instability.unwrap(), 1.0);

        // b.ts: Ce=1 (dep to c), Ca=1 (dep from a), I=0.5
        let b = result.nodes.iter().find(|n| n.id == "src/b.ts").unwrap();
        assert!(b.instability.is_some());
        assert!((b.instability.unwrap() - 0.5).abs() < 0.001);

        // c.ts: Ce=0, Ca=2 (from a and b), I=0.0
        let c = result.nodes.iter().find(|n| n.id == "src/c.ts").unwrap();
        assert!(c.instability.is_some());
        assert_eq!(c.instability.unwrap(), 0.0);
    }

    /// F-8 variant: isolated module has instability=None in aggregate output.
    #[wasm_bindgen_test]
    fn test_aggregate_isolated_node_has_no_instability() {
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
                    valid: None,
                    rules: None,
                }],
                dependents: None,
                orphan: None,
                valid: None,
                rules: None,
                core_module: None,
            },
            Module {
                source: "src/b.ts".to_string(),
                dependencies: vec![],
                dependents: None,
                orphan: None,
                valid: None,
                rules: None,
                core_module: None,
            },
            Module {
                source: "isolated.ts".to_string(),
                dependencies: vec![],
                dependents: None,
                orphan: None,
                valid: None,
                rules: None,
                core_module: None,
            },
        ];

        let json = make_json(modules);
        let result = aggregate(&json, 200, None).unwrap();

        // isolated.ts has no dependencies and no dependents
        let isolated = result
            .nodes
            .iter()
            .find(|n| n.id == "isolated.ts")
            .expect("isolated.ts should exist as a node");

        assert_eq!(
            isolated.instability, None,
            "Isolated module 'isolated.ts' should have instability=None"
        );
    }
}

/// Helper to check if two rects overlap
fn rects_overlap(a: &Rect, b: &Rect) -> bool {
    a.left < b.left + b.width
        && a.left + a.width > b.left
        && a.top < b.top + b.height
        && a.top + a.height > b.top
}

// --- Layout overlap tests ---

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
            core_module: None,
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
            core_module: None,
        },
        Module {
            source: "src/utils.ts".to_string(),
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
            source: "src/components/Input.tsx".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
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
            core_module: None,
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
            core_module: None,
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
            source: "src/components/Input.tsx".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
        },
        Module {
            source: "src/utils/format.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
        },
        Module {
            source: "src/utils/style.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
        },
        Module {
            source: "lib/helper.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
        },
        Module {
            source: "lib/validator.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
        },
        Module {
            source: "test/main.test.ts".to_string(),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
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
            core_module: None,
        });
    }

    let json = make_json(modules);
    let graph = aggregate(&json, 200, None).unwrap();

    println!("Nodes: {}", graph.nodes.len());
    println!("Combos: {}", graph.combos.len());
    for c in &graph.combos {
        println!("  {} (parent: {:?}): {:?}", c.id, c.combo, c.rect);
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
