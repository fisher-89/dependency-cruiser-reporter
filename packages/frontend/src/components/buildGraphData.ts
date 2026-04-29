import type { ProcessedGraph } from '../types';

const COMBO_PREFIX = 'combo:';

/**
 * Build G6-compatible graph data from ProcessedGraph.
 *
 * Key insight: Node IDs and Combo IDs must be unique in G6.
 * For directory nodes, their ID equals their path, which would collide
 * with combo IDs built from the same path. Solution: prefix combo IDs.
 *
 * Combos with only one child are collapsed — the single node is
 * reassigned to the nearest ancestor combo that has multiple children
 * (or to root). This avoids rendering combos that visually overlap
 * with their sole child node.
 */
export function buildGraphData(data: ProcessedGraph) {
  const rootComboId = `${COMBO_PREFIX}root`;
  const comboMap = new Map<string, { id: string; label: string; level: number; combo?: string }>();

  // Phase 1: Build initial nodes and combos from directory paths
  const nodes = data.nodes.map((n) => {
    const pathParts = (n.path ?? n.id).split('/');
    const dirParts = n.node_type === 'directory' ? pathParts : pathParts.slice(0, -1);
    const comboId = dirParts.length > 0 ? `${COMBO_PREFIX}${dirParts.join('/')}` : rootComboId;

    for (let i = 1; i <= dirParts.length; i++) {
      const id = `${COMBO_PREFIX}${dirParts.slice(0, i).join('/')}`;
      if (!comboMap.has(id)) {
        comboMap.set(id, {
          id,
          label: dirParts[i - 1],
          level: i,
          combo: i > 1 ? `${COMBO_PREFIX}${dirParts.slice(0, i - 1).join('/')}` : rootComboId,
        });
      }
    }

    return {
      id: n.id,
      data: {
        label: n.label,
        node_type: n.node_type,
        violation_count: n.violation_count,
      },
      combo: comboId,
    };
  });

  if (!comboMap.has(rootComboId)) {
    comboMap.set(rootComboId, { id: rootComboId, label: '/', level: 0 });
  }
  for (const n of nodes) {
    if (!n.combo) n.combo = rootComboId;
  }

  // Phase 2: Collapse single-child combos
  // Count direct children (nodes + sub-combos) per combo
  const childCounts = new Map<string, number>();
  for (const n of nodes) {
    childCounts.set(n.combo, (childCounts.get(n.combo) ?? 0) + 1);
  }
  for (const c of comboMap.values()) {
    if (c.combo) {
      childCounts.set(c.combo, (childCounts.get(c.combo) ?? 0) + 1);
    }
  }

  // Re-assign from leaves upward: single-child combos collapse into their parent
  const collapsedCombos = new Set<string>();

  // Sort combos by depth (deepest first) so children are processed before parents
  const sortedCombos = Array.from(comboMap.values()).sort(
    (a, b) => b.id.split('/').length - a.id.split('/').length
  );

  for (const combo of sortedCombos) {
    if (combo.id === rootComboId) continue;
    if (collapsedCombos.has(combo.id)) continue;

    const count = childCounts.get(combo.id) ?? 0;
    if (count > 1) continue;

    // Collapse: move nodes and sub-combos to parent
    const parentId = combo.combo ?? rootComboId;
    collapsedCombos.add(combo.id);

    // Reassign nodes
    for (const n of nodes) {
      if (n.combo === combo.id) n.combo = parentId;
    }

    // Reassign sub-combos' parent
    for (const c of comboMap.values()) {
      if (c.combo === combo.id) c.combo = parentId;
    }

    // Update child counts: remove from this combo, add to parent
    childCounts.set(parentId, (childCounts.get(parentId) ?? 0) + (count - 1));
  }

  // Filter out collapsed combos, sorted so parents appear before children
  // (G6's addComboData processes combos in order and requires parent to exist)
  const combos = Array.from(comboMap.values())
    .filter((c) => !collapsedCombos.has(c.id))
    .sort((a, b) => {
      // Root has no parent, must come first
      if (a.id === rootComboId) return -1;
      if (b.id === rootComboId) return 1;
      // Sort by path depth: fewer segments = shallower = first
      const depthA = a.id.slice(COMBO_PREFIX.length).split('/').length;
      const depthB = b.id.slice(COMBO_PREFIX.length).split('/').length;
      return depthA - depthB;
    });

  const edges = data.edges.map((e, i) => ({
    id: `${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    data: {
      edge_type: e.edge_type,
      weight: e.weight,
    },
  }));

  return { nodes, edges, combos };
}
