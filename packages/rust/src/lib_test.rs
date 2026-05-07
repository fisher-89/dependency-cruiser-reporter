use super::*;
use super::aggregate::{self, detect_edge_type, TARGET_NODE_BUDGET};
use std::collections::HashMap;

/// Helper to serialize modules into a JSON string for aggregate_from_str
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

// --- aggregate_from_str tests (replaces parse_and_aggregate tests) ---

#[test]
fn test_aggregate_from_str_returns_non_empty_expanded_dirs() {
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
    let result = aggregate_from_str(&json, 200, None).unwrap();

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
fn test_aggregate_from_str_small_project_expands_all() {
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
    let result = aggregate_from_str(&json, 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(!expanded.is_empty(), "expanded_dirs should not be empty");
    assert!(
        expanded.contains(&"".to_string()),
        "small project should expand root"
    );
}

#[test]
fn test_aggregate_from_str_large_project_has_expanded_dirs() {
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
    let result = aggregate_from_str(&json, 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(
        !expanded.is_empty(),
        "expanded_dirs should not be empty even for large projects"
    );
}

#[test]
fn test_aggregate_from_str_empty_modules_returns_empty_expanded_dirs() {
    let modules: Vec<Module> = vec![];
    let json = make_json(modules);
    let result = aggregate_from_str(&json, 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(
        expanded.is_empty(),
        "empty modules should have empty expanded_dirs"
    );
}

#[test]
fn test_aggregate_from_str_invalid_json() {
    let result = aggregate_from_str("not valid json", 200, None);
    assert!(result.is_err(), "should return error for invalid JSON");
}

#[test]
fn test_aggregate_from_str_with_dependencies() {
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
    let result = aggregate_from_str(&json, 200, None).unwrap();

    // Should have edges between the two modules
    assert!(!result.edges.is_empty(), "should have edges between modules");
    assert_eq!(result.edges[0].source, "src/index.ts");
    assert_eq!(result.edges[0].target, "src/utils.ts");
    assert_eq!(result.edges[0].edge_type, EdgeType::Local);
}

#[test]
fn test_aggregate_from_str_with_violations() {
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
    let result = aggregate_from_str(&json, 200, None).unwrap();

    assert_eq!(result.meta.total_violations, 1);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].from, "src/a.ts");
    assert_eq!(result.violations[0].severity, "error");

    // Edge should have error_count
    let edge = &result.edges[0];
    assert_eq!(edge.error_count, Some(1));
}

#[test]
fn test_aggregate_from_str_with_explicit_expanded_dirs() {
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
    let result = aggregate_from_str(&json, 200, Some(vec!["src".to_string()])).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert_eq!(expanded, vec!["src".to_string()]);
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
        assert!(result.is_ok(), "wasm_aggregate should succeed with valid input");

        let value = result.unwrap();
        assert!(value.is_object(), "result should be a JS object");
    }

    #[wasm_bindgen_test]
    fn test_wasm_aggregate_invalid_json() {
        let result = aggregate("invalid json", 200, None);
        assert!(result.is_err(), "wasm_aggregate should return error for invalid JSON");
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

        let expanded = Array::new();
        expanded.push(&JsValue::from_str("src"));

        let result = aggregate(&json, 200, Some(expanded));
        assert!(result.is_ok(), "wasm_aggregate with expandedDirs should succeed");
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
        assert!(result.is_ok(), "wasm_aggregate with dependencies should succeed");
    }

    #[wasm_bindgen_test]
    fn test_wasm_aggregate_empty_modules() {
        let json = make_json(vec![]);
        let result = aggregate(&json, 200, None);
        assert!(result.is_ok(), "wasm_aggregate should handle empty modules");
    }
}

// --- Existing unit tests (unchanged) ---

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
fn test_compute_auto_expanded_dirs_small_project() {
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
    let violation_counts = HashMap::new();
    let dirs = aggregate::compute_auto_expanded_dirs(&modules, &violation_counts);
    assert!(dirs.contains(&"src".to_string()));
    assert!(dirs.contains(&"".to_string()));
}

#[test]
fn test_compute_auto_expanded_dirs_empty() {
    let modules: Vec<Module> = vec![];
    let violation_counts = HashMap::new();
    let dirs = aggregate::compute_auto_expanded_dirs(&modules, &violation_counts);
    assert!(dirs.is_empty());
}

#[test]
fn test_smart_expansion_respects_budget() {
    let modules: Vec<Module> = (0..500)
        .map(|i| Module {
            source: format!("src/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        })
        .collect();
    let violation_counts = HashMap::new();
    let dirs = aggregate::compute_auto_expanded_dirs(&modules, &violation_counts);
    assert!(!dirs.contains(&"src".to_string()));
}

#[test]
fn test_smart_expansion_respects_direct_children_limit() {
    let mut modules: Vec<Module> = (0..60)
        .map(|i| Module {
            source: format!("src/dense/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        })
        .collect();
    for i in 0..10 {
        modules.push(Module {
            source: format!("src/sparse/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }
    for i in 0..250 {
        modules.push(Module {
            source: format!("lib/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    let violation_counts = HashMap::new();
    let dirs = aggregate::compute_auto_expanded_dirs(&modules, &violation_counts);

    assert!(dirs.contains(&"src".to_string()));
    assert!(!dirs.contains(&"src/dense".to_string()));
    assert!(dirs.contains(&"src/sparse".to_string()));
    assert!(!dirs.contains(&"lib".to_string()));
}

#[test]
fn test_smart_expansion_expands_small_dirs() {
    let mut modules: Vec<Module> = (0..20)
        .map(|i| Module {
            source: format!("small/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        })
        .collect();
    for i in 0..60 {
        modules.push(Module {
            source: format!("big/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }
    for i in 0..250 {
        modules.push(Module {
            source: format!("other/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    let violation_counts = HashMap::new();
    let dirs = aggregate::compute_auto_expanded_dirs(&modules, &violation_counts);

    assert!(dirs.contains(&"small".to_string()));
    assert!(!dirs.contains(&"big".to_string()));
    assert!(!dirs.contains(&"other".to_string()));
}

#[test]
fn test_smart_expansion_prioritizes_violations() {
    let mut modules: Vec<Module> = vec![];
    for i in 0..10 {
        modules.push(Module {
            source: format!("bugs/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }
    for i in 0..10 {
        modules.push(Module {
            source: format!("clean/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    let mut violation_counts: HashMap<String, u32> = HashMap::new();
    for i in 0..10 {
        violation_counts.insert(format!("bugs/mod{}.ts", i), 3);
    }

    let dirs = aggregate::compute_auto_expanded_dirs(&modules, &violation_counts);

    assert!(dirs.contains(&"bugs".to_string()));
    assert!(dirs.contains(&"clean".to_string()));
}

#[test]
fn test_real_world_scale() {
    let mut modules: Vec<Module> = vec![];

    for c in 0..35 {
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

    for i in 0..60 {
        modules.push(Module {
            source: format!("src/utils/util{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    modules.push(Module {
        source: "src/index.ts".to_string(),
        dependencies: vec![],
        dependents: None,
        orphan: None,
        valid: None,
        rules: None,
    });
    modules.push(Module {
        source: "src/App.tsx".to_string(),
        dependencies: vec![],
        dependents: None,
        orphan: None,
        valid: None,
        rules: None,
    });

    for i in 0..250 {
        modules.push(Module {
            source: format!("lib/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    for i in 0..2700 {
        modules.push(Module {
            source: format!("vendor/pkg{}/index.js", i % 100),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    let violation_counts = HashMap::new();
    let dirs = aggregate::compute_auto_expanded_dirs(&modules, &violation_counts);

    assert!(dirs.contains(&"src".to_string()), "src has 4 direct children <= 50, should expand");
    assert!(!dirs.contains(&"lib".to_string()), "lib has 250 direct children > 50");
    assert!(!dirs.contains(&"vendor".to_string()), "vendor has 100 direct children > 50");

    let expanded_set: HashSet<&str> = dirs.iter().map(|s| s.as_str()).collect();
    let (nodes, _, _) = build_hybrid_nodes(&modules, &violation_counts, &expanded_set);
    assert!(
        nodes.len() <= TARGET_NODE_BUDGET + 50,
        "Final node count {} should be close to budget {}",
        nodes.len(),
        TARGET_NODE_BUDGET
    );
}

#[test]
fn test_relative_path_with_single_top_level_dir() {
    let mut modules: Vec<Module> = vec![];

    for i in 0..20 {
        modules.push(Module {
            source: format!("../wpsweb/client/app/applications/dbsheet/helpers/helper{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    for i in 0..30 {
        modules.push(Module {
            source: format!("../wpsweb/client/app/common/util{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    for i in 0..500 {
        modules.push(Module {
            source: format!("../wpsweb/client/app/applications/spreadsheet/core/mod{}.ts", i),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
        });
    }

    let violation_counts = HashMap::new();
    let dirs = aggregate::compute_auto_expanded_dirs(&modules, &violation_counts);

    assert!(!dirs.is_empty(), "Should expand some small leaf directories");

    let expanded_set: HashSet<&str> = dirs.iter().map(|s| s.as_str()).collect();
    let (nodes, _, _) = build_hybrid_nodes(&modules, &violation_counts, &expanded_set);

    assert!(
        nodes.len() <= TARGET_NODE_BUDGET,
        "Final node count {} should be under budget {}",
        nodes.len(),
        TARGET_NODE_BUDGET
    );

    let dir_nodes: Vec<_> = nodes.iter().filter(|n| matches!(n.node_type, NodeType::Directory)).collect();
    assert!(
        dir_nodes.len() <= 3,
        "Should have at most 3 directory nodes, got {}",
        dir_nodes.len()
    );
}
