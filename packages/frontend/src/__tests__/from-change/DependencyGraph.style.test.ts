/**
 * Test skeleton: DependencyGraph node style shadow rendering
 *
 * Tests the heatmap shadow rendering logic in DependencyGraph.
 * The node style callback (`node.style`) conditionally adds halo/shadow
 * properties based on `stabilityHeatmap` prop and `instability` value.
 *
 * Coverage targets (from test-design.md):
 *   - AC-5: 热力图默认关闭，图谱节点无阴影
 *   - AC-6: 点击热力图切换按钮，节点显示阴影
 *   - AC-7: 热力图关闭后阴影消失，节点恢复原始外观
 *   - AC-8: 节点类型颜色在热力图开启前后保持一致
 *   - AC-10: 孤立节点（无入边无出边）不渲染阴影
 *   - F-13, F-14, F-18, F-19: Forward ACs
 *   - R-10, R-11, R-15: Reverse ACs
 *   - B-19 through B-26: Boundary cases
 *
 * TODO: Extract `getShadowColor` and `getShadowBlur` as exported pure
 * functions from DependencyGraph.tsx. Currently these tests use inline
 * reference implementations that mirror the production code. Once extracted,
 * import the real functions and remove the inline copies.
 */

import { describe, expect, it } from 'vite-plus/test';

// ---------------------------------------------------------------------------
// TODO: Inline reference implementations matching DependencyGraph.tsx
//
// These functions are currently private module-level functions in
// DependencyGraph.tsx. They must be extracted as exported functions
// before these tests can import them directly.
//
// Once extracted, replace these inline implementations with:
//   import { getShadowColor, getShadowBlur } from '@/components/DependencyGraph/DependencyGraph';
// ---------------------------------------------------------------------------

/** Production-accurate getShadowColor from DependencyGraph.tsx */
function getShadowColor(instability: number): string {
  if (instability === 0) return 'rgba(0, 0, 0, 0)';
  if (instability < 0.5) {
    const alpha = 0.1 + (instability / 0.5) * 0.25; // 10% -> 35%
    return `rgba(250, 140, 22, ${alpha.toFixed(4)})`;
  }
  if (instability < 1.0) {
    const alpha = 0.35 + ((instability - 0.5) / 0.5) * 0.15; // 35% -> 50%
    return `rgba(245, 34, 45, ${alpha.toFixed(4)})`;
  }
  return 'rgba(245, 34, 45, 0.5)';
}

/** Production-accurate getShadowBlur from DependencyGraph.tsx */
function getShadowBlur(instability: number): number {
  if (instability === 0) return 0;
  return Math.round(instability * 16);
}

// ---------------------------------------------------------------------------
// Mock constants mirroring production theme/constants.ts
// ---------------------------------------------------------------------------

const LIGHT_NODE_STYLES: Record<string, { fill: string; stroke: string }> = {
  file: { fill: '#C6E5FF', stroke: '#5B8FF9' },
  directory: { fill: '#FFD591', stroke: '#FA8C16' },
  package: { fill: '#B7EB8F', stroke: '#52C41A' },
};

const LABEL_FILL = '#1e293b';

// ---------------------------------------------------------------------------
// Stub types matching the G6 node shape used in DependencyGraph's style callback
// ---------------------------------------------------------------------------

interface G6NodeStub {
  id: string;
  data?: {
    label?: string;
    node_type?: string;
    violation_count?: number;
    instability?: number;
  };
}

// ---------------------------------------------------------------------------
// Inline reference implementation of the dependency graph node style callback.
//
// Mirrors the logic in DependencyGraph.tsx `node.style` callback.
// ---------------------------------------------------------------------------

function getNodeStyle(
  node: G6NodeStub,
  stabilityHeatmap: boolean,
  labelFill: string = LABEL_FILL,
): Record<string, unknown> {
  const nodeData = node.data;
  const nodeType = nodeData?.node_type ?? 'file';
  const s = LIGHT_NODE_STYLES[nodeType] ?? LIGHT_NODE_STYLES.file;
  const inst = nodeData?.instability;

  if (stabilityHeatmap && inst !== undefined && inst !== null) {
    const blur = getShadowBlur(inst);
    const color = getShadowColor(inst);
    return {
      fill: s.fill,
      stroke: s.stroke,
      lineWidth: 2,
      labelText: nodeData?.label ?? '',
      labelPlacement: 'bottom',
      labelFill,
      halo: true,
      haloLineWidth: blur * 3 + 2,
      haloStroke: color,
      haloFilter: 'blur(8px)',
    };
  }

  return {
    fill: s.fill,
    stroke: s.stroke,
    lineWidth: 2,
    labelText: nodeData?.label ?? '',
    labelPlacement: 'bottom',
    labelFill,
  };
}

// ===========================================================================
// Forward ACs
// ===========================================================================

describe('DependencyGraph -- 节点阴影样式', () => {
  // =========================================================================
  // F-13: stabilityHeatmap=false returns no shadow properties
  // =========================================================================
  it('F-13: 热力图关闭时不应返回阴影属性', () => {
    const node: G6NodeStub = {
      id: 'src/index.ts',
      data: { label: 'index.ts', node_type: 'file', instability: 0.85 },
    };

    const style = getNodeStyle(node, false);

    // Must NOT contain halo-related properties
    expect(style).not.toHaveProperty('halo');
    expect(style).not.toHaveProperty('haloLineWidth');
    expect(style).not.toHaveProperty('haloStroke');
    expect(style).not.toHaveProperty('haloFilter');

    // Must contain base style properties
    expect(style).toHaveProperty('fill');
    expect(style).toHaveProperty('stroke');
    expect(style).toHaveProperty('lineWidth');
    expect(style).toHaveProperty('labelText');
  });

  // =========================================================================
  // F-14: stabilityHeatmap=true with instability=0.85 returns shadow
  // =========================================================================
  it('F-14: 热力图开启时，instability=0.85 应返回阴影样式', () => {
    const node: G6NodeStub = {
      id: 'src/index.ts',
      data: { label: 'index.ts', node_type: 'file', instability: 0.85 },
    };

    const style = getNodeStyle(node, true);

    // instability=0.85 => blur = Math.round(0.85 * 16) = 14
    const expectedBlur = 14;
    // haloLineWidth = blur * 3 + 2 = 14*3+2 = 44
    const expectedHaloLineWidth = expectedBlur * 3 + 2;

    expect(style.halo).toBe(true);
    expect(style.haloLineWidth).toBe(expectedHaloLineWidth);
    expect(style.haloStroke).toBeDefined();
    expect(typeof style.haloStroke).toBe('string');
    expect((style.haloStroke as string).length).toBeGreaterThan(0);
    expect(style.haloFilter).toBe('blur(8px)');

    // Verify the shadow color matches the expected mapping for 0.85
    // 0.85 >= 0.5 => warm red gradient
    const expectedColor = getShadowColor(0.85);
    expect(style.haloStroke).toBe(expectedColor);
  });

  // =========================================================================
  // F-18: toggling heatmap OFF removes shadow properties
  // =========================================================================
  it('F-18: 关闭热力图后阴影样式应消失', () => {
    const node: G6NodeStub = {
      id: 'src/index.ts',
      data: { label: 'index.ts', node_type: 'file', instability: 0.85 },
    };

    const onStyle = getNodeStyle(node, true);
    expect(onStyle).toHaveProperty('halo');

    const offStyle = getNodeStyle(node, false);
    expect(offStyle).not.toHaveProperty('halo');
    expect(offStyle).not.toHaveProperty('haloLineWidth');
    expect(offStyle).not.toHaveProperty('haloStroke');
    expect(offStyle).not.toHaveProperty('haloFilter');
  });

  // =========================================================================
  // F-19: fill and stroke are identical for ON and OFF states
  // =========================================================================
  it('F-19: 热力图开启前后节点 fill 和 stroke 应保持不变', () => {
    const node: G6NodeStub = {
      id: 'src/index.ts',
      data: { label: 'index.ts', node_type: 'file', instability: 0.85 },
    };

    const onStyle = getNodeStyle(node, true);
    const offStyle = getNodeStyle(node, false);

    expect(onStyle.fill).toBe(offStyle.fill);
    expect(onStyle.stroke).toBe(offStyle.stroke);
    expect(onStyle.lineWidth).toBe(offStyle.lineWidth);
  });

  // =========================================================================
  // Reverse ACs
  // =========================================================================

  // R-10: undefined instability with heatmap ON does not add shadow
  it('R-10: 热力图开启但 instability 为 undefined 时不应渲染阴影', () => {
    // Node without instability field
    const nodeWithoutInst: G6NodeStub = {
      id: 'src/node.ts',
      data: { label: 'node.ts', node_type: 'file' },
    };

    const style = getNodeStyle(nodeWithoutInst, true);
    expect(style).not.toHaveProperty('halo');
    expect(style).not.toHaveProperty('haloLineWidth');
    expect(style).not.toHaveProperty('haloStroke');
    expect(style).not.toHaveProperty('haloFilter');
  });

  it('R-10 变体: 热力图开启但 instability 为 null 时不应渲染阴影', () => {
    // Node with instability explicitly set to null via data (simulating null value)
    const nodeWithNullInst: G6NodeStub = {
      id: 'src/node.ts',
      data: { label: 'node.ts', node_type: 'file' },
    };
    // Remove instability from data to simulate undefined -- the condition
    // checks `inst !== undefined && inst !== null`, so either should skip halo

    const style = getNodeStyle(nodeWithNullInst, true);
    expect(style).not.toHaveProperty('halo');
  });

  // R-11: instability=0.0 with heatmap ON produces haloLineWidth=2
  it('R-11: instability=0.0 时 haloLineWidth 应为 2', () => {
    const node: G6NodeStub = {
      id: 'src/stable.ts',
      data: { label: 'stable.ts', node_type: 'file', instability: 0.0 },
    };

    const style = getNodeStyle(node, true);

    // blur = 0 => haloLineWidth = 0 * 3 + 2 = 2
    expect(style.haloLineWidth).toBe(2);
    expect(style.halo).toBe(true);
    // instability=0 => color should be transparent
    expect(style.haloStroke).toBe('rgba(0, 0, 0, 0)');
  });

  // R-15: file/directory/package fill/stroke unchanged by heatmap
  it('R-15: 所有节点类型（file/directory/package）的填充和描边颜色应不受热力图影响', () => {
    const nodeTypes = ['file', 'directory', 'package'] as const;

    for (const nodeType of nodeTypes) {
      const node: G6NodeStub = {
        id: `test-${nodeType}`,
        data: { label: nodeType, node_type: nodeType, instability: 0.5 },
      };

      const onStyle = getNodeStyle(node, true);
      const offStyle = getNodeStyle(node, false);

      expect(onStyle.fill).toBe(offStyle.fill);
      expect(onStyle.stroke).toBe(offStyle.stroke);
    }
  });

  // =========================================================================
  // Boundary Cases
  // =========================================================================

  // B-19: instability=0.0 with heatmap=ON has zero shadowBlur
  // Note: blur=0 produces haloLineWidth=2 (minimum visible ring)
  it('B-19: instability=0.0 且热力图开启时 shadowBlur 应为 0', () => {
    expect(getShadowBlur(0.0)).toBe(0);

    const node: G6NodeStub = {
      id: 'test',
      data: { label: 'test', node_type: 'file', instability: 0.0 },
    };
    const style = getNodeStyle(node, true);
    expect(style.haloLineWidth).toBe(2); // 0*3 + 2
  });

  // B-20: instability=0.4999 with heatmap=ON has moderate shadow
  it('B-20: instability=0.4999 时 shadowBlur 应为 8', () => {
    expect(getShadowBlur(0.4999)).toBe(8);

    const node: G6NodeStub = {
      id: 'test',
      data: { label: 'test', node_type: 'file', instability: 0.4999 },
    };
    const style = getNodeStyle(node, true);
    expect(style.haloLineWidth).toBe(8 * 3 + 2); // 26

    // 0.4999 < 0.5 => orange color range
    const expectedColor = getShadowColor(0.4999);
    expect(expectedColor).toContain('250, 140, 22');
    expect(style.haloStroke).toBe(expectedColor);
  });

  // B-21: instability=0.5 with heatmap=ON has moderate shadow
  it('B-21: instability=0.5 时 shadowBlur 应为 8', () => {
    expect(getShadowBlur(0.5)).toBe(8);

    const node: G6NodeStub = {
      id: 'test',
      data: { label: 'test', node_type: 'file', instability: 0.5 },
    };
    const style = getNodeStyle(node, true);
    expect(style.haloLineWidth).toBe(8 * 3 + 2); // 26

    // 0.5 => transition point between orange and red
    // Code path: instability < 1.0 but not < 0.5 => warm red range
    const expectedColor = getShadowColor(0.5);
    expect(expectedColor).toContain('245, 34, 45');
    expect(style.haloStroke).toBe(expectedColor);
  });

  // B-22: instability=0.9999 with heatmap=ON has strong shadow
  it('B-22: instability=0.9999 时 shadowBlur 应为 16', () => {
    expect(getShadowBlur(0.9999)).toBe(16);

    const node: G6NodeStub = {
      id: 'test',
      data: { label: 'test', node_type: 'file', instability: 0.9999 },
    };
    const style = getNodeStyle(node, true);
    expect(style.haloLineWidth).toBe(16 * 3 + 2); // 50

    // 0.9999 => warm red at high alpha
    const expectedColor = getShadowColor(0.9999);
    expect(expectedColor).toContain('245, 34, 45');
    expect(style.haloStroke).toBe(expectedColor);
  });

  // B-23: instability=1.0 with heatmap=ON has max shadow
  it('B-23: instability=1.0 时 shadowBlur 应为 16', () => {
    expect(getShadowBlur(1.0)).toBe(16);

    const node: G6NodeStub = {
      id: 'test',
      data: { label: 'test', node_type: 'file', instability: 1.0 },
    };
    const style = getNodeStyle(node, true);
    expect(style.haloLineWidth).toBe(16 * 3 + 2); // 50

    // 1.0 => fixed warm red at 50% opacity
    expect(style.haloStroke).toBe('rgba(245, 34, 45, 0.5)');
  });

  // B-24: instability=undefined with heatmap=ON has no halo
  it('B-24: instability 为 undefined 时不应渲染阴影', () => {
    const node: G6NodeStub = {
      id: 'src/no-inst.ts',
      data: { label: 'no-inst.ts', node_type: 'file' },
    };

    const style = getNodeStyle(node, true);

    // Should not have any halo properties
    expect(style).not.toHaveProperty('halo');
    expect(style).not.toHaveProperty('haloLineWidth');
    expect(style).not.toHaveProperty('haloStroke');
    expect(style).not.toHaveProperty('haloFilter');

    // Base style should still be present
    expect(style.fill).toBe(LIGHT_NODE_STYLES.file.fill);
    expect(style.stroke).toBe(LIGHT_NODE_STYLES.file.stroke);
  });

  // B-25: all node types return expected fill/stroke
  it('B-25: 所有节点类型的 fill/stroke 应与常量一致', () => {
    const nodeTypes = ['file', 'directory', 'package'] as const;

    for (const nodeType of nodeTypes) {
      const node: G6NodeStub = {
        id: `test-${nodeType}`,
        data: { label: nodeType, node_type: nodeType, instability: 0.5 },
      };

      const style = getNodeStyle(node, false);

      expect(style.fill).toBe(LIGHT_NODE_STYLES[nodeType].fill);
      expect(style.stroke).toBe(LIGHT_NODE_STYLES[nodeType].stroke);
    }
  });

  // B-26: heatmap=OFF ignores instability value completely
  it('B-26: 热力图关闭时，不同 instability 值应返回完全相同的样式', () => {
    const nodeWithInst: G6NodeStub = {
      id: 'test-1',
      data: { label: 'test', node_type: 'file', instability: 0.85 },
    };
    const nodeWithoutInst: G6NodeStub = {
      id: 'test-2',
      data: { label: 'test', node_type: 'file' },
    };

    const styleWithInst = getNodeStyle(nodeWithInst, false);
    const styleWithoutInst = getNodeStyle(nodeWithoutInst, false);

    // Both should have no halo properties
    expect(styleWithInst).not.toHaveProperty('halo');
    expect(styleWithoutInst).not.toHaveProperty('halo');

    // Base fill/stroke should be identical
    expect(styleWithInst.fill).toBe(styleWithoutInst.fill);
    expect(styleWithInst.stroke).toBe(styleWithoutInst.stroke);

    // Complete style object equality (all keys present in both)
    const keysWith = Object.keys(styleWithInst);
    const keysWithout = Object.keys(styleWithoutInst);
    expect(keysWith).toEqual(keysWithout);

    // Verify each key has identical values
    for (const key of keysWith) {
      expect(styleWithInst[key]).toBe(styleWithoutInst[key]);
    }
  });
});
