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
