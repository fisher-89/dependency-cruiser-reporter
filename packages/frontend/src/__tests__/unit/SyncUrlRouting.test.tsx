/**
 * Unit tests: SyncUrlRouting
 *
 * Tests that each valid route path renders the corresponding view component
 * and that the NavLink active style (via aria-current) is correctly applied
 * for the current route.
 *
 * Coverage targets (from test-design.md):
 *   - AC-1: /report renders ReportView, nav-report element exists
 *   - AC-2: /metrics renders MetricsView, nav-metrics highlighted
 *   - AC-3: /architecture renders ArchitectureView (Suspense fallback appears)
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import App from '@/App';

// ---------------------------------------------------------------------------
// Mock ArchitectureView (lazy-loaded) to be synchronous in unit tests
// ---------------------------------------------------------------------------
vi.mock('@/components/ArchitectureView', () => ({
  default: () => <div data-testid="architecture-view">ArchitectureView Mock</div>,
  ArchitectureView: () => <div data-testid="architecture-view">ArchitectureView Mock</div>,
}));

vi.mock('@/components/GraphView', () => ({
  GraphView: () => <div data-testid="graph-view">GraphView Mock</div>,
}));

vi.mock('@/components/DependencyGraph/DependencyGraph', () => ({
  DependencyGraph: () => <div>DependencyGraph Mock</div>,
}));

vi.mock('@/components/DetailPanel', () => ({
  default: () => <div data-testid="detail-panel">DetailPanel Mock</div>,
  DetailPanel: () => <div data-testid="detail-panel">DetailPanel Mock</div>,
}));

// ---------------------------------------------------------------------------
// Mock i18n hook
// ---------------------------------------------------------------------------
vi.mock('@/i18n', () => ({
  useT: () => ({ t: (key: string) => key, lang: 'en', setLang: vi.fn() }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock theme hook
// ---------------------------------------------------------------------------
vi.mock('@/theme', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', cycleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Test fixture — ProcessedGraph sample data
// ---------------------------------------------------------------------------
const sampleGraphData = {
  nodes: [
    {
      id: 'src/index.ts',
      label: 'index.ts',
      node_type: 'file' as const,
      path: 'src/index.ts',
      violation_count: 0,
    },
    {
      id: 'src/utils.ts',
      label: 'utils.ts',
      node_type: 'file' as const,
      path: 'src/utils.ts',
      violation_count: 1,
    },
  ],
  edges: [
    { source: 'src/index.ts', target: 'src/utils.ts', edge_type: 'local' as const, weight: 1 },
  ],
  meta: {
    original_node_count: 2,
    aggregated_node_count: 2,
    total_violations: 1,
  },
  violations: [
    {
      from: 'src/utils.ts',
      to: 'lodash',
      rule: 'no-unlisted-dep',
      severity: 'warn' as const,
      message: 'Unlisted dependency detected',
    },
  ],
};

// ---------------------------------------------------------------------------
// Mock global fetch to return sample data
// ---------------------------------------------------------------------------
function mockFetchSuccess() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => sampleGraphData,
  } as unknown as Response);
}

// ---------------------------------------------------------------------------
// Helper: render App at a specific route inside MemoryRouter
// ---------------------------------------------------------------------------
function renderAtRoute(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Mock IntersectionObserver for jsdom
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
// Unit tests
// ---------------------------------------------------------------------------

describe('SyncUrlRouting', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = mockFetchSuccess();
    stubIntersectionObserver();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    vi.unstubAllGlobals();
  });

  // =========================================================================
  // AC-1: visiting /report renders ReportView
  // =========================================================================
  it('AC-1: visiting /report renders ReportView and nav-report is present', async () => {
    renderAtRoute('/report');

    // App auto-fetches data on mount via useEffect.  Wait for data to load
    // and the report view to render.
    const reportView = await screen.findByTestId('report-view');
    expect(reportView).toBeInTheDocument();

    const navReport = screen.getByTestId('nav-report');
    expect(navReport).toBeInTheDocument();
    expect(navReport).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // AC-2: visiting /metrics renders MetricsView with nav-metrics highlighted
  // =========================================================================
  it('AC-2: visiting /metrics renders MetricsView and nav-metrics is highlighted (aria-current)', async () => {
    renderAtRoute('/metrics');

    const metricsView = await screen.findByTestId('metrics-view');
    expect(metricsView).toBeInTheDocument();

    // Only the matching NavLink gets aria-current="page"
    expect(screen.getByTestId('nav-metrics')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('nav-graph')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('nav-report')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('nav-architecture')).not.toHaveAttribute('aria-current');
  });

  // =========================================================================
  // AC-3: visiting /architecture renders ArchitectureView
  // =========================================================================
  it('AC-3: visiting /architecture renders ArchitectureView (or Suspense fallback)', async () => {
    renderAtRoute('/architecture');

    // ArchitectureView is mocked to be synchronous, so it renders immediately
    // without triggering the Suspense fallback.
    const architectureView = await screen.findByTestId('architecture-view');
    expect(architectureView).toBeInTheDocument();

    // Architecture route does not need data; nav-architecture should be active
    expect(screen.getByTestId('nav-architecture')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // AC-3 variation: ArchitectureView mock renders mocked content
  // =========================================================================
  it('AC-3 (mock): ArchitectureView mock renders instead of lazy fallback when vi.mock is active', async () => {
    renderAtRoute('/architecture');

    const view = await screen.findByTestId('architecture-view');
    expect(view).toHaveTextContent('ArchitectureView Mock');
  });

  // =========================================================================
  // /graph: graph view renders when data is present after auto-fetch
  // =========================================================================
  it('/graph: visiting /graph renders graph-view data-testid when data is present', async () => {
    renderAtRoute('/graph');

    const graphView = await screen.findByTestId('graph-view');
    expect(graphView).toBeInTheDocument();

    // Verify graph-specific content renders
    expect(screen.getByTestId('nav-graph')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // NavLink: only the matching NavLink receives aria-current="page"
  // =========================================================================
  it('NavLink: only the matching NavLink receives aria-current="page"', async () => {
    renderAtRoute('/report');

    // Wait for data to load and the view to render
    await screen.findByTestId('report-view');

    // nav-report should be active
    expect(screen.getByTestId('nav-report')).toHaveAttribute('aria-current', 'page');

    // No other nav link should have aria-current
    const otherNavs = ['nav-graph', 'nav-metrics', 'nav-architecture'] as const;
    for (const testId of otherNavs) {
      expect(screen.getByTestId(testId)).not.toHaveAttribute('aria-current');
    }
  });
});
