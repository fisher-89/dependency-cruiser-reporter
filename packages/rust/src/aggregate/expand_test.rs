use super::super::hybrid::build_hybrid_nodes;
use super::*;
use crate::types::{Module, NodeType};
use std::collections::{HashMap, HashSet};

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
            core_module: None,
        })
        .collect();
    let violation_counts = HashMap::new();
    let dirs = compute_auto_expanded_dirs(&modules, &violation_counts);
    assert!(dirs.contains(&"src".to_string()));
    assert!(dirs.contains(&"".to_string()));
}

#[test]
fn test_compute_auto_expanded_dirs_empty() {
    let modules: Vec<Module> = vec![];
    let violation_counts = HashMap::new();
    let dirs = compute_auto_expanded_dirs(&modules, &violation_counts);
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
            core_module: None,
        })
        .collect();
    let violation_counts = HashMap::new();
    let dirs = compute_auto_expanded_dirs(&modules, &violation_counts);
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
            core_module: None,
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
            core_module: None,
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
            core_module: None,
        });
    }

    let violation_counts = HashMap::new();
    let dirs = compute_auto_expanded_dirs(&modules, &violation_counts);

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
            core_module: None,
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
            core_module: None,
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
            core_module: None,
        });
    }

    let violation_counts = HashMap::new();
    let dirs = compute_auto_expanded_dirs(&modules, &violation_counts);

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
            core_module: None,
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
            core_module: None,
        });
    }

    let mut violation_counts: HashMap<String, u32> = HashMap::new();
    for i in 0..10 {
        violation_counts.insert(format!("bugs/mod{}.ts", i), 3);
    }

    let dirs = compute_auto_expanded_dirs(&modules, &violation_counts);

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
                core_module: None,
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
            core_module: None,
        });
    }

    modules.push(Module {
        source: "src/index.ts".to_string(),
        dependencies: vec![],
        dependents: None,
        orphan: None,
        valid: None,
        rules: None,
        core_module: None,
    });
    modules.push(Module {
        source: "src/App.tsx".to_string(),
        dependencies: vec![],
        dependents: None,
        orphan: None,
        valid: None,
        rules: None,
        core_module: None,
    });

    for i in 0..250 {
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

    for i in 0..2700 {
        modules.push(Module {
            source: format!("vendor/pkg{}/index.js", i % 100),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
        });
    }

    let violation_counts = HashMap::new();
    let dirs = compute_auto_expanded_dirs(&modules, &violation_counts);

    assert!(
        dirs.contains(&"src".to_string()),
        "src has 4 direct children <= 50, should expand"
    );
    assert!(
        !dirs.contains(&"lib".to_string()),
        "lib has 250 direct children > 50"
    );
    assert!(
        !dirs.contains(&"vendor".to_string()),
        "vendor has 100 direct children > 50"
    );

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
            source: format!(
                "../wpsweb/client/app/applications/dbsheet/helpers/helper{}.ts",
                i
            ),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
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
            core_module: None,
        });
    }

    for i in 0..500 {
        modules.push(Module {
            source: format!(
                "../wpsweb/client/app/applications/spreadsheet/core/mod{}.ts",
                i
            ),
            dependencies: vec![],
            dependents: None,
            orphan: None,
            valid: None,
            rules: None,
            core_module: None,
        });
    }

    let violation_counts = HashMap::new();
    let dirs = compute_auto_expanded_dirs(&modules, &violation_counts);

    assert!(
        !dirs.is_empty(),
        "Should expand some small leaf directories"
    );

    let expanded_set: HashSet<&str> = dirs.iter().map(|s| s.as_str()).collect();
    let (nodes, _, _) = build_hybrid_nodes(&modules, &violation_counts, &expanded_set);

    assert!(
        nodes.len() <= TARGET_NODE_BUDGET,
        "Final node count {} should be under budget {}",
        nodes.len(),
        TARGET_NODE_BUDGET
    );

    let dir_nodes: Vec<_> = nodes
        .iter()
        .filter(|n| matches!(n.node_type, NodeType::Directory))
        .collect();
    assert!(
        dir_nodes.len() <= 3,
        "Should have at most 3 directory nodes, got {}",
        dir_nodes.len()
    );
}
