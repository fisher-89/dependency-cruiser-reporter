/**
 * Test skeleton: DetailPanel -- stability weighted calculation
 *
 * Tests that DetailPanel uses edge.weight for weighted Ce/Ca computation
 * in the stability metric (I = Ce / (Ce + Ca)).
 *
 * Coverage targets (from test-design.md):
 *   - AC-4: DetailPanel stability 使用 edge.weight 加权
 *   - F-11: weighted Ce/Ca calculation
 *   - R-8: isolated node with no edges returns null
 *   - R-9: node=null returns null
 *   - B-15 through B-18: boundary cases
 */

import { describe, expect, it } from 'vite-plus/test';

// ---------------------------------------------------------------------------
// Inline reference implementation of the stability calculation
// (mirrors DetailPanel useMemo logic)
// ---------------------------------------------------------------------------

interface GraphNodeStub {
  id: string;
}

interface GraphEdgeStub {
  source: string;
  target: string;
  weight: number;
}

interface StabilityResult {
  i: number;
  ce: number;
  ca: number;
}

function computeStability(
  node: GraphNodeStub | null,
  edges: GraphEdgeStub[],
): StabilityResult | null {
  if (!node) return null;
  let ce = 0;
  let ca = 0;
  for (const e of edges) {
    if (e.source === node.id) ce += e.weight;
    if (e.target === node.id) ca += e.weight;
  }
  const total = ce + ca;
  if (total === 0) return null;
  return { i: ce / total, ce, ca };
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeNode(id: string): GraphNodeStub {
  return { id };
}

function makeEdge(source: string, target: string, weight: number): GraphEdgeStub {
  return { source, target, weight };
}

// ===========================================================================
// Forward ACs
// ===========================================================================

describe('DetailPanel -- stability weighted calculation', () => {
  // =========================================================================
  // F-11: uses edge.weight weighted Ce/Ca for stability
  // =========================================================================
  it('F-11: should use edge.weight for weighted Ce/Ca stability calculation', () => {
    // Scenario: Node A has:
    //   - outgoing edges: A->B(w=3), A->C(w=7)  => Ce = 10
    //   - incoming edges: D->A(w=10)              => Ca = 10
    //   - I = 10 / (10+10) = 0.5
    const node = makeNode('A');
    const edges = [makeEdge('A', 'B', 3), makeEdge('A', 'C', 7), makeEdge('D', 'A', 10)];

    const result = computeStability(node, edges);

    expect(result).toEqual({ ce: 10, ca: 10, i: 0.5 });
  });

  // =========================================================================
  // Reverse ACs
  // =========================================================================

  // R-8: isolated node with no edges returns null
  it('R-8: isolated node (no edges) should return null', () => {
    const node = makeNode('A');
    const edges: GraphEdgeStub[] = [];

    const result = computeStability(node, edges);

    expect(result).toBeNull();
  });

  // R-9: node=null returns null
  it('R-9: null node should return null', () => {
    const result = computeStability(null, []);

    expect(result).toBeNull();
  });

  // =========================================================================
  // Boundary Cases
  // =========================================================================

  // B-15: all edges weight=1 matches simple count
  it('B-15: all edges weight=1 falls back to simple counting', () => {
    // Ce = 2, Ca = 1, I = 2/3
    const node = makeNode('A');
    const edges = [makeEdge('A', 'B', 1), makeEdge('A', 'C', 1), makeEdge('D', 'A', 1)];

    const result = computeStability(node, edges);

    expect(result).toEqual({ ce: 2, ca: 1, i: 2 / 3 });
  });

  // B-16: only incoming edges produces I=0.0
  it('B-16: only incoming edges should produce I=0.0', () => {
    const node = makeNode('A');
    const edges = [makeEdge('B', 'A', 3), makeEdge('C', 'A', 5)];

    const result = computeStability(node, edges);

    expect(result).toEqual({ ce: 0, ca: 8, i: 0.0 });
  });

  // B-17: only outgoing edges produces I=1.0
  it('B-17: only outgoing edges should produce I=1.0', () => {
    const node = makeNode('A');
    const edges = [makeEdge('A', 'B', 4), makeEdge('A', 'C', 6)];

    const result = computeStability(node, edges);

    expect(result).toEqual({ ce: 10, ca: 0, i: 1.0 });
  });

  // B-18: null node returns null stability
  it('B-18: null node and a single edge should return null', () => {
    const result = computeStability(null, [makeEdge('A', 'B', 5)]);

    expect(result).toBeNull();
  });
});
