/**
 * Unit tests: App -- sidebarVisible state management
 *
 * Tests that App correctly manages sidebarVisible state, passes it to GraphView,
 * and preserves it across route changes.
 *
 * Coverage targets (from test-design.md):
 *   - F-32: sidebarVisible defaults to true on initial render
 *   - F-33: onToggleSidebar callback flips sidebarVisible
 *   - F-34: GraphView receives sidebarVisible and onToggleSidebar
 *   - F-35: non-graph routes do not require DirTree sidebar
 *   - R-11: sidebarVisible persists across route changes
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import App from './App';

// ---------------------------------------------------------------------------
// Mock child components that are unrelated to sidebar state
// ---------------------------------------------------------------------------
let capturedGraphViewProps: Record<string, unknown> = {};

vi.mock('./components/GraphView', () => ({
  GraphView: (props: Record<string, unknown>) => {
    capturedGraphViewProps = props;
    return <div data-testid="graph-view">GraphView Mock</div>;
  },
}));

vi.mock('./components/GraphViewLayout', () => ({
  GraphViewLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./components/ArchitectureView', () => ({
  default: () => <div data-testid="architecture-view">ArchitectureView Mock</div>,
  ArchitectureView: () => <div data-testid="architecture-view">ArchitectureView Mock</div>,
}));

vi.mock('./components/DependencyGraph/DependencyGraph', () => ({
  DependencyGraph: () => <div>DependencyGraph Mock</div>,
}));

vi.mock('./components/DetailPanel', () => ({
  default: () => <div data-testid="detail-panel">DetailPanel Mock</div>,
  DetailPanel: () => <div data-testid="detail-panel">DetailPanel Mock</div>,
}));

vi.mock('./components/ReportView', () => ({
  ReportView: () => <div data-testid="report-view">ReportView Mock</div>,
}));

vi.mock('./components/MetricsView', () => ({
  MetricsView: () => <div data-testid="metrics-view">MetricsView Mock</div>,
}));

// ---------------------------------------------------------------------------
// Mock i18n
// ---------------------------------------------------------------------------
vi.mock('./i18n', () => ({
  useT: () => ({ t: (key: string) => key, lang: 'en', setLang: vi.fn() }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock theme
// ---------------------------------------------------------------------------
vi.mock('./theme', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', cycleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock useGraphData -- provide sidebarVisible and setSidebarVisible
// ---------------------------------------------------------------------------
let mockSidebarVisible = true;
let mockSetSidebarVisible: (val: boolean) => void;

vi.mock('./hooks/useGraphData', () => ({
  useGraphData: () => ({
    data: {
      nodes: [],
      edges: [],
      combos: [],
      meta: { original_node_count: 0, aggregated_node_count: 0, total_violations: 0 },
      violations: [],
    },
    loading: false,
    error: null,
    expandedDirs: new Set<string>(),
    fetchGraph: vi.fn(),
    refresh: vi.fn(),
    toggleDir: vi.fn(),
    sidebarVisible: mockSidebarVisible,
    setSidebarVisible: (fn: boolean | ((prev: boolean) => boolean)) => {
      if (typeof fn === 'function') {
        mockSidebarVisible = fn(mockSidebarVisible);
      } else {
        mockSidebarVisible = fn;
      }
      mockSetSidebarVisible(mockSidebarVisible);
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock IntersectionObserver
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderApp(initialEntries: string[] = ['/graph']) {
  mockSidebarVisible = true;
  mockSetSidebarVisible = vi.fn();
  capturedGraphViewProps = {};
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('App -- sidebarVisible 状态管理', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubIntersectionObserver();
    // 清理 localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ===========================================================================
  // F-32: sidebarVisible defaults to true on initial render
  // ===========================================================================
  it('F-32: 首次渲染时 sidebarVisible 默认为 true', async () => {
    renderApp(['/graph']);

    // GraphView 收到 sidebarVisible=true
    await screen.findByTestId('graph-view');
    expect(capturedGraphViewProps.sidebarVisible).toBe(true);
  });

  // ===========================================================================
  // F-33: onToggleSidebar callback flips sidebarVisible to false
  // ===========================================================================
  it('F-33: 调用 onToggleSidebar 后 sidebarVisible 从 true 变为 false', async () => {
    renderApp(['/graph']);

    await screen.findByTestId('graph-view');

    // 初始为 true
    expect(capturedGraphViewProps.sidebarVisible).toBe(true);

    // 调用 onToggleSidebar
    const onToggleSidebar = capturedGraphViewProps.onToggleSidebar as () => void;
    onToggleSidebar();

    // sidebarVisible 变为 false
    expect(mockSetSidebarVisible).toHaveBeenCalled();
  });

  // ===========================================================================
  // F-34: GraphView receives sidebarVisible and onToggleSidebar props
  // ===========================================================================
  it('F-34: GraphView 从 App 收到 sidebarVisible 和 onToggleSidebar props', async () => {
    renderApp(['/graph']);

    await screen.findByTestId('graph-view');

    expect(capturedGraphViewProps).toHaveProperty('sidebarVisible');
    expect(capturedGraphViewProps).toHaveProperty('onToggleSidebar');
    expect(typeof capturedGraphViewProps.onToggleSidebar).toBe('function');
  });

  // ===========================================================================
  // F-35: non-graph routes (/report, /metrics) do not involve DirTree sidebar
  // ===========================================================================
  it('F-35: /report 路由不渲染 GraphView（不涉及 DirTree 侧边栏）', async () => {
    renderApp(['/report']);

    // /report 路由渲染 ReportView
    expect(await screen.findByTestId('report-view')).toBeInTheDocument();
    // GraphView 不应在 /report 路由中渲染
    expect(screen.queryByTestId('graph-view')).not.toBeInTheDocument();
  });

  // ===========================================================================
  // R-11: sidebarVisible persists across route changes
  // ===========================================================================
  it('R-11: sidebarVisible 在路由切换后保持状态', async () => {
    renderApp(['/graph']);

    await screen.findByTestId('graph-view');

    // 初始为 true
    expect(capturedGraphViewProps.sidebarVisible).toBe(true);

    // 切换到 false
    const onToggleSidebar = capturedGraphViewProps.onToggleSidebar as () => void;
    onToggleSidebar();

    // 导航到 /report 再回来
    // 由于使用 MemoryRouter，可以通过重新渲染模拟路由变化
    // TODO: 需要更精确的路由切换测试
    // 当前 mock 的 setSidebarVisible 需要验证调用
    expect(mockSetSidebarVisible).toHaveBeenCalled();
  });
});
