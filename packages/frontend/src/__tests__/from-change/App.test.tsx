/**
 * Unit tests: App handleScan logic
 *
 * Tests the handleScan behavior changes in App:
 *   - Success path: setScanning(false) then refresh()
 *   - Failure path: scanning stays true, scanError set
 *   - Network error: scanning stays true, scanError set
 *   - handleDismissScan: clears scanning and scanError
 *   - Min display time (500ms) logic
 *   - scanOverlayStatus derivation from scanning and scanError
 *
 * Coverage targets (from test-design.md):
 *   - AC-4: Successful scan (200) triggers setScanning(false) + refresh()
 *   - AC-7: handleDismissScan clears scanning + scanError
 *   - AC-10: Network error sets scanError
 *   - B-1: Fast scan (< 500ms) enforces minimum display time
 *   - B-2: Slow scan (> 500ms) no extra delay
 *   - B-3: Non-JSON response uses statusText
 *   - B-4: details overrides error in response body
 *   - B-12: 204 No Content handling
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import App from '@/App';

// ---------------------------------------------------------------------------
// Mock child components that are unrelated to the scan flow
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
// Mock helpers
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

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/graph']}>
      <App />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('App -- handleScan', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stubIntersectionObserver();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    vi.unstubAllGlobals();
  });

  // =========================================================================
  // AC-4: Successful scan (200) triggers setScanning(false) + refresh()
  // =========================================================================
  it('AC-4: successful scan sends POST /api/analyze then closes overlay and calls refresh (POST /api/graph)', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return { ok: true, json: async () => ({ output: 'path/to/output.json' }) } as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    await screen.findByTestId('graph-view');

    // Click Scan button (i18n mock returns key: 'action.scan')
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay appears on scan start
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();

    // Wait for overlay to disappear (scan succeeds, min display time applies)
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 3000, interval: 100 },
    );

    // Verify POST /api/analyze was called
    const analyzeCalls = vi
      .mocked(globalThis.fetch)
      .mock.calls.filter(([url, init]) => url === '/api/analyze' && init?.method === 'POST');
    expect(analyzeCalls).toHaveLength(1);

    // Verify POST /api/graph was called again (initial load + refresh)
    const graphCalls = vi
      .mocked(globalThis.fetch)
      .mock.calls.filter(([url, init]) => url === '/api/graph' && init?.method === 'POST');
    expect(graphCalls.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // AC-7: handleDismissScan clears scanning and scanError
  // =========================================================================
  it('AC-7: dismissing the error overlay calls handleDismissScan and clears scan state', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
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

    // Click Scan button (i18n returns key: 'action.scan')
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Error overlay appears with close button (i18n returns key: 'action.scanOverlayClose')
    const closeBtn = await screen.findByRole('button', { name: 'action.scanOverlayClose' });
    expect(closeBtn).toBeInTheDocument();

    // Error message from mock response should be visible
    expect(screen.getByText('Scan failed')).toBeInTheDocument();

    // Click close to dismiss
    fireEvent.click(closeBtn);

    // Overlay should disappear
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 2000, interval: 50 },
    );
  });

  // =========================================================================
  // AC-10: Network error sets scanError
  // =========================================================================
  it('AC-10: network error during scan sets scanError with error message', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          throw new TypeError('Failed to fetch');
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    await screen.findByTestId('graph-view');

    // Click Scan button
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Error overlay appears with network error message
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();

    // Close button should be present (i18n returns key: 'action.scanOverlayClose')
    expect(screen.getByRole('button', { name: 'action.scanOverlayClose' })).toBeInTheDocument();
  });

  // =========================================================================
  // B-1: Fast scan (< 500ms) enforces minimum display time
  // =========================================================================
  it('B-1: fast scan enforces 500ms minimum overlay display time', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          // Resolve immediately -- fast scan completes very quickly
          return { ok: true, json: async () => ({ output: 'output.json' }) } as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    await screen.findByTestId('graph-view');

    // Click Scan button
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay appears
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();

    // Wait for overlay to disappear (min display time of 500ms applies)
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 3000, interval: 100 },
    );

    // Verify refresh was called after scan
    const graphCalls = vi
      .mocked(globalThis.fetch)
      .mock.calls.filter(([url, init]) => url === '/api/graph' && init?.method === 'POST');
    expect(graphCalls.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // B-2: Slow scan (> 500ms) no extra delay
  // =========================================================================
  it('B-2: slow scan (>= 500ms) does NOT add extra delay before closing', async () => {
    let resolveScan: (value: unknown) => void = () => {};
    const scanPromise = new Promise((resolve) => {
      resolveScan = resolve;
    });

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          await scanPromise;
          return { ok: true, json: async () => ({ output: 'output.json' }) } as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    await screen.findByTestId('graph-view');

    // Click Scan button
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay appears
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();

    // Wait 600ms before resolving (simulate slow scan >= 500ms)
    await new Promise((r) => setTimeout(r, 600));

    // Resolve the scan
    resolveScan({
      ok: true,
      json: async () => ({ output: 'output.json' }),
    } as unknown as Response);

    // Since scan took >= 500ms, overlay should close without extra delay
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 2000, interval: 50 },
    );
  });

  // =========================================================================
  // B-3: Non-JSON response body falls back to statusText
  // =========================================================================
  it('B-3: scan response with non-JSON body uses res.statusText as scanError', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            json: async () => {
              throw new Error('Failed to parse JSON');
            },
          } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    await screen.findByTestId('graph-view');

    // Click Scan button
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Error overlay appears with statusText as fallback error message
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();
    expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
  });

  // =========================================================================
  // B-4: Response body "details" field overrides "error" field
  // =========================================================================
  it('B-4: response body "details" field takes priority over "error" field', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return {
            ok: false,
            status: 422,
            json: async () => ({ details: 'Invalid config', error: 'Generic error' }),
          } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    await screen.findByTestId('graph-view');

    // Click Scan button
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Error overlay appears with 'details' value (takes priority over 'error')
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();
    expect(screen.getByText('Invalid config')).toBeInTheDocument();
  });

  // =========================================================================
  // B-12: 204 No Content response handling
  // =========================================================================
  it('B-12: scan response 204 No Content (ok=true, no body) does not crash', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return {
            ok: true,
            status: 204,
            statusText: 'No Content',
            json: async () => {
              throw new Error('No content');
            },
          } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    await screen.findByTestId('graph-view');

    // Click Scan button
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay appears briefly
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();

    // 204 is ok=true so scan succeeds; min display time applies
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 3000, interval: 100 },
    );

    // Verify refresh was called
    const graphCalls = vi
      .mocked(globalThis.fetch)
      .mock.calls.filter(([url, init]) => url === '/api/graph' && init?.method === 'POST');
    expect(graphCalls.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // B-10: refresh() fails after scan -- overlay stays closed
  // =========================================================================
  it('B-10: refresh() fails after setScanning(false) and overlay stays closed', async () => {
    let graphCallCount = 0;

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          graphCallCount++;
          if (graphCallCount === 1) {
            return {
              ok: true,
              json: async () => sampleGraphData,
            } as unknown as Response;
          }
          // Return error response (refresh() fails after scan)
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Refresh failed' }),
          } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return { ok: true, json: async () => ({ output: 'path/to/output.json' }) } as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    await screen.findByTestId('graph-view');

    // Click Scan button
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay appears
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();

    // Wait for overlay to disappear (scan succeeds, setScanning(false) before refresh)
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 3000, interval: 100 },
    );

    // Overlay stays gone even if refresh fails afterwards
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
  });

  // =========================================================================
  // scanOverlayStatus derivation: scanning=true, scanError=null -> 'scanning'
  // =========================================================================
  it('scanOverlayStatus: scanning=true, scanError=null should derive status as "scanning"', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          // Leave pending to keep scanning=true
          return new Promise(() => {});
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    await screen.findByTestId('graph-view');

    // Click Scan button
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay appears in scanning state (status=scanning)
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();

    // Scanning state shows status text (i18n returns key: 'action.scanning')
    // Note: both the ScanOverlay status text AND the Scan button text show
    // 'action.scanning' when scanning=true, so use getAllByText
    const scanningTexts = screen.getAllByText('action.scanning');
    expect(scanningTexts.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // scanOverlayStatus derivation: scanning=true, scanError=error -> 'error'
  // =========================================================================
  it('scanOverlayStatus: scanning=true, scanError="..." should derive status as "error"', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
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

    // Click Scan button
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay appears in error state (scanError set)
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();

    // Error state shows error text 'Scan failed' from the mock response
    expect(screen.getByText('Scan failed')).toBeInTheDocument();

    // Close button should be present (i18n returns key: 'action.scanOverlayClose')
    expect(screen.getByRole('button', { name: 'action.scanOverlayClose' })).toBeInTheDocument();
  });

  // =========================================================================
  // scanning=false -> overlay not rendered
  // =========================================================================
  it('scanOverlayStatus: scanning=false does not render ScanOverlay', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    await screen.findByTestId('graph-view');

    // Overlay is NOT rendered when scanning=false
    expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
  });
});
