use super::*;
use super::aggregate::{self, detect_edge_type, RawEdge, TARGET_NODE_BUDGET};
use std::collections::HashMap;
use std::io::Write;
use std::sync::atomic::{AtomicU64, Ordering};

static FILE_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Helper to create a temp file with test JSON content
struct TempJsonFile {
    path: std::path::PathBuf,
}

impl TempJsonFile {
    fn new(modules: Vec<Module>) -> Self {
        let cruise = CruiseResult {
            modules: Some(modules),
            summary: None,
        };
        let json = serde_json::to_string(&cruise).unwrap();
        let temp_dir = std::env::temp_dir();
        let id = FILE_COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = temp_dir.join(format!("dcr_test_{}_{}.json", std::process::id(), id));
        let mut file = std::fs::File::create(&path).unwrap();
        file.write_all(json.as_bytes()).unwrap();
        Self { path }
    }

    fn path(&self) -> &std::path::Path {
        &self.path
    }
}

impl Drop for TempJsonFile {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
    }
}

#[test]
fn test_parse_and_aggregate_returns_non_empty_expanded_dirs() {
    // Create a realistic project with modules
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

    let file = TempJsonFile::new(modules);
    let result = parse_and_aggregate(file.path(), 200, None).unwrap();

    // expanded_dirs should not be empty when modules exist
    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(!expanded.is_empty(), "expanded_dirs should not be empty for non-empty modules");
    assert!(expanded.contains(&"src".to_string()), "expanded_dirs should contain 'src'");
}

#[test]
fn test_parse_and_aggregate_small_project_expands_all() {
    // Small project (under TARGET_NODE_BUDGET) should expand root
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

    let file = TempJsonFile::new(modules);
    let result = parse_and_aggregate(file.path(), 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(!expanded.is_empty(), "expanded_dirs should not be empty");
    assert!(expanded.contains(&"".to_string()), "small project should expand root");
}

#[test]
fn test_parse_and_aggregate_large_project_has_expanded_dirs() {
    // Large project (over TARGET_NODE_BUDGET) should still have some expanded dirs
    let mut modules: Vec<Module> = vec![];

    // Create nested structure
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

    // Add more files to exceed budget
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

    let file = TempJsonFile::new(modules);
    let result = parse_and_aggregate(file.path(), 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(!expanded.is_empty(), "expanded_dirs should not be empty even for large projects");
}

#[test]
fn test_parse_and_aggregate_empty_modules_returns_empty_expanded_dirs() {
    // Edge case: empty modules should return empty expanded_dirs
    let modules: Vec<Module> = vec![];

    let file = TempJsonFile::new(modules);
    let result = parse_and_aggregate(file.path(), 200, None).unwrap();

    let expanded = result.meta.expanded_dirs.unwrap();
    assert!(expanded.is_empty(), "empty modules should have empty expanded_dirs");
}

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
    assert!(is_path_expanded("src/index.ts", &set)); // parent "src" is expanded
    assert!(is_path_expanded("src/components/Button.tsx", &set)); // "src" and "src/components" expanded
    assert!(!is_path_expanded("lib/utils.ts", &set)); // "lib" not expanded
    assert!(!is_path_expanded("index.ts", &set)); // top-level file, no ancestor expanded
}

#[test]
fn test_is_path_expanded_root() {
    let set: HashSet<&str> = [""].into_iter().collect(); // root expanded
    assert!(is_path_expanded("index.ts", &set)); // top-level file expanded
    assert!(is_path_expanded("src/mod.ts", &set)); // nested file also expanded
}

#[test]
fn test_compute_auto_expanded_dirs_small_project() {
    // Small project (under TARGET_NODE_BUDGET): expand all
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
    assert!(dirs.contains(&"".to_string())); // root dir expanded at file level
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
    // Create 500 modules in single top-level dir — exceeds TARGET_NODE_BUDGET (300)
    // "src" has 500 direct children > MAX_DIRECT_CHILDREN (50), won't expand
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
    // "src" has 500 direct children > 50, should NOT be expanded
    assert!(!dirs.contains(&"src".to_string()));
}

#[test]
fn test_smart_expansion_respects_direct_children_limit() {
    // "src" has 2 direct children (dense + sparse dirs) <= 50, should expand
    // "src/dense" has 60 direct children > 50, should NOT expand
    // "src/sparse" has 10 direct children <= 50, should expand
    // Plus additional files to push past TARGET_NODE_BUDGET
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
    // Add more files to exceed TARGET_NODE_BUDGET
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

    // "src" has 2 direct children (dense, sparse) <= 50, should expand
    // "src/dense" has 60 direct children > 50, should NOT expand
    // "src/sparse" has 10 direct children <= 50, should expand (parent "src" is expanded)
    // "lib" has 250 direct children > 50, should NOT expand
    assert!(dirs.contains(&"src".to_string()));
    assert!(!dirs.contains(&"src/dense".to_string()));
    assert!(dirs.contains(&"src/sparse".to_string()));
    assert!(!dirs.contains(&"lib".to_string()));
}

#[test]
fn test_smart_expansion_expands_small_dirs() {
    // Two top-level dirs: one sparse (20 files), one dense (60 files)
    // Plus 250 files in "other" to push past TARGET_NODE_BUDGET (300)
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

    // "small" has 20 direct children <= 50, should expand
    // "big" has 60 direct children > 50, should NOT expand
    // "other" has 250 direct children > 50, should NOT expand
    assert!(dirs.contains(&"small".to_string()));
    assert!(!dirs.contains(&"big".to_string()));
    assert!(!dirs.contains(&"other".to_string()));
}

#[test]
fn test_smart_expansion_prioritizes_violations() {
    // Same-size dirs, but one has violations
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

    // Only "bugs" has violations
    let mut violation_counts: HashMap<String, u32> = HashMap::new();
    for i in 0..10 {
        violation_counts.insert(format!("bugs/mod{}.ts", i), 3);
    }

    let dirs = aggregate::compute_auto_expanded_dirs(&modules, &violation_counts);

    // Both have 10 direct children <= 50, both should expand
    assert!(dirs.contains(&"bugs".to_string()));
    assert!(dirs.contains(&"clean".to_string()));
}

/// Simulates a real-world project with 3388 files
/// Verifies that expansion respects budget based on actual descendant counts
#[test]
fn test_real_world_scale() {
    // Simulate common-graph.json structure: src/ with many subdirs, each with few files
    // 350 files in src/components/* (35 dirs × 10 files each)
    // 60 files in src/utils/*
    // plus scattered files elsewhere
    let mut modules: Vec<Module> = vec![];

    // src/components: 35 subdirectories, each with 10 files = 350 files
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

    // src/utils: 60 files directly under utils
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

    // src/index.ts and src/App.tsx (root src files)
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

    // lib: 250 files (should not expand)
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

    // More files in other top-level dirs to push past budget
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

    // With correct cost calculation:
    // - "src" has 412 descendants, cost = 411 > budget (297), should NOT expand
    // - "lib" has 250 children > 50, should NOT expand
    // - "vendor" has 100 children > 50, should NOT expand
    // Only small directories that fit budget should expand
    assert!(!dirs.contains(&"src".to_string()), "src has 412 descendants, cost exceeds budget");
    assert!(!dirs.contains(&"lib".to_string()), "lib has 250 direct children > 50");
    assert!(!dirs.contains(&"vendor".to_string()), "vendor has 100 direct children > 50");

    // Verify final node count stays under budget by simulating build_hybrid_nodes
    let expanded_set: HashSet<&str> = dirs.iter().map(|s| s.as_str()).collect();
    let all_edges: Vec<RawEdge> = vec![];
    let (nodes, _, _) = build_hybrid_nodes(&modules, &all_edges, &violation_counts, &expanded_set);
    assert!(
        nodes.len() <= TARGET_NODE_BUDGET + 50,
        "Final node count {} should be close to budget {}",
        nodes.len(),
        TARGET_NODE_BUDGET
    );
}

/// Test that paths starting with ".." (relative paths) are handled correctly.
/// When the only top-level directory is ".." with thousands of files,
/// expansion should still find small subdirectories to expand without
/// creating excessive intermediate directory nodes.
#[test]
fn test_relative_path_with_single_top_level_dir() {
    // Simulate common-graph.json structure: all modules under "../wpsweb/..."
    let mut modules: Vec<Module> = vec![];

    // Create a deep directory structure with small leaf directories
    // ../wpsweb/client/app/applications/dbsheet/helpers has 20 files
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

    // ../wpsweb/client/app/common has 30 files
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

    // Add many more files to make ".." exceed budget
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

    // Should have some expanded dirs (small leaf directories)
    assert!(!dirs.is_empty(), "Should expand some small leaf directories");

    // Verify node count stays under budget
    let expanded_set: HashSet<&str> = dirs.iter().map(|s| s.as_str()).collect();
    let all_edges: Vec<RawEdge> = vec![];
    let (nodes, _, _) = build_hybrid_nodes(&modules, &all_edges, &violation_counts, &expanded_set);

    // Node count should be: 1 for ".." + expanded dirs' file nodes
    // Should NOT create intermediate directory nodes
    assert!(
        nodes.len() <= TARGET_NODE_BUDGET,
        "Final node count {} should be under budget {}",
        nodes.len(),
        TARGET_NODE_BUDGET
    );

    // Directory nodes should be minimal (only ".." and possibly root)
    let dir_nodes: Vec<_> = nodes.iter().filter(|n| matches!(n.node_type, NodeType::Directory)).collect();
    assert!(
        dir_nodes.len() <= 3,
        "Should have at most 3 directory nodes, got {}",
        dir_nodes.len()
    );
}