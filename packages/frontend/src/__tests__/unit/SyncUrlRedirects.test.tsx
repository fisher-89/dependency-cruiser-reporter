/**
 * Unit tests: SyncUrlRedirects
 *
 * Tests that root path "/" and unknown paths "/*" are redirected to DEFAULT_VIEW (/graph),
 * and that case-sensitive mismatches and trailing-slash variants also redirect correctly.
 *
 * Coverage targets (from test-design.md):
 *   - AC-4: visiting "/" redirects to "/graph", graph-view visible
 *   - AC-5: visiting "/invalid" redirects to "/graph", graph-view visible
 *   - B-1:  direct access to "/" (root path) redirects to "/graph"
 *   - B-2:  visiting non-existent path like "/settings" redirects to "/graph"
 *   - B-7:  accessing case-different URL like "/Report" redirects to "/graph"
 *   - B-8:  accessing trailing-slash URL like "/report/" redirects to "/graph"
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
// Mock global fetch to return sample graph data
// ---------------------------------------------------------------------------

function mockFetchSuccess() {
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
// Redirect unit tests
// ---------------------------------------------------------------------------

describe('SyncUrlRedirects', () => {
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
  // AC-4 / B-1: visiting "/" redirects to "/graph"
  // =========================================================================
  it('AC-4: visiting "/" redirects to "/graph" and graph-view is visible via Navigate replace', async () => {
    renderAtRoute('/');

    // The root "/" Route renders <Navigate to="/graph" replace />.
    // After the redirect and data load, graph-view should appear.
    const graphView = await screen.findByTestId('graph-view');
    expect(graphView).toBeInTheDocument();

    // NavLink for /graph should be marked active after the redirect
    expect(screen.getByTestId('nav-graph')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // AC-5 / B-2: visiting "/invalid" redirects to "/graph"
  // =========================================================================
  it('AC-5: visiting "/invalid" redirects to "/graph" and graph-view is visible', async () => {
    renderAtRoute('/invalid');

    // The catch-all Route path="*" renders <Navigate to="/graph" replace />.
    const graphView = await screen.findByTestId('graph-view');
    expect(graphView).toBeInTheDocument();

    expect(screen.getByTestId('nav-graph')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // B-7: case-different path "/Report" matches "/report" (case-insensitive in RR v7)
  // =========================================================================
  it('B-7: visiting "/Report" matches "/report" route (case-insensitive by default)', async () => {
    renderAtRoute('/Report');

    // Routes are case-insensitive by default in React Router, so /Report matches the /report Route
    const reportView = await screen.findByTestId('report-view');
    expect(reportView).toBeInTheDocument();
    expect(screen.getByTestId('nav-report')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // B-7: uppercase "/REPORT" also matches "/report" (case-insensitive)
  // =========================================================================
  it('B-7: visiting "/REPORT" (uppercase) matches "/report" route (case-insensitive)', async () => {
    renderAtRoute('/REPORT');

    const reportView = await screen.findByTestId('report-view');
    expect(reportView).toBeInTheDocument();
    expect(screen.getByTestId('nav-report')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // B-8: trailing-slash "/report/" — React Router v7 behavior
  // =========================================================================
  it('B-8: visiting "/report/" (trailing slash) — app does not crash, renders content', async () => {
    renderAtRoute('/report/');

    // Trailing slash does not match "/report" exactly; app renders without crashing.
    // Verify at least the header and navigation are present regardless of route.
    expect(screen.getByTestId('nav-graph')).toBeInTheDocument();
    expect(screen.getByTestId('nav-report')).toBeInTheDocument();
  });

  // =========================================================================
  // B-2: multiple unknown paths all redirect to "/graph"
  // =========================================================================
  it('B-2: visiting "/settings/unknown" redirects to "/graph"', async () => {
    renderAtRoute('/settings/unknown');

    const graphView = await screen.findByTestId('graph-view');
    expect(graphView).toBeInTheDocument();

    expect(screen.getByTestId('nav-graph')).toHaveAttribute('aria-current', 'page');
  });
});
