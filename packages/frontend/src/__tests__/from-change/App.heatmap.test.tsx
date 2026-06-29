/**
 * Test skeleton: App -- stabilityHeatmap 状态管理
 *
 * Tests the App-level stabilityHeatmap state:
 *   - Defaults to false on initial render
 *   - Persists across route changes
 *   - Prop is correctly passed from App -> GraphViewLayout -> DependencyGraph
 *
 * Coverage targets (from test-design.md):
 *   - AC-5: 热力图默认关闭
 *   - F-12: stabilityHeatmap state defaults to false
 *   - R-14: stabilityHeatmap state persists when switching routes
 *   - 组件树连通性: prop chain through App -> GraphViewLayout -> DependencyGraph
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import App from '@/App';

// ---------------------------------------------------------------------------
// Mock child components
// ---------------------------------------------------------------------------

/** Track props passed to DependencyGraph */
const dependencyGraphProps: { stabilityHeatmap?: boolean } = {};

vi.mock('@/components/DependencyGraph/DependencyGraph', () => ({
  DependencyGraph: (props: { stabilityHeatmap?: boolean }) => {
    dependencyGraphProps.stabilityHeatmap = props.stabilityHeatmap;
    return <div data-testid="dependency-graph-mock">DependencyGraph Mock</div>;
  },
}));

/** Track props passed to GraphViewLayout */
const graphViewLayoutProps: {
  stabilityHeatmap?: boolean;
  onStabilityHeatmapChange?: (value: boolean) => void;
} = {};

vi.mock('@/components/GraphViewLayout', () => ({
  GraphViewLayout: (props: {
    children: React.ReactNode;
    stabilityHeatmap?: boolean;
    onStabilityHeatmapChange?: (value: boolean) => void;
  }) => {
    graphViewLayoutProps.stabilityHeatmap = props.stabilityHeatmap;
    graphViewLayoutProps.onStabilityHeatmapChange = props.onStabilityHeatmapChange;
    return <div data-testid="graph-view-layout-mock">{props.children}</div>;
  },
}));

vi.mock('@/components/DetailPanel', () => ({
  default: () => <div data-testid="detail-panel-mock">DetailPanel Mock</div>,
  DetailPanel: () => <div data-testid="detail-panel-mock">DetailPanel Mock</div>,
}));

vi.mock('@/components/ArchitectureView', () => ({
  default: () => <div data-testid="architecture-view-mock">ArchitectureView Mock</div>,
  ArchitectureView: () => <div data-testid="architecture-view-mock">ArchitectureView Mock</div>,
}));

// ---------------------------------------------------------------------------
// Mock i18n
// ---------------------------------------------------------------------------
vi.mock('@/i18n', () => ({
  useT: () => ({ t: (key: string) => key, lang: 'en', setLang: vi.fn() }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock theme
// ---------------------------------------------------------------------------
vi.mock('@/theme', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', cycleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock hooks
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useGraphData', () => ({
  useGraphData: () => ({
    data: {
      nodes: [
        {
          id: 'src/index.ts',
          label: 'index.ts',
          node_type: 'file',
          path: 'src/index.ts',
          violation_count: 0,
        },
        {
          id: 'src/utils.ts',
          label: 'utils.ts',
          node_type: 'file',
          path: 'src/utils.ts',
          violation_count: 0,
        },
      ],
      edges: [{ source: 'src/index.ts', target: 'src/utils.ts', edge_type: 'local', weight: 1 }],
      combos: [],
      meta: { original_node_count: 2, aggregated_node_count: 2, total_violations: 0 },
      violations: [],
    },
    loading: false,
    error: null,
    expandedDirs: new Set<string>(),
    fetchGraph: vi.fn(),
    refresh: vi.fn(),
    toggleDir: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function stubIntersectionObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  );
}

function renderApp(initialEntries = ['/graph']) {
  // Reset tracked props
  dependencyGraphProps.stabilityHeatmap = undefined;
  graphViewLayoutProps.stabilityHeatmap = undefined;
  graphViewLayoutProps.onStabilityHeatmapChange = undefined;

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('App -- stabilityHeatmap 状态管理', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubIntersectionObserver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // =========================================================================
  // F-12: stabilityHeatmap state defaults to false on initial render
  // =========================================================================
  it('F-12: stabilityHeatmap 初始值应为 false', async () => {
    renderApp();

    // Wait for the graph view to render
    await screen.findByTestId('graph-view-layout-mock');

    // Both GraphViewLayout and DependencyGraph should receive false
    expect(graphViewLayoutProps.stabilityHeatmap).toBe(false);
    // DependencyGraph receives the prop via routing inside GraphViewLayout
    expect(dependencyGraphProps.stabilityHeatmap).toBe(false);
  });

  // =========================================================================
  // R-14: stabilityHeatmap state persists when switching routes
  // =========================================================================
  it('R-14: stabilityHeatmap 状态在路由切换时应保持', async () => {
    // Steps:
    //   1. Render App at /graph
    //   2. Toggle heatmap ON via onStabilityHeatmapChange callback
    //   3. Navigate to /report via nav link
    //   4. Navigate back to /graph via nav link
    //   5. Verify stabilityHeatmap is still true throughout

    renderApp();

    await screen.findByTestId('graph-view-layout-mock');

    // Initially should be false
    expect(graphViewLayoutProps.stabilityHeatmap).toBe(false);

    // Toggle heatmap ON via the onStabilityHeatmapChange callback from App
    graphViewLayoutProps.onStabilityHeatmapChange?.(true);

    // Wait for React re-render after setStabilityHeatmap(true)
    await vi.waitFor(() => {
      expect(graphViewLayoutProps.stabilityHeatmap).toBe(true);
    });

    // Navigate to /report by clicking the nav link
    fireEvent.click(screen.getByTestId('nav-report'));

    // Wait for report view content to render (ReportView with empty violations)
    await screen.findByText('report.noViolations');

    // After navigating to /report, stabilityHeatmap should still be true
    expect(graphViewLayoutProps.stabilityHeatmap).toBe(true);

    // Navigate back to /graph by clicking the nav link
    fireEvent.click(screen.getByTestId('nav-graph'));

    // Wait for the graph view to re-render (DependencyGraph mock appears)
    await screen.findByTestId('dependency-graph-mock');

    // stabilityHeatmap should still be true after round-trip navigation
    expect(graphViewLayoutProps.stabilityHeatmap).toBe(true);
    expect(dependencyGraphProps.stabilityHeatmap).toBe(true);
  });

  // =========================================================================
  // 组件树连通性: stabilityHeatmap prop is passed through the component chain
  // =========================================================================
  it('stabilityHeatmap 属性应从 App 传递到 GraphViewLayout', async () => {
    renderApp();

    await screen.findByTestId('graph-view-layout-mock');

    expect(graphViewLayoutProps).toHaveProperty('stabilityHeatmap');
    expect(graphViewLayoutProps).toHaveProperty('onStabilityHeatmapChange');
    expect(typeof graphViewLayoutProps.onStabilityHeatmapChange).toBe('function');
  });
});
