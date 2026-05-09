use super::*;

#[test]
fn test_empty_layout() {
    let mut nodes: Vec<GraphNode> = vec![];
    let mut combos: Vec<GraphCombo> = vec![];
    compute_layout(&mut nodes, &mut combos);
    assert!(nodes.is_empty());
    assert!(combos.is_empty());
}

#[test]
fn test_single_node_in_root_combo() {
    use crate::types::NodeType;

    let mut nodes = vec![GraphNode {
        id: "src/index.ts".to_string(),
        label: "index.ts".to_string(),
        node_type: NodeType::File,
        path: Some("src/index.ts".to_string()),
        violation_count: 0,
        orphan: None,
        children: None,
        combo: Some("combo:root".to_string()),
        rect: None,
    }];
    let mut combos = vec![GraphCombo {
        id: "combo:root".to_string(),
        label: "/".to_string(),
        combo: None,
        rect: None,
    }];

    compute_layout(&mut nodes, &mut combos);

    let node_rect = nodes[0].rect.as_ref().unwrap();
    assert_eq!(node_rect.width, NODE_SIZE * 2.0);
    assert_eq!(node_rect.height, NODE_SIZE);
    assert_eq!(node_rect.left, COMBO_PADDING);
    assert_eq!(node_rect.top, COMBO_PADDING);

    let combo_rect = combos[0].rect.as_ref().unwrap();
    assert_eq!(combo_rect.left, 0.0);
    assert_eq!(combo_rect.top, 0.0);
    assert_eq!(combo_rect.width, 2.0 * COMBO_PADDING + NODE_SIZE * 2.0);
    assert_eq!(combo_rect.height, 2.0 * COMBO_PADDING + NODE_SIZE);
}

#[test]
fn test_multiple_nodes_grid() {
    use crate::types::NodeType;

    let mut nodes: Vec<GraphNode> = (0..5)
        .map(|i| GraphNode {
            id: format!("src/file{}.ts", i),
            label: format!("file{}.ts", i),
            node_type: NodeType::File,
            path: Some(format!("src/file{}.ts", i)),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:root".to_string()),
            rect: None,
        })
        .collect();
    let mut combos = vec![GraphCombo {
        id: "combo:root".to_string(),
        label: "/".to_string(),
        combo: None,
        rect: None,
    }];

    compute_layout(&mut nodes, &mut combos);

    // 5 nodes => ceil(sqrt(5)) = 3 cols, 2 rows
    let combo_rect = combos[0].rect.as_ref().unwrap();
    assert!(combo_rect.width > 0.0);
    assert!(combo_rect.height > 0.0);

    // All node rects should be within combo bounds
    for n in &nodes {
        let r = n.rect.as_ref().unwrap();
        assert!(r.left >= combo_rect.left);
        assert!(r.top >= combo_rect.top);
        assert!(r.left + r.width <= combo_rect.left + combo_rect.width);
        assert!(r.top + r.height <= combo_rect.top + combo_rect.height);
    }

    // No overlap between nodes
    for i in 0..nodes.len() {
        for j in (i + 1)..nodes.len() {
            let a = nodes[i].rect.as_ref().unwrap();
            let b = nodes[j].rect.as_ref().unwrap();
            let overlap = a.left < b.left + b.width
                && a.left + a.width > b.left
                && a.top < b.top + b.height
                && a.top + a.height > b.top;
            assert!(!overlap, "Nodes {} and {} overlap", i, j);
        }
    }
}

#[test]
fn test_nested_combos() {
    use crate::types::NodeType;

    let mut nodes = vec![GraphNode {
        id: "src/inner/file.ts".to_string(),
        label: "file.ts".to_string(),
        node_type: NodeType::File,
        path: Some("src/inner/file.ts".to_string()),
        violation_count: 0,
        orphan: None,
        children: None,
        combo: Some("combo:src/inner".to_string()),
        rect: None,
    }];
    let mut combos = vec![
        GraphCombo {
            id: "combo:root".to_string(),
            label: "/".to_string(),
            combo: None,
            rect: None,
        },
        GraphCombo {
            id: "combo:src".to_string(),
            label: "src".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/inner".to_string(),
            label: "inner".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
    ];

    compute_layout(&mut nodes, &mut combos);

    // Inner combo should contain the node
    let inner_rect = combos[2].rect.as_ref().unwrap();
    let node_rect = nodes[0].rect.as_ref().unwrap();
    assert!(node_rect.left >= inner_rect.left);
    assert!(node_rect.top >= inner_rect.top);
    assert!(node_rect.left + node_rect.width <= inner_rect.left + inner_rect.width);
    assert!(node_rect.top + node_rect.height <= inner_rect.top + inner_rect.height);

    // src combo should contain inner combo
    let src_rect = combos[1].rect.as_ref().unwrap();
    assert!(inner_rect.left >= src_rect.left);
    assert!(inner_rect.top >= src_rect.top);
    assert!(inner_rect.left + inner_rect.width <= src_rect.left + src_rect.width);
    assert!(inner_rect.top + inner_rect.height <= src_rect.top + src_rect.height);

    // root combo should contain src combo
    let root_rect = combos[0].rect.as_ref().unwrap();
    assert!(src_rect.left >= root_rect.left);
    assert!(src_rect.top >= root_rect.top);
    assert!(src_rect.left + src_rect.width <= root_rect.left + root_rect.width);
    assert!(src_rect.top + src_rect.height <= root_rect.top + root_rect.height);
}

#[test]
fn test_top_level_combos_no_overlap() {
    use crate::types::NodeType;

    // Two top-level combos, each with a node
    let mut nodes = vec![
        GraphNode {
            id: "src/a.ts".to_string(),
            label: "a.ts".to_string(),
            node_type: NodeType::File,
            path: Some("src/a.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphNode {
            id: "lib/b.ts".to_string(),
            label: "b.ts".to_string(),
            node_type: NodeType::File,
            path: Some("lib/b.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:lib".to_string()),
            rect: None,
        },
    ];
    let mut combos = vec![
        GraphCombo {
            id: "combo:root".to_string(),
            label: "/".to_string(),
            combo: None,
            rect: None,
        },
        GraphCombo {
            id: "combo:src".to_string(),
            label: "src".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:lib".to_string(),
            label: "lib".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
    ];

    compute_layout(&mut nodes, &mut combos);

    // Sibling combos (src and lib) should not overlap
    let src_rect = combos[1].rect.as_ref().unwrap();
    let lib_rect = combos[2].rect.as_ref().unwrap();
    let overlap = src_rect.left < lib_rect.left + lib_rect.width
        && src_rect.left + src_rect.width > lib_rect.left
        && src_rect.top < lib_rect.top + lib_rect.height
        && src_rect.top + src_rect.height > lib_rect.top;
    assert!(!overlap, "Sibling combos 'src' and 'lib' overlap");
}

#[test]
fn test_three_top_level_combos_large() {
    use crate::types::NodeType;

    // Three top-level combos with different sizes to stress test overlap prevention
    let mut nodes = vec![
        // Combo src: 3 nodes
        GraphNode {
            id: "src/a.ts".to_string(),
            label: "a.ts".to_string(),
            node_type: NodeType::File,
            path: Some("src/a.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphNode {
            id: "src/b.ts".to_string(),
            label: "b.ts".to_string(),
            node_type: NodeType::File,
            path: Some("src/b.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphNode {
            id: "src/c.ts".to_string(),
            label: "c.ts".to_string(),
            node_type: NodeType::File,
            path: Some("src/c.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        // Combo lib: 1 node
        GraphNode {
            id: "lib/d.ts".to_string(),
            label: "d.ts".to_string(),
            node_type: NodeType::File,
            path: Some("lib/d.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:lib".to_string()),
            rect: None,
        },
        // Combo utils: 2 nodes
        GraphNode {
            id: "utils/e.ts".to_string(),
            label: "e.ts".to_string(),
            node_type: NodeType::File,
            path: Some("utils/e.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:utils".to_string()),
            rect: None,
        },
        GraphNode {
            id: "utils/f.ts".to_string(),
            label: "f.ts".to_string(),
            node_type: NodeType::File,
            path: Some("utils/f.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:utils".to_string()),
            rect: None,
        },
    ];
    let mut combos = vec![
        GraphCombo {
            id: "combo:root".to_string(),
            label: "/".to_string(),
            combo: None,
            rect: None,
        },
        GraphCombo {
            id: "combo:src".to_string(),
            label: "src".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:lib".to_string(),
            label: "lib".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:utils".to_string(),
            label: "utils".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
    ];

    compute_layout(&mut nodes, &mut combos);

    // Check all sibling combos for overlap
    let top_level: Vec<_> = combos.iter().filter(|c| c.combo.is_none()).collect();
    assert_eq!(top_level.len(), 1, "Should have exactly 1 root combo");

    let children: Vec<_> = combos.iter().filter(|c| c.combo.is_some()).collect();
    for i in 0..children.len() {
        for j in (i + 1)..children.len() {
            let a = children[i].rect.as_ref().unwrap();
            let b = children[j].rect.as_ref().unwrap();
            let overlap = a.left < b.left + b.width
                && a.left + a.width > b.left
                && a.top < b.top + b.height
                && a.top + a.height > b.top;
            if overlap {
                println!(
                    "Overlap between {} and {}:",
                    children[i].id, children[j].id
                );
                println!(
                    "  A: left={}, top={}, width={}, height={}",
                    a.left, a.top, a.width, a.height
                );
                println!(
                    "  B: left={}, top={}, width={}, height={}",
                    b.left, b.top, b.width, b.height
                );
            }
            assert!(
                !overlap,
                "Sibling combos '{}' and '{}' overlap",
                children[i].id, children[j].id
            );
        }
    }
}

#[test]
fn test_four_top_level_combos_medium() {
    use crate::types::NodeType;

    // Four top-level combos with 2 nodes each
    let mut nodes: Vec<GraphNode> = vec![];
    for combo_name in ["src", "lib", "utils", "test"] {
        for i in 0..2 {
            nodes.push(GraphNode {
                id: format!("{}/file{}.ts", combo_name, i),
                label: format!("file{}.ts", i),
                node_type: NodeType::File,
                path: Some(format!("{}/file{}.ts", combo_name, i)),
                violation_count: 0,
                orphan: None,
                children: None,
                combo: Some(format!("combo:{}", combo_name)),
                rect: None,
            });
        }
    }

    let mut combos = vec![GraphCombo {
        id: "combo:root".to_string(),
        label: "/".to_string(),
        combo: None,
        rect: None,
    }];
    for combo_name in ["src", "lib", "utils", "test"] {
        combos.push(GraphCombo {
            id: format!("combo:{}", combo_name),
            label: combo_name.to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        });
    }

    compute_layout(&mut nodes, &mut combos);

    // Verify no overlap between any pair of sibling combos
    let children: Vec<_> = combos.iter().filter(|c| c.combo.is_some()).collect();
    for i in 0..children.len() {
        for j in (i + 1)..children.len() {
            let a = children[i].rect.as_ref().unwrap();
            let b = children[j].rect.as_ref().unwrap();
            let overlap = a.left < b.left + b.width
                && a.left + a.width > b.left
                && a.top < b.top + b.height
                && a.top + a.height > b.top;
            assert!(
                !overlap,
                "Sibling combos '{}' and '{}' overlap:\n  A: {:?}\n  B: {:?}",
                children[i].id,
                children[j].id,
                a,
                b
            );
        }
    }
}

#[test]
fn test_deeply_nested_combos() {
    use crate::types::NodeType;

    // Deep nesting: root -> src -> components -> ui -> Button.ts
    let mut nodes = vec![GraphNode {
        id: "src/components/ui/Button.ts".to_string(),
        label: "Button.ts".to_string(),
        node_type: NodeType::File,
        path: Some("src/components/ui/Button.ts".to_string()),
        violation_count: 0,
        orphan: None,
        children: None,
        combo: Some("combo:src/components/ui".to_string()),
        rect: None,
    }];

    let mut combos = vec![
        GraphCombo {
            id: "combo:root".to_string(),
            label: "/".to_string(),
            combo: None,
            rect: None,
        },
        GraphCombo {
            id: "combo:src".to_string(),
            label: "src".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/components".to_string(),
            label: "components".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/components/ui".to_string(),
            label: "ui".to_string(),
            combo: Some("combo:src/components".to_string()),
            rect: None,
        },
    ];

    compute_layout(&mut nodes, &mut combos);

    // Verify containment: parent combo should fully contain child combo
    let root = &combos[0];
    let src = &combos[1];
    let components = &combos[2];
    let ui = &combos[3];

    let root_rect = root.rect.as_ref().unwrap();
    let src_rect = src.rect.as_ref().unwrap();
    let comp_rect = components.rect.as_ref().unwrap();
    let ui_rect = ui.rect.as_ref().unwrap();

    // Helper to check containment
    let contains = |parent: &Rect, child: &Rect| -> bool {
        child.left >= parent.left
            && child.top >= parent.top
            && child.left + child.width <= parent.left + parent.width
            && child.top + child.height <= parent.top + parent.height
    };

    assert!(contains(root_rect, src_rect), "root should contain src");
    assert!(contains(src_rect, comp_rect), "src should contain components");
    assert!(contains(comp_rect, ui_rect), "components should contain ui");
}

#[test]
fn test_siblings_under_same_parent_no_overlap() {
    use crate::types::NodeType;

    // Two sibling combos under same non-root parent
    // root -> src -> (components, utils)
    let mut nodes = vec![
        // src/components has 2 nodes
        GraphNode {
            id: "src/components/A.tsx".to_string(),
            label: "A.tsx".to_string(),
            node_type: NodeType::File,
            path: Some("src/components/A.tsx".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/components".to_string()),
            rect: None,
        },
        GraphNode {
            id: "src/components/B.tsx".to_string(),
            label: "B.tsx".to_string(),
            node_type: NodeType::File,
            path: Some("src/components/B.tsx".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/components".to_string()),
            rect: None,
        },
        // src/utils has 2 nodes
        GraphNode {
            id: "src/utils/helper.ts".to_string(),
            label: "helper.ts".to_string(),
            node_type: NodeType::File,
            path: Some("src/utils/helper.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/utils".to_string()),
            rect: None,
        },
        GraphNode {
            id: "src/utils/format.ts".to_string(),
            label: "format.ts".to_string(),
            node_type: NodeType::File,
            path: Some("src/utils/format.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/utils".to_string()),
            rect: None,
        },
    ];

    let mut combos = vec![
        GraphCombo {
            id: "combo:root".to_string(),
            label: "/".to_string(),
            combo: None,
            rect: None,
        },
        GraphCombo {
            id: "combo:src".to_string(),
            label: "src".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/components".to_string(),
            label: "components".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/utils".to_string(),
            label: "utils".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
    ];

    compute_layout(&mut nodes, &mut combos);

    // Check sibling combos under src don't overlap
    let components_rect = combos[2].rect.as_ref().unwrap();
    let utils_rect = combos[3].rect.as_ref().unwrap();

    println!("components: {:?}", components_rect);
    println!("utils: {:?}", utils_rect);

    let overlap = components_rect.left < utils_rect.left + utils_rect.width
        && components_rect.left + components_rect.width > utils_rect.left
        && components_rect.top < utils_rect.top + utils_rect.height
        && components_rect.top + components_rect.height > utils_rect.top;

    assert!(
        !overlap,
        "Sibling combos 'components' and 'utils' under 'src' should not overlap:\n  components: {:?}\n  utils: {:?}",
        components_rect, utils_rect
    );
}

#[test]
fn test_many_small_combos() {
    use crate::types::NodeType;

    // 8 top-level combos, each with 1 node (stress test force layout)
    let mut nodes: Vec<GraphNode> = vec![];
    let mut combos = vec![GraphCombo {
        id: "combo:root".to_string(),
        label: "/".to_string(),
        combo: None,
        rect: None,
    }];

    for i in 0..8 {
        let name = format!("pkg{}", i);
        nodes.push(GraphNode {
            id: format!("{}/index.ts", name),
            label: "index.ts".to_string(),
            node_type: NodeType::File,
            path: Some(format!("{}/index.ts", name)),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some(format!("combo:{}", name)),
            rect: None,
        });
        combos.push(GraphCombo {
            id: format!("combo:{}", name),
            label: name.clone(),
            combo: Some("combo:root".to_string()),
            rect: None,
        });
    }

    compute_layout(&mut nodes, &mut combos);

    // Verify no overlap
    let children: Vec<_> = combos.iter().filter(|c| c.combo.is_some()).collect();
    for i in 0..children.len() {
        for j in (i + 1)..children.len() {
            let a = children[i].rect.as_ref().unwrap();
            let b = children[j].rect.as_ref().unwrap();
            let overlap = a.left < b.left + b.width
                && a.left + a.width > b.left
                && a.top < b.top + b.height
                && a.top + a.height > b.top;
            assert!(
                !overlap,
                "Sibling combos '{}' and '{}' overlap:\n  A: {:?}\n  B: {:?}",
                children[i].id,
                children[j].id,
                a,
                b
            );
        }
    }
}

#[test]
fn test_three_level_nested_siblings() {
    use crate::types::NodeType;

    // Three-level nesting: root → src → (components, utils, hooks)
    let mut nodes: Vec<GraphNode> = vec![];

    for i in 0..2 {
        nodes.push(GraphNode {
            id: format!("src/components/comp{}.tsx", i),
            label: format!("comp{}.tsx", i),
            node_type: NodeType::File,
            path: Some(format!("src/components/comp{}.tsx", i)),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/components".to_string()),
            rect: None,
        });
    }
    for i in 0..2 {
        nodes.push(GraphNode {
            id: format!("src/utils/util{}.ts", i),
            label: format!("util{}.ts", i),
            node_type: NodeType::File,
            path: Some(format!("src/utils/util{}.ts", i)),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/utils".to_string()),
            rect: None,
        });
    }
    for i in 0..2 {
        nodes.push(GraphNode {
            id: format!("src/hooks/hook{}.ts", i),
            label: format!("hook{}.ts", i),
            node_type: NodeType::File,
            path: Some(format!("src/hooks/hook{}.ts", i)),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/hooks".to_string()),
            rect: None,
        });
    }

    let mut combos = vec![
        GraphCombo {
            id: "combo:root".to_string(),
            label: "/".to_string(),
            combo: None,
            rect: None,
        },
        GraphCombo {
            id: "combo:src".to_string(),
            label: "src".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/components".to_string(),
            label: "components".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/utils".to_string(),
            label: "utils".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/hooks".to_string(),
            label: "hooks".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
    ];

    compute_layout(&mut nodes, &mut combos);

    let overlaps = |a: &Rect, b: &Rect| -> bool {
        a.left < b.left + b.width
            && a.left + a.width > b.left
            && a.top < b.top + b.height
            && a.top + a.height > b.top
    };

    let components_rect = combos[2].rect.as_ref().unwrap();
    let utils_rect = combos[3].rect.as_ref().unwrap();
    let hooks_rect = combos[4].rect.as_ref().unwrap();

    assert!(!overlaps(components_rect, utils_rect), "components and utils should not overlap");
    assert!(!overlaps(components_rect, hooks_rect), "components and hooks should not overlap");
    assert!(!overlaps(utils_rect, hooks_rect), "utils and hooks should not overlap");
}

#[test]
fn test_four_level_deeply_nested_siblings() {
    use crate::types::NodeType;

    // Four-level: root → src → components → (ui, layout)
    let mut nodes: Vec<GraphNode> = vec![];

    for i in 0..2 {
        nodes.push(GraphNode {
            id: format!("src/components/ui/Button{}.tsx", i),
            label: format!("Button{}.tsx", i),
            node_type: NodeType::File,
            path: Some(format!("src/components/ui/Button{}.tsx", i)),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/components/ui".to_string()),
            rect: None,
        });
    }
    for i in 0..2 {
        nodes.push(GraphNode {
            id: format!("src/components/layout/Header{}.tsx", i),
            label: format!("Header{}.tsx", i),
            node_type: NodeType::File,
            path: Some(format!("src/components/layout/Header{}.tsx", i)),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/components/layout".to_string()),
            rect: None,
        });
    }

    let mut combos = vec![
        GraphCombo {
            id: "combo:root".to_string(),
            label: "/".to_string(),
            combo: None,
            rect: None,
        },
        GraphCombo {
            id: "combo:src".to_string(),
            label: "src".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/components".to_string(),
            label: "components".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/components/ui".to_string(),
            label: "ui".to_string(),
            combo: Some("combo:src/components".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/components/layout".to_string(),
            label: "layout".to_string(),
            combo: Some("combo:src/components".to_string()),
            rect: None,
        },
    ];

    compute_layout(&mut nodes, &mut combos);

    let ui_rect = combos[3].rect.as_ref().unwrap();
    let layout_rect = combos[4].rect.as_ref().unwrap();

    let overlap = ui_rect.left < layout_rect.left + layout_rect.width
        && ui_rect.left + ui_rect.width > layout_rect.left
        && ui_rect.top < layout_rect.top + layout_rect.height
        && ui_rect.top + ui_rect.height > layout_rect.top;

    assert!(
        !overlap,
        "Deep sibling combos 'ui' and 'layout' should not overlap:\n  ui: {:?}\n  layout: {:?}",
        ui_rect, layout_rect
    );
}

#[test]
fn test_mixed_nodes_and_combos_nested() {
    use crate::types::NodeType;

    // Mixed: combo contains both direct nodes and child combos
    // root → src → (index.ts, components/, utils/)
    let mut nodes = vec![
        GraphNode {
            id: "src/index.ts".to_string(),
            label: "index.ts".to_string(),
            node_type: NodeType::File,
            path: Some("src/index.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphNode {
            id: "src/components/A.tsx".to_string(),
            label: "A.tsx".to_string(),
            node_type: NodeType::File,
            path: Some("src/components/A.tsx".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/components".to_string()),
            rect: None,
        },
        GraphNode {
            id: "src/components/B.tsx".to_string(),
            label: "B.tsx".to_string(),
            node_type: NodeType::File,
            path: Some("src/components/B.tsx".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/components".to_string()),
            rect: None,
        },
        GraphNode {
            id: "src/utils/helper.ts".to_string(),
            label: "helper.ts".to_string(),
            node_type: NodeType::File,
            path: Some("src/utils/helper.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/utils".to_string()),
            rect: None,
        },
        GraphNode {
            id: "src/utils/format.ts".to_string(),
            label: "format.ts".to_string(),
            node_type: NodeType::File,
            path: Some("src/utils/format.ts".to_string()),
            violation_count: 0,
            orphan: None,
            children: None,
            combo: Some("combo:src/utils".to_string()),
            rect: None,
        },
    ];

    let mut combos = vec![
        GraphCombo {
            id: "combo:root".to_string(),
            label: "/".to_string(),
            combo: None,
            rect: None,
        },
        GraphCombo {
            id: "combo:src".to_string(),
            label: "src".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/components".to_string(),
            label: "components".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/utils".to_string(),
            label: "utils".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
    ];

    compute_layout(&mut nodes, &mut combos);

    let components_rect = combos[2].rect.as_ref().unwrap();
    let utils_rect = combos[3].rect.as_ref().unwrap();

    let overlap = components_rect.left < utils_rect.left + utils_rect.width
        && components_rect.left + components_rect.width > utils_rect.left
        && components_rect.top < utils_rect.top + utils_rect.height
        && components_rect.top + components_rect.height > utils_rect.top;

    assert!(
        !overlap,
        "Sibling combos 'components' and 'utils' should not overlap when mixed with direct node"
    );

    // Verify src combo contains both direct node and child combos
    let src_rect = combos[1].rect.as_ref().unwrap();
    let index_rect = nodes[0].rect.as_ref().unwrap();
    assert!(index_rect.left >= src_rect.left);
    assert!(index_rect.top >= src_rect.top);
    assert!(index_rect.left + index_rect.width <= src_rect.left + src_rect.width);
    assert!(index_rect.top + index_rect.height <= src_rect.top + src_rect.height);

    assert!(components_rect.left >= src_rect.left);
    assert!(components_rect.top >= src_rect.top);
    assert!(utils_rect.left >= src_rect.left);
    assert!(utils_rect.top >= src_rect.top);
}

#[test]
fn test_circle_layout_no_initial_overlap_equal_sizes() {
    // Circle layout should position equal-sized elements without overlap
    // if radius is large enough
    let n = 5;
    let element_size = (40.0, 20.0); // All same size

    // Compute positions using circle layout logic (same as in position_children_in_combo)
    let radius = 100.0;
    let center_x = 200.0;
    let center_y = 200.0;

    let mut positions: Vec<(f32, f32)> = Vec::with_capacity(n);
    for i in 0..n {
        let angle = 2.0 * std::f32::consts::PI * i as f32 / n as f32;
        let x = center_x + radius * angle.cos() - element_size.0 / 2.0;
        let y = center_y + radius * angle.sin() - element_size.1 / 2.0;
        positions.push((x, y));
    }

    // Check for overlaps
    for i in 0..n {
        for j in (i + 1)..n {
            let (xi, yi) = positions[i];
            let (xj, yj) = positions[j];

            let overlap = xi < xj + element_size.0
                && xi + element_size.0 > xj
                && yi < yj + element_size.1
                && yi + element_size.1 > yj;
            assert!(
                !overlap,
                "Circle layout positions {} and {} overlap:\n  Pos {}: ({}, {})\n  Pos {}: ({}, {})",
                i, j, i, xi, yi, j, xj, yj
            );
        }
    }
}

#[test]
fn test_resolve_element_overlaps_separates_overlapping_nodes() {
    // Two nodes at the exact same position - should be separated
    let mut positions = vec![(100.0, 100.0), (100.0, 100.0)];
    let elements: Vec<(f32, f32, bool, usize)> = vec![
        (40.0, 20.0, false, 0), // node 0: 40x20
        (40.0, 20.0, false, 1), // node 1: 40x20
    ];

    resolve_element_overlaps(&mut positions, &elements);

    // After resolution, they should not overlap
    let (x0, y0) = positions[0];
    let (x1, y1) = positions[1];
    let (w0, h0) = (elements[0].0, elements[0].1);
    let (w1, h1) = (elements[1].0, elements[1].1);

    let overlap = x0 < x1 + w1 && x0 + w0 > x1 && y0 < y1 + h1 && y0 + h0 > y1;
    assert!(!overlap, "Nodes should not overlap after resolution:\n  Node 0: ({}, {}) {}x{}\n  Node 1: ({}, {}) {}x{}", x0, y0, w0, h0, x1, y1, w1, h1);
}

#[test]
fn test_resolve_element_overlaps_handles_mixed_nodes_and_combos() {
    // Three elements: 2 nodes + 1 combo, all overlapping initially
    let mut positions = vec![(50.0, 50.0), (50.0, 50.0), (50.0, 50.0)];
    let elements: Vec<(f32, f32, bool, usize)> = vec![
        (40.0, 20.0, false, 0), // node
        (60.0, 30.0, false, 1), // node (different size)
        (80.0, 40.0, true, 0),  // combo
    ];

    resolve_element_overlaps(&mut positions, &elements);

    // Check no overlaps between any pair
    for i in 0..positions.len() {
        for j in (i + 1)..positions.len() {
            let (xi, yi) = positions[i];
            let (xj, yj) = positions[j];
            let (wi, hi) = (elements[i].0, elements[i].1);
            let (wj, hj) = (elements[j].0, elements[j].1);

            let overlap = xi < xj + wj && xi + wi > xj && yi < yj + hj && yi + hi > yj;
            assert!(!overlap, "Elements {} and {} should not overlap:\n  Element {}: ({}, {}) {}x{}\n  Element {}: ({}, {}) {}x{}", i, j, i, xi, yi, wi, hi, j, xj, yj, wj, hj);
        }
    }
}

#[test]
fn test_child_combos_no_overlap_under_stress() {
    use crate::types::NodeType;

    // Create a scenario where multiple large sibling combos stress the parent boundary
    // after overlap resolution: root -> src -> (largeA, largeB, largeC)
    // Each large combo has many nodes to make them bigger
    let mut nodes: Vec<GraphNode> = vec![];

    // Create 3 large sibling combos with many nodes each to stress boundaries
    for combo_name in ["largeA", "largeB", "largeC"] {
        for i in 0..15 {
            nodes.push(GraphNode {
                id: format!("src/{}/file{}.ts", combo_name, i),
                label: format!("file{}.ts", i),
                node_type: NodeType::File,
                path: Some(format!("src/{}/file{}.ts", combo_name, i)),
                violation_count: 0,
                orphan: None,
                children: None,
                combo: Some(format!("combo:src/{}", combo_name)),
                rect: None,
            });
        }
    }

    let mut combos = vec![
        GraphCombo {
            id: "combo:root".to_string(),
            label: "/".to_string(),
            combo: None,
            rect: None,
        },
        GraphCombo {
            id: "combo:src".to_string(),
            label: "src".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/largeA".to_string(),
            label: "largeA".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/largeB".to_string(),
            label: "largeB".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/largeC".to_string(),
            label: "largeC".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
    ];

    compute_layout(&mut nodes, &mut combos);

    // Verify no overlap between sibling combos (primary invariant)
    let child_combos: Vec<_> = combos.iter().skip(2).collect();
    for i in 0..child_combos.len() {
        for j in (i + 1)..child_combos.len() {
            let a = child_combos[i].rect.as_ref().unwrap();
            let b = child_combos[j].rect.as_ref().unwrap();
            let overlap = a.left < b.left + b.width
                && a.left + a.width > b.left
                && a.top < b.top + b.height
                && a.top + a.height > b.top;
            assert!(
                !overlap,
                "Sibling combos '{}' and '{}' overlap:\n  A: {:?}\n  B: {:?}",
                child_combos[i].id,
                child_combos[j].id,
                a,
                b
            );
        }
    }
}

#[test]
fn test_demo_like_structure_7_combos_plus_direct_node() {
    use crate::types::NodeType;

    // Simulate the demo project structure:
    // root -> src -> (index.ts, components/, hooks/, utils/, pages/, services/, types/, lib/)
    // This is 1 direct node + 7 child combos under src
    let mut nodes: Vec<GraphNode> = vec![];

    // Direct node under src
    nodes.push(GraphNode {
        id: "src/index.ts".to_string(),
        label: "index.ts".to_string(),
        node_type: NodeType::File,
        path: Some("src/index.ts".to_string()),
        violation_count: 0,
        orphan: None,
        children: None,
        combo: Some("combo:src".to_string()),
        rect: None,
    });

    // 7 child combos under src, each with 3 nodes
    for combo_name in ["components", "hooks", "utils", "pages", "services", "types", "lib"] {
        for i in 0..3 {
            nodes.push(GraphNode {
                id: format!("src/{}/file{}.ts", combo_name, i),
                label: format!("file{}.ts", i),
                node_type: NodeType::File,
                path: Some(format!("src/{}/file{}.ts", combo_name, i)),
                violation_count: 0,
                orphan: None,
                children: None,
                combo: Some(format!("combo:src/{}", combo_name)),
                rect: None,
            });
        }
    }

    let mut combos = vec![
        GraphCombo {
            id: "combo:root".to_string(),
            label: "/".to_string(),
            combo: None,
            rect: None,
        },
        GraphCombo {
            id: "combo:src".to_string(),
            label: "src".to_string(),
            combo: Some("combo:root".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/components".to_string(),
            label: "components".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/hooks".to_string(),
            label: "hooks".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/utils".to_string(),
            label: "utils".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/pages".to_string(),
            label: "pages".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/services".to_string(),
            label: "services".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/types".to_string(),
            label: "types".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
        GraphCombo {
            id: "combo:src/lib".to_string(),
            label: "lib".to_string(),
            combo: Some("combo:src".to_string()),
            rect: None,
        },
    ];

    compute_layout(&mut nodes, &mut combos);

    // Helper to check overlap
    let overlaps = |a: &Rect, b: &Rect| -> bool {
        a.left < b.left + b.width
            && a.left + a.width > b.left
            && a.top < b.top + b.height
            && a.top + a.height > b.top
    };

    // Check no overlap between sibling combos under src
    let child_combos: Vec<_> = combos.iter().skip(2).collect();
    for i in 0..child_combos.len() {
        for j in (i + 1)..child_combos.len() {
            let a = child_combos[i].rect.as_ref().unwrap();
            let b = child_combos[j].rect.as_ref().unwrap();
            assert!(
                !overlaps(a, b),
                "Sibling combos '{}' and '{}' overlap:\n  A: {:?}\n  B: {:?}",
                child_combos[i].id,
                child_combos[j].id,
                a,
                b
            );
        }
    }

    // Check direct node doesn't overlap with any child combo
    let index_rect = nodes[0].rect.as_ref().unwrap();
    for child_combo in &child_combos {
        let combo_rect = child_combo.rect.as_ref().unwrap();
        assert!(
            !overlaps(index_rect, combo_rect),
            "Direct node 'index.ts' overlaps with combo '{}':\n  Node: {:?}\n  Combo: {:?}",
            child_combo.id,
            index_rect,
            combo_rect
        );
    }

    // Check containment: src combo contains all children
    let src_rect = combos[1].rect.as_ref().unwrap();
    assert!(index_rect.left >= src_rect.left);
    assert!(index_rect.top >= src_rect.top);
    assert!(index_rect.left + index_rect.width <= src_rect.left + src_rect.width);
    assert!(index_rect.top + index_rect.height <= src_rect.top + src_rect.height);

    for child_combo in &child_combos {
        let combo_rect = child_combo.rect.as_ref().unwrap();
        assert!(
            combo_rect.left >= src_rect.left
                && combo_rect.top >= src_rect.top
                && combo_rect.left + combo_rect.width <= src_rect.left + src_rect.width
                && combo_rect.top + combo_rect.height <= src_rect.top + src_rect.height,
            "Combo '{}' not contained in src:\n  Child: {:?}\n  Src: {:?}",
            child_combo.id,
            combo_rect,
            src_rect
        );
    }
}
