/**
 * Test skeleton: buildGraphData -- instability forwarding
 *
 * Tests that `buildGraphData` correctly forwards the `instability` field
 * from ProcessedGraph's GraphNode to G6NodeData.
 *
 * Coverage targets (from test-design.md):
 *   - AC-3: Frontend receives instability data and passes to G6NodeData
 *   - F-9: value forwarding (0.2941)
 *   - F-10: undefined GraphNode.instability -> undefined G6NodeData.instability
 *   - B-12: instability=0.0 exactly
 *   - B-13: instability undefined -> undefined
 *   - B-14: instability=1.0 exactly
 *   - B-extra: mixed nodes with and without instability
 */

import { describe, expect, it } from 'vite-plus/test';

import { buildGraphData } from '@/components/DependencyGraph/buildGraphData';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * TODO: These fixtures should match the ProcessedGraph type from @dcr-reporter/wasm.
 * GraphNode fields: id, label, node_type, path?, violation_count, orphan?,
 *   children?, combo?, rect?, instability?
 * GraphEdge fields: source, target, edge_type, weight, circular?,
 *   error_count?, warn_count?, info_count?
 * GraphCombo fields: id, label, combo?, rect?
 */

function makeNode(id: string, instability?: number) {
  return {
    id,
    label: id,
    node_type: 'file' as const,
    path: undefined,
    violation_count: 0,
    orphan: undefined,
    children: undefined,
    combo: undefined,
    rect: undefined,
    instability,
  };
}

function makeGraphData(instabilityValues: (number | undefined)[]) {
  return {
    nodes: instabilityValues.map((v, i) => makeNode(`node-${i}`, v)),
    edges: [],
    combos: [],
    meta: {
      original_node_count: instabilityValues.length,
      aggregated_node_count: instabilityValues.length,
      total_violations: 0,
    },
    violations: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildGraphData -- instability 转发', () => {
  // =========================================================================
  // F-9: forwards instability=0.2941 from GraphNode to G6NodeData
  // =========================================================================
  it('F-9: 应转发 instability=0.2941 从 GraphNode 到 G6NodeData', () => {
    const data = makeGraphData([0.2941]);
    const result = buildGraphData(data as Parameters<typeof buildGraphData>[0]);

    // TODO: Verify the exact type structure
    expect(result.nodes[0].data?.instability).toBe(0.2941);
  });

  // =========================================================================
  // F-10: undefined GraphNode.instability results in undefined G6NodeData.instability
  // =========================================================================
  it('F-10: undefined instability 应转发为 undefined', () => {
    const data = makeGraphData([undefined]);
    const result = buildGraphData(data as Parameters<typeof buildGraphData>[0]);

    expect(result.nodes[0].data?.instability).toBeUndefined();
  });

  // =========================================================================
  // B-12: forwards instability=0.0 exactly
  // =========================================================================
  it('B-12: 应转发 instability=0.0 精确值', () => {
    const data = makeGraphData([0.0]);
    const result = buildGraphData(data as Parameters<typeof buildGraphData>[0]);

    expect(result.nodes[0].data?.instability).toBe(0.0);
  });

  // =========================================================================
  // B-13: instability undefined results in undefined G6NodeData.instability
  // =========================================================================
  it('B-13: instability 为 undefined 时 G6NodeData.instability 应为 undefined', () => {
    const data = makeGraphData([undefined]);
    const result = buildGraphData(data as Parameters<typeof buildGraphData>[0]);

    expect(result.nodes[0].data?.instability).toBeUndefined();
  });

  // =========================================================================
  // B-14: forwards instability=1.0 exactly
  // =========================================================================
  it('B-14: 应转发 instability=1.0 精确值', () => {
    const data = makeGraphData([1.0]);
    const result = buildGraphData(data as Parameters<typeof buildGraphData>[0]);

    expect(result.nodes[0].data?.instability).toBe(1.0);
  });

  // =========================================================================
  // B-extra: handles mixed nodes with and without instability
  // =========================================================================
  it('B-extra: 应正确处理混合节点（部分有 instability，部分无）', () => {
    const data = makeGraphData([0.5, undefined, 0.0, 1.0]);
    const result = buildGraphData(data as Parameters<typeof buildGraphData>[0]);

    expect(result.nodes[0].data?.instability).toBe(0.5);
    expect(result.nodes[1].data?.instability).toBeUndefined();
    expect(result.nodes[2].data?.instability).toBe(0.0);
    expect(result.nodes[3].data?.instability).toBe(1.0);
  });
});
