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
    assert_eq!(node_rect.width, 20.0);
    assert_eq!(node_rect.height, 20.0);
    assert_eq!(node_rect.left, COMBO_PADDING);
    assert_eq!(node_rect.top, COMBO_PADDING);

    let combo_rect = combos[0].rect.as_ref().unwrap();
    assert_eq!(combo_rect.left, 0.0);
    assert_eq!(combo_rect.top, 0.0);
    assert_eq!(combo_rect.width, 2.0 * COMBO_PADDING + NODE_SIZE);
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
