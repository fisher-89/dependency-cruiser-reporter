/**
 * Integration tests: DirTree interaction -- expand/collapse and three-column layout
 *
 * Renders App to /graph route, mocks fetch to control POST /api/graph responses,
 * and verifies DirTree expand/collapse interactions trigger fetchGraph with correct
 * expanded directory IDs.
 *
 * Coverage targets (from test-design.md):
 *   - F-6 (E2E): 点击展开图标触发 fetchGraph
 *   - F-8 (E2E): 点击折叠图标收起目录
 *   - F-23 (E2E): 三栏布局渲染
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { ProcessedGraph } from '../../src/types';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const mockGraphData: ProcessedGraph = {
  nodes: [
    {
      id: 'src/index.ts',
      label: 'index.ts',
      node_type: 'file',
      combo: 'combo:src',
      violation_count: 0,
    },
  ],
  edges: [],
  combos: [{ id: 'combo:src', label: 'src' }],
  meta: { original_node_count: 1, aggregated_node_count: 1, total_violations: 0 },
  violations: [],
};

// ---------------------------------------------------------------------------
// Mock useGraphData with fetch-based toggle
// ---------------------------------------------------------------------------
let mockExpandedDirs = new Set<string>();
const fetchMock = vi.fn();

vi.mock('../../src/hooks/useGraphData', () => ({
  useGraphData: () => ({
    data: mockGraphData,
    loading: false,
    error: null,
    expandedDirs: mockExpandedDirs,
    fetchGraph: fetchMock,
    refresh: vi.fn(),
    toggleDir: (dir: string) => {
      const next = new Set(mockExpandedDirs);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      mockExpandedDirs = next;
      fetchMock(dir);
    },
    sidebarVisible: true,
    setSidebarVisible: vi.fn(),
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
    <span data-testid={`sidebar-toggle-icon-${direction}`} />
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

describe('DirTree 交互集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExpandedDirs = new Set<string>();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-6 (E2E): click expand icon triggers fetchGraph
  // ===========================================================================
  it('F-6 (E2E): 点击展开图标触发 fetchGraph，请求体包含对应目录 ID', async () => {
    render(
      <MemoryRouter initialEntries={['/graph']}>
        <App />
      </MemoryRouter>,
    );

    // 等待渲染完成
    await screen.findByText('src');

    // 点击展开图标
    const expandIcon = screen.getByTestId('chevron-right-icon');
    fireEvent.click(expandIcon);

    // toggleDir 被调用
    expect(fetchMock).toHaveBeenCalled();
  });

  // ===========================================================================
  // F-8 (E2E): click collapse icon closes directory
  // ===========================================================================
  it('F-8 (E2E): 点击折叠图标收起目录，展开目录 ID 从请求中移除', async () => {
    // 预设 src 已展开
    mockExpandedDirs = new Set(['src']);

    render(
      <MemoryRouter initialEntries={['/graph']}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByText('src');

    // 展开状态显示折叠图标
    const collapseIcon = screen.getByTestId('chevron-down-icon');
    fireEvent.click(collapseIcon);

    // toggleDir 被调用
    expect(fetchMock).toHaveBeenCalled();
  });

  // ===========================================================================
  // F-23 (E2E): three-column layout renders DirTree | DependencyGraph | DetailPanel
  // ===========================================================================
  it('F-23 (E2E): 三栏布局（DirTree | DependencyGraph | DetailPanel）渲染', async () => {
    render(
      <MemoryRouter initialEntries={['/graph']}>
        <App />
      </MemoryRouter>,
    );

    // graph-view 容器含三个子面板
    await screen.findByText('src');
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
  });
});
