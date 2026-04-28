import type { ProcessedGraph } from '../types';

/**
 * Build G6-compatible graph data from ProcessedGraph.
 *
 * Key insight: Node IDs and Combo IDs must be unique in G6.
 * For directory nodes, their ID equals their path, which would collide
 * with combo IDs built from the same path. Solution: prefix combo IDs.
 */
export function buildGraphData(data: ProcessedGraph) {
  const comboMap = new Map<string, { id: string; label: string; combo?: string }>();
  const COMBO_PREFIX = 'combo:';

  const nodes = data.nodes.map((n) => {
    const pathParts = (n.path ?? n.id).split('/');
    // Directory path = remove last segment (filename) for files
    const dirParts = n.node_type === 'directory' ? pathParts : pathParts.slice(0, -1);
    // Create combo ID with prefix to avoid collision with node IDs
    const comboId =
      dirParts.length > 0 ? `${COMBO_PREFIX}${dirParts.join('/')}` : `${COMBO_PREFIX}root`;

    // Register combo and all its parents
    for (let i = 1; i <= dirParts.length; i++) {
      const id = `${COMBO_PREFIX}${dirParts.slice(0, i).join('/')}`;
      if (!comboMap.has(id)) {
        comboMap.set(id, {
          id,
          label: dirParts[i - 1],
          combo:
            i > 1 ? `${COMBO_PREFIX}${dirParts.slice(0, i - 1).join('/')}` : `${COMBO_PREFIX}root`,
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

  // Ensure root combo exists
  const rootComboId = `${COMBO_PREFIX}root`;
  if (!comboMap.has(rootComboId)) {
    comboMap.set(rootComboId, { id: rootComboId, label: '/' });
  }
  // Nodes without directory path go into root
  for (const n of nodes) {
    if (!n.combo) {
      n.combo = rootComboId;
    }
  }

  const edges = data.edges.map((e, i) => ({
    id: `${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    data: {
      edge_type: e.edge_type,
      weight: e.weight,
    },
  }));

  const combos = Array.from(comboMap.values());

  return { nodes, edges, combos };
}
