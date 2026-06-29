/**
 * Integration tests: Full scan flow (End-to-End)
 *
 * Tests the complete scan flow from clicking Scan to overlay appearance,
 * state transitions (scanning, error, success), and interaction recovery.
 *
 * Coverage targets (from test-design.md):
 *   - AC-1: Scan overlay appears covering all content
 *   - AC-3: Scanning status text is displayed during scan
 *   - AC-4: Success closes overlay, calls fetchGraph (POST /api/graph)
 *   - AC-5: Navigation tabs work after scan completes
 *   - AC-6: Error shows error overlay with dismiss button
 *   - AC-7: Dismiss closes overlay, restores interaction
 *   - AC-10: Network error shows error overlay with close button
 *   - B-5: Scan again after failure close
 *   - B-8: refresh() fails after successful scan -- overlay stays closed
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import App from '@/App';

// ---------------------------------------------------------------------------
// Stub File.prototype.text for jsdom (not available in jsdom)
// ---------------------------------------------------------------------------
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
// Mock child components
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
// Mock i18n (returns keys as-is for predictable lookups)
// ---------------------------------------------------------------------------
vi.mock('@/i18n', () => ({
  useT: () => ({ t: (key: string) => key, lang: 'en', setLang: vi.fn() }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock theme
// ---------------------------------------------------------------------------
vi.mock('@/theme', () => ({
  useTheme: () => ({
    theme: 'light',
    resolvedTheme: 'light',
    cycleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Test fixture -- ProcessedGraph sample data
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
// Stub IntersectionObserver for jsdom
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
// Render helper
// ---------------------------------------------------------------------------
function renderApp() {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
}

// ---------------------------------------------------------------------------
// Integration test suite
// ---------------------------------------------------------------------------

describe('Scan flow (Integration)', () => {
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
  // AC-1 + AC-3: Scan button triggers overlay with scanning UI
  // =========================================================================
  it('AC-1/AC-3: clicking Scan renders overlay with scanning UI (spinner, status text)', async () => {
    // Keep scan pending indefinitely to observe scanning state
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return { ok: true, json: async () => sampleGraphData } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          // Never resolve -- keep scanning state visible
          return new Promise(() => {});
        }
        return new Response(null, { status: 404 });
      });

    renderApp();
    await screen.findByTestId('graph-view');

    // Click Scan button (i18n mock returns 'action.scan')
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay appears with scanning UI
    const overlay = await screen.findByTestId('scan-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay.style.position).toBe('fixed');
    expect(overlay.style.zIndex).toBe('9999');

    // Scanning status text is displayed (i18n returns 'action.scanning')
    expect(screen.getAllByText('action.scanning').length).toBeGreaterThanOrEqual(1);

    // Loading spinner is rendered (scanning state, not error)
    const spinners = screen.getAllByTestId('scan-spinner');
    expect(spinners.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // AC-4: Successful scan closes overlay and calls refresh (POST /api/graph)
  // =========================================================================
  it('AC-4: successful scan closes overlay and calls POST /api/graph again', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return { ok: true, json: async () => sampleGraphData } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return { ok: true, json: async () => ({ output: 'output.json' }) } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();
    await screen.findByTestId('graph-view');

    const initialGraphCalls = vi
      .mocked(globalThis.fetch)
      .mock.calls.filter(([url, init]) => url === '/api/graph' && init?.method === 'POST').length;

    // Click Scan
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay appears
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();

    // Overlay closes after scan completes (min 500ms display time)
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 3000, interval: 100 },
    );

    // Verify POST /api/graph was called again (refresh after scan)
    const graphCallsAfterScan = vi
      .mocked(globalThis.fetch)
      .mock.calls.filter(([url, init]) => url === '/api/graph' && init?.method === 'POST');
    expect(graphCallsAfterScan.length).toBeGreaterThan(initialGraphCalls);
  });

  // =========================================================================
  // AC-5: After scan completes, navigation tabs are interactive
  // =========================================================================
  it('AC-5: after scan completes, navigation tabs work', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return { ok: true, json: async () => sampleGraphData } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return { ok: true, json: async () => ({ output: 'output.json' }) } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();
    await screen.findByTestId('graph-view');

    // Click Scan
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Wait for overlay to close
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 3000, interval: 100 },
    );

    // Navigate to report
    fireEvent.click(screen.getByTestId('nav-report'));
    await screen.findByTestId('report-view');
    expect(screen.getByTestId('nav-report')).toHaveAttribute('aria-current', 'page');

    // Navigate to metrics
    fireEvent.click(screen.getByTestId('nav-metrics'));
    await screen.findByTestId('metrics-view');
    expect(screen.getByTestId('nav-metrics')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // AC-6: Error overlay on HTTP failure (500)
  // =========================================================================
  it('AC-6: scan returns 500, overlay shows error message and close button', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return { ok: true, json: async () => sampleGraphData } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Scan failed' }),
          } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();
    await screen.findByTestId('graph-view');

    // Click Scan
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Error overlay appears with close button (i18n returns 'action.scanOverlayClose')
    const overlay = await screen.findByTestId('scan-overlay');
    expect(overlay).toBeInTheDocument();

    const closeBtn = await screen.findByRole('button', { name: 'action.scanOverlayClose' });
    expect(closeBtn).toBeInTheDocument();

    // Error message from response body is shown
    expect(screen.getByText('Scan failed')).toBeInTheDocument();

    // Loading spinner is NOT rendered in error state
    expect(screen.queryByTestId('scan-spinner')).not.toBeInTheDocument();
  });

  // =========================================================================
  // AC-7: Close button dismisses overlay and restores interaction
  // =========================================================================
  it('AC-7: clicking close on error overlay dismisses it and restores interaction', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return { ok: true, json: async () => sampleGraphData } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Scan failed' }),
          } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();
    await screen.findByTestId('graph-view');

    // Click Scan
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Wait for close button to appear
    const closeBtn = await screen.findByRole('button', { name: 'action.scanOverlayClose' });
    expect(closeBtn).toBeInTheDocument();

    // Click close
    fireEvent.click(closeBtn);

    // Overlay disappears
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 1000, interval: 50 },
    );

    // Navigation tabs are interactive again
    fireEvent.click(screen.getByTestId('nav-report'));
    await screen.findByTestId('report-view');
    expect(screen.getByTestId('nav-report')).toHaveAttribute('aria-current', 'page');
  });

  // =========================================================================
  // AC-10: Network error (TypeError) shows error overlay
  // =========================================================================
  it('AC-10: network error during scan shows error overlay with close button', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return { ok: true, json: async () => sampleGraphData } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          throw new TypeError('Failed to fetch');
        }
        return new Response(null, { status: 404 });
      });

    renderApp();
    await screen.findByTestId('graph-view');

    // Click Scan
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Error overlay appears with network error message
    const overlay = await screen.findByTestId('scan-overlay');
    expect(overlay).toBeInTheDocument();

    // Network error message displayed
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();

    // Close button present
    expect(screen.getByRole('button', { name: 'action.scanOverlayClose' })).toBeInTheDocument();
  });

  // =========================================================================
  // B-5: Scan again after dismissing error overlay
  // =========================================================================
  it('B-5: after dismissing error overlay, can trigger scan again', async () => {
    let scanAttempts = 0;

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return { ok: true, json: async () => sampleGraphData } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          scanAttempts++;
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: `Attempt ${scanAttempts} failed` }),
          } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();
    await screen.findByTestId('graph-view');

    // First scan -- fails
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Dismiss error
    const closeBtn = await screen.findByRole('button', { name: 'action.scanOverlayClose' });
    fireEvent.click(closeBtn);

    // Wait for overlay to disappear
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 1000, interval: 50 },
    );

    // Second scan -- should work again
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));
    await screen.findByTestId('scan-overlay');
    await screen.findByRole('button', { name: 'action.scanOverlayClose' });

    // Two scan attempts were made
    expect(scanAttempts).toBe(2);
  });

  // =========================================================================
  // B-8: Scan succeeds but refresh() fails -- overlay still closes
  // =========================================================================
  it('B-8: scan succeeds but refresh fetch fails, overlay stays closed', async () => {
    let graphFetchCount = 0;

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          graphFetchCount++;
          if (graphFetchCount === 1) {
            return { ok: true, json: async () => sampleGraphData } as unknown as Response;
          }
          // Refresh after scan fails
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Graph refresh failed' }),
          } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return { ok: true, json: async () => ({ output: 'output.json' }) } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();
    await screen.findByTestId('graph-view');

    // Click Scan -- scan succeeds, but refresh fails
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay closes (scan succeeded)
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 3000, interval: 100 },
    );

    // Overlay stays closed even if refresh fails
    expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
  });
});
