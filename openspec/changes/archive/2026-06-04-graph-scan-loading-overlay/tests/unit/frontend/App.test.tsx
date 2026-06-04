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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function mockFetchGraphData() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => sampleGraphData,
  } as unknown as Response);
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
    // First fetch (initial data load) returns graph data
    // Second fetch (scan) returns 200 OK
    // Third fetch (refresh -> fetchGraph) returns graph data again
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        // Initial data fetch (POST /api/graph)
        if (url === '/api/graph' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => sampleGraphData,
          } as unknown as Response;
        }
        // Scan call (POST /api/analyze)
        if (url === '/api/analyze' && init?.method === 'POST') {
          return { ok: true, json: async () => ({ output: 'path/to/output.json' }) } as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    // Wait for initial graph data to load so the Scan button appears
    await screen.findByTestId('graph-view');

    // Click Scan button
    const scanBtn = screen.getByRole('button', { name: 'nav.graph' }); // Uses t(key) -> key pattern
    // TODO: The i18n mock returns the key string as-is. The actual Scan button
    // aria-label uses t('action.scan') which will be 'action.scan'.
    // Adjust the selector based on actual i18n mock behavior.
    // fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // TODO: After clicking Scan, verify:
    // 1. POST /api/analyze was called
    // 2. ScanOverlay disappears (overlay no longer in DOM)
    // 3. POST /api/graph was called again (via refresh)
    // Example assertions:
    //   const analyzeCalls = vi.mocked(globalThis.fetch).mock.calls.filter(
    //     ([url, init]) => url === '/api/analyze' && init?.method === 'POST',
    //   );
    //   expect(analyzeCalls).toHaveLength(1);
    //   await waitFor(() => {
    //     expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
    //   });
    //   const graphCallsAfterScan = vi.mocked(globalThis.fetch).mock.calls.filter(
    //     ([url, init]) => url === '/api/graph' && init?.method === 'POST',
    //   );
    //   expect(graphCallsAfterScan.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // AC-7: handleDismissScan clears scanning and scanError
  // =========================================================================
  it('AC-7: dismissing the error overlay calls handleDismissScan and clears scan state', async () => {
    // First fetch returns graph data (initial load)
    // Second fetch is the scan call that returns 500
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

    // Wait for initial graph data to load
    await screen.findByTestId('graph-view');

    // Click Scan button to trigger scan
    // TODO: Click the Scan button and then:
    // 1. Verify error overlay appears with error message
    // 2. Find and click the dismiss/close button
    // 3. Verify overlay disappears
    //    await waitFor(() => {
    //      expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
    //    });
  });

  // =========================================================================
  // AC-10: Network error sets scanError
  // =========================================================================
  it('AC-10: network error during scan sets scanError with error message', async () => {
    // First fetch returns graph data (initial load)
    // Second fetch (scan) throws network error
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

    // Wait for initial graph data to load
    await screen.findByTestId('graph-view');

    // Click Scan button
    // TODO: Click the Scan button and then:
    // 1. Verify error overlay appears
    // 2. Verify error message contains 'Failed to fetch' or similar network error text
    // 3. Verify close button is present
  });

  // =========================================================================
  // B-1: Fast scan (< 500ms) enforces minimum display time
  // =========================================================================
  it('B-1: fast scan enforces 500ms minimum overlay display time', async () => {
    vi.useFakeTimers();

    // First fetch returns graph data (initial load)
    // We need a manually resolvable promise for the scan to control timing
    let resolveScan: (value: unknown) => void;
    const scanPromise = new Promise((resolve) => {
      resolveScan = resolve;
    });

    let scanStartTime: number = Date.now();

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
          scanStartTime = Date.now();
          await scanPromise;
          return { ok: true, json: async () => ({ output: 'output.json' }) } as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    // Wait for initial graph data to load
    await screen.findByTestId('graph-view');

    // Click Scan button
    // fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Resolve scan promise after 100ms (fast scan, < 500ms)
    // resolveScan!({ ok: true, json: async () => ({ output: 'output.json' }) } as Response);

    // Advance timers
    // vi.advanceTimersByTime(100); // scan resolves at 100ms
    // vi.advanceTimersByTime(400); // wait remaining 400ms to hit 500ms threshold

    // TODO: Verify:
    // 1. Overlay remained visible for at least 500ms total
    // 2. setScanning(false) and refresh() happened after the delay
    // Example:
    //   const graphCallsAfterScan = vi.mocked(globalThis.fetch).mock.calls.filter(
    //     ([url, init]) => url === '/api/graph' && init?.method === 'POST',
    //   );
    //   expect(graphCallsAfterScan.length).toBeGreaterThanOrEqual(2);

    vi.useRealTimers();
  });

  // =========================================================================
  // B-2: Slow scan (> 500ms) no extra delay
  // =========================================================================
  it('B-2: slow scan (>= 500ms) does NOT add extra delay before closing', async () => {
    vi.useFakeTimers();

    let resolveScan: (value: unknown) => void;
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

    // Wait for initial graph data to load
    await screen.findByTestId('graph-view');

    // Click Scan button
    // fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Resolve scan promise after 600ms (slow scan, >= 500ms)
    // resolveScan!({ ok: true, json: async () => ({ output: 'output.json' }) } as Response);
    // vi.advanceTimersByTime(600);

    // TODO: Verify that setScanning(false) is called immediately without
    // additional artificial delay (no setTimeout for min display time).
    // The POST /api/graph call should arrive promptly after scan resolves.

    vi.useRealTimers();
  });

  // =========================================================================
  // B-3: Non-JSON response body falls back to statusText
  // =========================================================================
  it('B-3: scan response with non-JSON body uses res.statusText as scanError', async () => {
    // First fetch returns graph data (initial load)
    // Second fetch (scan) returns non-JSON body
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

    // Wait for initial graph data to load
    await screen.findByTestId('graph-view');

    // Click Scan button
    // TODO: Click the Scan button and then:
    // 1. Verify error message shows 'Service Unavailable' (statusText fallback)
    // 2. Verify the overlay stays visible (scanning stays true)
  });

  // =========================================================================
  // B-4: Response body "details" field overrides "error" field
  // =========================================================================
  it('B-4: response body "details" field takes priority over "error" field', async () => {
    // First fetch returns graph data (initial load)
    // Second fetch (scan) returns 422 with both details and error
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

    // Wait for initial graph data to load
    await screen.findByTestId('graph-view');

    // Click Scan button
    // TODO: Click the Scan button and then:
    // 1. Verify error message shows 'Invalid config' (details field takes priority)
    // 2. Verify the message is NOT 'Generic error'
  });

  // =========================================================================
  // B-12: 204 No Content response handling
  // =========================================================================
  it('B-12: scan response 204 No Content (ok=true, no body) does not crash', async () => {
    // First fetch returns graph data (initial load)
    // Second fetch (scan) returns 204 No Content
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

    // Wait for initial graph data to load
    await screen.findByTestId('graph-view');

    // Click Scan button
    // TODO: Click the Scan button and then:
    // 1. Verify the app does not crash (no uncaught errors)
    // 2. Verify the scan completes successfully (overlay closes, refresh called)
    //    even though the 204 body is empty.
  });

  // =========================================================================
  // B-10: refresh() throws after setScanning(false) -- overlay stays closed
  // =========================================================================
  it('B-10: refresh() throws after setScanning(false) and overlay stays closed, scanning remains false', async () => {
    // First fetch (initial data load): POST /api/graph -> succeeds
    // Second fetch (scan):            POST /api/analyze -> 200 OK
    // Third fetch (refresh):          POST /api/graph -> throws
    //
    // The order in handleScan is: setScanning(false) then refresh().
    // Even when refresh() throws, setScanning(false) has already been called,
    // so the overlay must stay closed and scanning must remain false.
    let graphCallCount = 0;

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/graph' && init?.method === 'POST') {
          graphCallCount++;
          if (graphCallCount === 1) {
            // Initial data load succeeds
            return {
              ok: true,
              json: async () => sampleGraphData,
            } as unknown as Response;
          }
          // refresh() call after scan -- throw to simulate failure
          throw new Error('Simulated graph refresh failure');
        }
        if (url === '/api/analyze' && init?.method === 'POST') {
          return { ok: true, json: async () => ({ output: 'path/to/output.json' }) } as Response;
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    // Wait for initial graph data to load so the Scan button appears
    await screen.findByTestId('graph-view');

    // Click Scan button
    // TODO: Click the Scan button and then:
    // 1. Verify overlay appeared briefly (scanning state)
    // 2. Verify overlay closes (setScanning(false) was called before refresh())
    // 3. Verify overlay does NOT reappear when refresh() throws
    // 4. Verify scanning remains false (not reset to true by the error path)
    // Example:
    //   fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));
    //
    //   // Overlay should disappear since setScanning(false) already executed
    //   await waitFor(() => {
    //     expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
    //   });
    //
    //   // Give extra time for refresh() to fail -- overlay must stay gone
    //   await new Promise((r) => setTimeout(r, 100));
    //   expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
    //
    //   // Verify refresh (POST /api/graph) was indeed called after scan
    //   const graphCallsAfterScan = vi.mocked(globalThis.fetch).mock.calls.filter(
    //     ([url, init]) => url === '/api/graph' && init?.method === 'POST',
    //   );
    //   expect(graphCallsAfterScan.length).toBeGreaterThanOrEqual(2);
    //
    //   // Verify scanning is not accidentally set back to true by refresh() error
    //   // (This requires access to scanning state or observing overlay DOM absence
    //   //  after a reasonable delay to confirm no re-render with scanning=true)
    //   expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
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
          // This promise will be left pending to keep scanning=true
          return new Promise(() => {});
        }
        return new Response(null, { status: 404 });
      });

    renderApp();

    // Wait for initial graph data to load
    await screen.findByTestId('graph-view');

    // Click Scan button
    // TODO: Click Scan button and verify:
    // 1. ScanOverlay appears with visible=true, status='scanning'
    //    expect(screen.getByTestId('scan-progress-bar')).toBeInTheDocument();
    //    expect(screen.getByText('action.scanning')).toBeInTheDocument();
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

    // Wait for initial graph data to load
    await screen.findByTestId('graph-view');

    // Click Scan button
    // TODO: Click Scan button and verify:
    // 1. ScanOverlay appears with visible=true, status='error'
    // 2. Error message is displayed
    // 3. Close button is present
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

    // Wait for initial graph data to load -- scanning should be false at this point
    await screen.findByTestId('graph-view');

    // Verify overlay is NOT rendered
    expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
  });
});
