/**
 * Unit tests: MetricsView component -- statistics cards and edge type distribution
 *
 * Tests the extraction of MetricsView from App.tsx, verifying statistics rendering
 * and empty data handling.
 *
 * Coverage targets (from test-design.md):
 *   - F-30: renders statistics cards
 *   - F-31: renders edge type distribution
 *   - F-31a: component has data-testid="metrics-view"
 *   - R-10: empty data renders default/zero states
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { ProcessedGraph } from '../types';
import { MetricsView } from './MetricsView';

// ---------------------------------------------------------------------------
// Mock i18n
// ---------------------------------------------------------------------------
vi.mock('../i18n', () => ({
  useT: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'metrics.originalNodes': 'Original Nodes',
        'metrics.aggregatedNodes': 'Aggregated Nodes',
        'metrics.dependencies': 'Dependencies',
        'metrics.violations': 'Violations',
        'metrics.edgeTypes': 'Edge Types',
      };
      return map[key] ?? key;
    },
    lang: 'en',
    setLang: vi.fn(),
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeProcessedGraph(overrides: Partial<ProcessedGraph> = {}): ProcessedGraph {
  return {
    nodes: [],
    edges: [],
    combos: [],
    meta: { original_node_count: 0, aggregated_node_count: 0, total_violations: 0 },
    violations: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MetricsView 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-30: renders statistics cards
  // ===========================================================================
  it('F-30: 渲染统计卡片（原始节点、聚合节点、依赖数、违规数）', () => {
    const data = makeProcessedGraph({
      meta: { original_node_count: 100, aggregated_node_count: 50, total_violations: 5 },
      edges: [{ source: 'a', target: 'b', edge_type: 'local', weight: 1 }],
    });
    render(<MetricsView data={data} />);

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    // edges.length=1 出现在依赖卡片和边类型分布中，使用 getAllByText 验证存在性
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('5')).toBeInTheDocument(); // total_violations
  });

  // ===========================================================================
  // F-31: renders edge type distribution
  // ===========================================================================
  it('F-31: 渲染边类型分布', () => {
    const data = makeProcessedGraph({
      edges: [
        { source: 'a', target: 'b', edge_type: 'local', weight: 1 },
        { source: 'c', target: 'd', edge_type: 'local', weight: 1 },
        { source: 'e', target: 'f', edge_type: 'npm', weight: 1 },
      ],
    });
    render(<MetricsView data={data} />);

    expect(screen.getByTestId('edge-type-local')).toBeInTheDocument();
    expect(screen.getByTestId('edge-type-npm')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-31a: component has data-testid="metrics-view"
  // ===========================================================================
  it('F-31a: 组件包含 data-testid="metrics-view"', () => {
    const data = makeProcessedGraph();
    render(<MetricsView data={data} />);

    expect(screen.getByTestId('metrics-view')).toBeInTheDocument();
  });

  // ===========================================================================
  // R-10: empty data renders default/zero states
  // ===========================================================================
  it('R-10: 空数据时各统计值显示 0', () => {
    const data = makeProcessedGraph();
    render(<MetricsView data={data} />);

    // 空图时所有统计为 0（四个统计卡片都显示 0）
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(4);
  });
});
