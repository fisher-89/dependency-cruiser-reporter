/**
 * Integration tests: AppRouting
 *
 * Tests the App component wrapped in a real BrowserRouter for full rendering
 * chains with data/loading/error states interacting with route switching.
 *
 * Coverage targets (from test-design.md):
 *   - AC-1 through AC-5 component-level verification
 *   - B-9:  loading state (fetchGraph in progress) when user switches route
 *   - B-10: error state (fetchGraph failed) when user navigates to /metrics
 *   - Data flow: App.tsx data/loading/error states remain unaffected by routing
 *   - File upload then route switching
 */

import App from '@/App';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

// Stub File.prototype.text for jsdom (not available in jsdom)
if (!File.prototype.text) {
  File.prototype.text = function (this: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

// ---------------------------------------------------------------------------
// Mock ArchitectureView (lazy-loaded) — use synchronous component
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
// Mock helpers
// ---------------------------------------------------------------------------

function stubIntersectionObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  );
}

function mockFetchSuccess() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => sampleGraphData,
  } as Response);
}

function mockFetchError() {
  return vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
}

function mockFetchPending() {
  // Return a promise that never resolves (hand for loading-state tests)
  return vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderApp() {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

function navigateTo(testId: string) {
  const el = screen.getByTestId(testId);
  fireEvent.click(el);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AppRouting (Integration)', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    stubIntersectionObserver();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  // =========================================================================
  // Data flow: upload area on initial load when data is null
  // =========================================================================
  it('renders upload area on initial load when data is null (no data fetched yet)', () => {
    // Do NOT mock fetch — or mock it with a pending promise so it never
    // resolves.  This keeps data=null so the upload area stays visible.
    fetchMock = mockFetchPending();

    renderApp();

    // After the root "/" redirect -> "/graph", the graph route has
    // needsData:true, so it renders the upload area when data is null.
    expect(screen.getByTestId('upload-area')).toBeInTheDocument();
  });

  // =========================================================================
  // Data flow: after successful fetch, graph view renders
  // =========================================================================
  it('after fetch resolves with data, graph view becomes visible at /graph', async () => {
    fetchMock = mockFetchSuccess();

    renderApp();

    // App auto-fetches on mount via useEffect.  Wait for data to arrive and
    // the graph view to render.
    const graphView = await screen.findByTestId('graph-view');
    expect(graphView).toBeInTheDocument();
  });

  // =========================================================================
  // Navigate to /report after data loaded
  // =========================================================================
  it('can navigate to /report after data is loaded and see violation list', async () => {
    fetchMock = mockFetchSuccess();

    renderApp();

    // Wait for initial data load (starts at / -> redirects to /graph)
    await screen.findByTestId('graph-view');

    // Click nav-report to navigate
    navigateTo('nav-report');

    const reportView = await screen.findByTestId('report-view');
    expect(reportView).toBeInTheDocument();
    expect(screen.getByTestId('violation-list')).toBeInTheDocument();
  });

  // =========================================================================
  // Navigate to /metrics after data loaded
  // =========================================================================
  it('can navigate to /metrics after data is loaded and see metrics cards', async () => {
    fetchMock = mockFetchSuccess();

    renderApp();

    await screen.findByTestId('graph-view');

    navigateTo('nav-metrics');

    const metricsView = await screen.findByTestId('metrics-view');
    expect(metricsView).toBeInTheDocument();
    expect(screen.getByTestId('edge-type-local')).toBeInTheDocument();
  });

  // =========================================================================
  // Navigate to /architecture after data loaded
  // =========================================================================
  it('can navigate to /architecture after data is loaded and see architecture area', async () => {
    fetchMock = mockFetchSuccess();

    renderApp();

    await screen.findByTestId('graph-view');

    navigateTo('nav-architecture');

    const architectureView = await screen.findByTestId('architecture-view');
    expect(architectureView).toBeInTheDocument();
  });

  // =========================================================================
  // B-9: Loading state route switching
  // =========================================================================
  it('B-9: loading state persists when user switches route during fetchGraph', async () => {
    // Use a deferred promise so fetch never resolves during the test
    fetchMock = mockFetchPending();

    renderApp();

    // The app starts in loading state (fetchGraph is called in useEffect)
    // Navigate to /report while loading is still in progress
    navigateTo('nav-report');

    // The upload area (shown when data=null) should still contain the
    // loading indicator because loading=true.
    expect(screen.getByTestId('upload-area')).toBeInTheDocument();
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // URL should have updated to /report
    expect(screen.getByTestId('nav-report')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // B-10: Error state route switching
  // =========================================================================
  it('B-10: error state persists when user navigates to /metrics after fetch failure', async () => {
    fetchMock = mockFetchError();

    renderApp();

    // Wait for the error state
    const errorMessage = await screen.findByTestId('error-message');
    expect(errorMessage).toBeInTheDocument();

    // Navigate to /metrics while error state is active
    navigateTo('nav-metrics');

    // The error state should still be visible (it is managed by App, not per-route)
    expect(screen.getByTestId('error-message')).toBeInTheDocument();

    // URL should have updated
    expect(screen.getByTestId('nav-metrics')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // File upload then route switching
  // =========================================================================
  it('after file upload, can switch to /metrics and see metrics view', async () => {
    // Do not mock fetch; instead we'll upload a file directly
    fetchMock = mockFetchPending();

    renderApp();

    // Root "/" redirects to "/graph", showing upload area
    expect(screen.getByTestId('upload-area')).toBeInTheDocument();

    // Simulate file upload
    const fileContent = JSON.stringify(sampleGraphData);
    const file = new File([fileContent], 'test-graph.json', { type: 'application/json' });
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // After upload, graph view should be visible
    await screen.findByTestId('graph-view');

    // Navigate to /metrics
    navigateTo('nav-metrics');
    await screen.findByTestId('metrics-view');
    expect(screen.getByTestId('nav-metrics')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // File upload then /report
  // =========================================================================
  it('after navigating to /report after upload, ReportView shows violations', async () => {
    fetchMock = mockFetchPending();

    renderApp();

    // Upload file
    const fileContent = JSON.stringify(sampleGraphData);
    const file = new File([fileContent], 'test-graph.json', { type: 'application/json' });
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Wait for graph view after upload
    await screen.findByTestId('graph-view');

    // Navigate to /report
    navigateTo('nav-report');
    await screen.findByTestId('report-view');

    // The sample data has 1 violation
    expect(screen.getByTestId('violation-list')).toBeInTheDocument();
    expect(screen.getByTestId('violation-0')).toBeInTheDocument();
  });

  // =========================================================================
  // Reset button
  // =========================================================================
  it('reset button sets data to null, URL remains on same path, upload area appears', async () => {
    fetchMock = mockFetchSuccess();

    renderApp();

    // Wait for data to load
    await screen.findByTestId('graph-view');

    // Click the reset button
    navigateTo('reset-btn');

    // Upload area should appear
    expect(screen.getByTestId('upload-area')).toBeInTheDocument();

    // Graph view should be gone
    expect(screen.queryByTestId('graph-view')).not.toBeInTheDocument();

    // URL should still be /graph (reset does not change the route)
    expect(screen.getByTestId('nav-graph')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // Language and theme toggles
  // =========================================================================
  it('language and theme toggles remain functional after route changes', async () => {
    fetchMock = mockFetchSuccess();

    renderApp();

    // Wait for data
    await screen.findByTestId('graph-view');

    // Navigate to /metrics
    navigateTo('nav-metrics');
    await screen.findByTestId('metrics-view');

    // Language buttons should be present and clickable
    expect(screen.getByTestId('lang-en')).toBeInTheDocument();
    expect(screen.getByTestId('lang-zh')).toBeInTheDocument();

    // Click Chinese language toggle
    fireEvent.click(screen.getByTestId('lang-zh'));
    expect(screen.getByTestId('lang-zh')).toBeInTheDocument();

    // Click English language toggle
    fireEvent.click(screen.getByTestId('lang-en'));
    expect(screen.getByTestId('lang-en')).toBeInTheDocument();

    // Theme toggle should be present and clickable
    const themeToggle = screen.getByTestId('theme-toggle');
    expect(themeToggle).toBeInTheDocument();

    fireEvent.click(themeToggle);
    // Still present after click
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();

    // Navigate back to /graph — layout/controls remain intact
    navigateTo('nav-graph');
    await screen.findByTestId('graph-view');

    expect(screen.getByTestId('lang-en')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });
});
