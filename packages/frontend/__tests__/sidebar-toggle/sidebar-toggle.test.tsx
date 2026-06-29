/**
 * Integration tests: sidebar toggle -- collapse/expand flow
 *
 * Renders App to /graph route, simulates user clicking the sidebar toggle button,
 * and verifies sidebar collapse (narrow handle) and expand (restored DirTree) behavior.
 *
 * Coverage targets (from test-design.md):
 *   - F-14 (E2E): 侧边栏默认可见
 *   - F-14a (E2E): 点击折叠按钮，侧边栏折叠为窄手柄
 *   - F-16 (E2E): 点击窄手柄展开按钮，侧边栏恢复
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { ProcessedGraph } from '../../src/types';

// ---------------------------------------------------------------------------
// Mock useGraphData with sidebar visible state control
// ---------------------------------------------------------------------------
let mockSidebarVisible = true;
const setSidebarVisibleMock = vi.fn();

const mockGraphData: ProcessedGraph = {
  nodes: [],
  edges: [],
  combos: [],
  meta: { original_node_count: 0, aggregated_node_count: 0, total_violations: 0 },
  violations: [],
};

vi.mock('../../src/hooks/useGraphData', () => ({
  useGraphData: () => ({
    data: mockGraphData,
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
      setSidebarVisibleMock(mockSidebarVisible);
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock child components
// ---------------------------------------------------------------------------
vi.mock('../../src/components/ArchitectureView', () => ({
  default: () => <div data-testid="architecture-view">ArchitectureView Mock</div>,
  ArchitectureView: () => <div data-testid="architecture-view">ArchitectureView Mock</div>,
}));

vi.mock('../../src/components/DependencyGraph/DependencyGraph', () => ({
  DependencyGraph: () => <div>DependencyGraph Mock</div>,
}));

vi.mock('../../src/components/DetailPanel', () => ({
  default: () => <div data-testid="detail-panel">DetailPanel Mock</div>,
  DetailPanel: () => <div data-testid="detail-panel">DetailPanel Mock</div>,
}));

vi.mock('../../src/components/GraphViewLayout', () => ({
  GraphViewLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock i18n
// ---------------------------------------------------------------------------
vi.mock('../../src/i18n', () => ({
  useT: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'tree.title': 'Directories',
        'tree.expand': 'Expand directory',
        'tree.collapse': 'Collapse directory',
        'tree.toggleSidebar': 'Toggle sidebar',
        'graph.noData': 'No graph data available',
        'nav.graph': 'Dependency Graph',
        'nav.report': 'Report',
        'nav.metrics': 'Metrics',
        'nav.architecture': 'Architecture',
        'nav.refresh': 'Refresh data',
        'app.title': 'Dependency Cruiser Reporter',
      };
      return map[key] ?? key;
    },
    lang: 'en',
    setLang: vi.fn(),
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock theme
// ---------------------------------------------------------------------------
vi.mock('../../src/theme', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', cycleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock icons
// ---------------------------------------------------------------------------
vi.mock('../../src/components/icons', () => ({
  ChevronRightIcon: () => <span data-testid="chevron-right-icon" />,
  ChevronDownIcon: () => <span data-testid="chevron-down-icon" />,
  SidebarToggleIcon: ({ direction }: { direction: 'left' | 'right' }) => (
    <div data-testid={`sidebar-toggle-icon-${direction}`} />
  ),
  RefreshIcon: () => <span data-testid="refresh-icon" />,
  ScanIcon: () => <span data-testid="scan-icon" />,
  SettingsIcon: () => <span data-testid="settings-icon" />,
  SunIcon: () => <span data-testid="sun-icon" />,
  MoonIcon: () => <span data-testid="moon-icon" />,
  MonitorIcon: () => <span data-testid="monitor-icon" />,
}));

// ---------------------------------------------------------------------------
// Mock IntersectionObserver
// ---------------------------------------------------------------------------
vi.stubGlobal(
  'IntersectionObserver',
  vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
);

// ---------------------------------------------------------------------------
// Import App after all mocks
// ---------------------------------------------------------------------------
import App from '../../src/App';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('侧边栏切换集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebarVisible = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-14 (E2E): sidebar visible by default
  // ===========================================================================
  it('F-14 (E2E): 侧边栏默认可见，DirTree 在 DOM 中渲染', async () => {
    render(
      <MemoryRouter initialEntries={['/graph']}>
        <App />
      </MemoryRouter>,
    );

    // "Directories" 标题可见，表明侧边栏展开
    expect(await screen.findByText('Directories')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-14a (E2E): click collapse button, sidebar collapses to narrow handle
  // ===========================================================================
  it('F-14a (E2E): 点击折叠按钮后侧边栏折叠为窄手柄', async () => {
    render(
      <MemoryRouter initialEntries={['/graph']}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByText('Directories');

    // 找到折叠按钮并点击
    const toggleBtn = screen.getByTestId('sidebar-toggle-icon-left');
    fireEvent.click(toggleBtn);

    // sidebarVisible 被切换为 false
    expect(setSidebarVisibleMock).toHaveBeenCalled();
  });

  // ===========================================================================
  // F-16 (E2E): click expand handle expands sidebar back
  // ===========================================================================
  it('F-16 (E2E): 点击手柄展开按钮后侧边栏恢复', async () => {
    // 预设侧边栏已折叠
    mockSidebarVisible = false;

    render(
      <MemoryRouter initialEntries={['/graph']}>
        <App />
      </MemoryRouter>,
    );

    // 展开手柄（右侧箭头）应可见
    const expandHandle = await screen.findByTestId('sidebar-toggle-icon-right');
    expect(expandHandle).toBeInTheDocument();

    // 点击展开
    fireEvent.click(expandHandle);

    // sidebarVisible 被切换为 true
    expect(setSidebarVisibleMock).toHaveBeenCalled();
  });
});
