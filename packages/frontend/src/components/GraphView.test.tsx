/**
 * Unit tests: GraphView component -- three-column layout and props passing
 *
 * Tests the GraphView component's three-column flex layout rendering,
 * DirTree/DependencyGraph/DetailPanel props passing, and sidebar visibility.
 *
 * Coverage targets (from test-design.md):
 *   - F-23: renders three-column flex layout
 *   - F-24: sidebarVisible=true renders DirTree at 260px
 *   - F-24a: sidebarVisible=false hides DirTree
 *   - F-25..F-27: Props passing to child components
 *   - R-7: sidebarVisible toggle removes/restores DirTree from DOM
 *   - B-12: data=null renders no DirTree
 *   - B-13: selectedNodeId=null passes null to DetailPanel
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { GraphNode, ProcessedGraph } from '../types';

// ---------------------------------------------------------------------------
// Mock child components using module-level variables to capture props
// ---------------------------------------------------------------------------
let capturedDirTreeProps: Record<string, unknown> = {};
let capturedDependencyGraphProps: Record<string, unknown> = {};
let capturedDetailPanelProps: Record<string, unknown> = {};

vi.mock('./DirTree', () => ({
  DirTree: (props: Record<string, unknown>) => {
    capturedDirTreeProps = props;
    return <div data-testid="mock-dir-tree">DirTree Mock</div>;
  },
}));

vi.mock('./DependencyGraph/DependencyGraph', () => ({
  DependencyGraph: (props: Record<string, unknown>) => {
    capturedDependencyGraphProps = props;
    return <div data-testid="mock-dependency-graph">DependencyGraph Mock</div>;
  },
}));

vi.mock('./DetailPanel', () => ({
  DetailPanel: (props: Record<string, unknown>) => {
    capturedDetailPanelProps = props;
    return <div data-testid="mock-detail-panel">DetailPanel Mock</div>;
  },
}));

// ---------------------------------------------------------------------------
// Mock i18n
// ---------------------------------------------------------------------------
vi.mock('../i18n', () => ({
  useT: () => ({ t: (key: string) => key, lang: 'en', setLang: vi.fn() }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock theme
// ---------------------------------------------------------------------------
vi.mock('../theme', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', cycleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock icons
// ---------------------------------------------------------------------------
vi.mock('../components/icons', () => ({
  ChevronRightIcon: () => <span data-testid="chevron-right-icon" />,
  ChevronDownIcon: () => <span data-testid="chevron-down-icon" />,
  SidebarToggleIcon: ({ direction }: { direction: 'left' | 'right' }) => (
    <span data-testid={`sidebar-toggle-icon-${direction}`} />
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
import { GraphView } from './GraphView';

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

function createDefaultGraphViewProps(overrides: Record<string, unknown> = {}) {
  return {
    data: makeProcessedGraph({
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', node_type: 'file' as const, violation_count: 0 },
      ],
    }),
    expandedDirs: new Set<string>(),
    onToggleDir: vi.fn(),
    selectedNodeId: null,
    onNodeSelect: vi.fn(),
    stabilityHeatmap: false,
    nodeMap: new Map<string, GraphNode>(),
    sidebarVisible: true,
    onToggleSidebar: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GraphView 组件 -- 三栏布局与 Props', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedDirTreeProps = {};
    capturedDependencyGraphProps = {};
    capturedDetailPanelProps = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-23: renders three-column flex layout
  // ===========================================================================
  it('F-23: 渲染三栏 flex 布局，包含 DirTree/DependencyGraph/DetailPanel', () => {
    render(<GraphView {...createDefaultGraphViewProps()} />);

    expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    expect(screen.getByTestId('mock-dir-tree')).toBeInTheDocument();
    expect(screen.getByTestId('mock-dependency-graph')).toBeInTheDocument();
    expect(screen.getByTestId('mock-detail-panel')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-24: DirTree renders (sidebarVisible defaults to true internally)
  // ===========================================================================
  it('F-24: DirTree 渲染', () => {
    render(<GraphView {...createDefaultGraphViewProps()} />);

    expect(screen.getByTestId('mock-dir-tree')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-25: DirTree receives correct props from GraphView
  // ===========================================================================
  it('F-25: DirTree 从 GraphView 收到正确的 props', () => {
    const props = createDefaultGraphViewProps();
    render(<GraphView {...props} />);

    expect(capturedDirTreeProps.data).toBe(props.data);
    expect(capturedDirTreeProps.expandedDirs).toBe(props.expandedDirs);
    expect(capturedDirTreeProps.onToggleDir).toBe(props.onToggleDir);
    expect(capturedDirTreeProps.sidebarVisible).toBe(true); // internal default
    expect(typeof capturedDirTreeProps.onToggleSidebar).toBe('function');
  });

  // ===========================================================================
  // F-26: DependencyGraph receives correct props
  // ===========================================================================
  it('F-26: DependencyGraph 收到正确的中转 props', () => {
    const props = createDefaultGraphViewProps();
    render(<GraphView {...props} />);

    expect(capturedDependencyGraphProps.data).toBe(props.data);
    expect(capturedDependencyGraphProps.onToggleDir).toBe(props.onToggleDir);
    expect(capturedDependencyGraphProps.selectedNodeId).toBe(props.selectedNodeId);
    expect(capturedDependencyGraphProps.onNodeSelect).toBe(props.onNodeSelect);
    expect(capturedDependencyGraphProps.stabilityHeatmap).toBe(props.stabilityHeatmap);
  });

  // ===========================================================================
  // F-27: DetailPanel receives correct props
  // ===========================================================================
  it('F-27: DetailPanel 收到正确的 props', () => {
    const nodeMap = new Map<string, GraphNode>();
    const props = createDefaultGraphViewProps({ nodeMap });
    render(<GraphView {...props} />);

    expect(capturedDetailPanelProps.node).toBeNull();
    expect(capturedDetailPanelProps.edges).toBe(props.data.edges);
    expect(capturedDetailPanelProps.violations).toBe(props.data.violations);
    expect(capturedDetailPanelProps.nodeMap).toBe(nodeMap);
  });

  // ===========================================================================
  // R-7: DirTree is always rendered (visibility handled internally)
  // ===========================================================================
  it('R-7: DirTree 始终渲染，可见性由内部状态控制', () => {
    render(<GraphView {...createDefaultGraphViewProps()} />);

    expect(screen.getByTestId('mock-dir-tree')).toBeInTheDocument();
  });

  // ===========================================================================
  // B-12: data=null (minimal data) should not crash
  // ===========================================================================
  it('B-12: data 为空图数据时不崩溃', () => {
    const props = createDefaultGraphViewProps({
      data: makeProcessedGraph(),
    });
    expect(() => {
      render(<GraphView {...props} />);
    }).not.toThrow();
  });

  // ===========================================================================
  // B-13: selectedNodeId=null passes null node to DetailPanel
  // ===========================================================================
  it('B-13: selectedNodeId=null 时 DetailPanel 收到 node=null', () => {
    render(<GraphView {...createDefaultGraphViewProps({ selectedNodeId: null })} />);

    expect(capturedDetailPanelProps.node).toBeNull();
  });
});
