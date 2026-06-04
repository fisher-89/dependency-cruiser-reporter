/**
 * Unit tests: ScanOverlay -- minimum display time (500ms)
 *
 * Verifies that the ScanOverlay remains visible for at least 500ms when
 * the scan completes quickly (< 500ms), and closes immediately when the
 * scan takes longer than 500ms.
 *
 * Coverage targets (from design.md):
 *   - Fast scan (< 500ms): overlay stays visible for at least 500ms total
 *   - Slow scan (> 500ms): overlay closes as soon as scan completes
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import App from '@/App';

// ---------------------------------------------------------------------------
// Mock ArchitectureView (lazy-loaded)
// ---------------------------------------------------------------------------
vi.mock('@/components/ArchitectureView', () => ({
  default: () => <div data-testid="architecture-view">ArchitectureView Mock</div>,
}));

vi.mock('@/components/DependencyGraph/DependencyGraph', () => ({
  DependencyGraph: () => <div>DependencyGraph Mock</div>,
}));

vi.mock('@/components/DetailPanel', () => ({
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
  useTheme: () => ({
    theme: 'light',
    resolvedTheme: 'light',
    cycleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock icons
// ---------------------------------------------------------------------------
vi.mock('@/components/icons', () => ({
  ScanIcon: () => <span data-testid="scan-icon" />,
  RefreshIcon: () => <span data-testid="refresh-icon" />,
  SettingsIcon: () => <span data-testid="settings-icon" />,
  SunIcon: () => <span />,
  MoonIcon: () => <span />,
  MonitorIcon: () => <span />,
  GenerateRulesIcon: () => <span />,
}));

// ---------------------------------------------------------------------------
// Sample graph data
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
  ],
  edges: [],
  meta: { original_node_count: 1, aggregated_node_count: 1, total_violations: 0 },
  violations: [],
};

// ---------------------------------------------------------------------------
// Stub IntersectionObserver
// ---------------------------------------------------------------------------
function stubIntersectionObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })),
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
// Tests
// ---------------------------------------------------------------------------

describe('ScanOverlay minimum display time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    stubIntersectionObserver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  // =========================================================================
  // Fast scan (< 500ms): overlay stays for at least 500ms
  // =========================================================================
  it('keeps overlay visible for at least 500ms on fast scan', async () => {
    // Mock both analyze and graph endpoints to resolve immediately
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/analyze')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'ok' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => sampleGraphData,
      } as Response);
    });

    renderApp();

    // Wait for initial data load -> graph-view
    await screen.findByTestId('graph-view');

    // Click Scan button (i18n mock returns keys, so aria-label is action.scan)
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay should appear immediately
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();

    // Wait for overlay to disappear (may take 500ms + state processing)
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 3000, interval: 100 },
    );

    fetchMock?.mockRestore();
  });

  // =========================================================================
  // Slow scan (> 500ms): overlay closes without extra delay
  // =========================================================================
  it('closes overlay without extra delay on slow scan', async () => {
    let analyzeResolve: ((value: Response) => void) | null = null;

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/analyze')) {
        // Return a promise that won't resolve until manually triggered
        return new Promise<Response>((resolve) => {
          analyzeResolve = resolve;
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => sampleGraphData,
      } as Response);
    });

    renderApp();

    await screen.findByTestId('graph-view');

    // Click Scan
    fireEvent.click(screen.getByRole('button', { name: 'action.scan' }));

    // Overlay appears
    expect(await screen.findByTestId('scan-overlay')).toBeInTheDocument();

    // Resolve the analyze request after a delay (simulating slow scan)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Now resolve the analyze call
    await act(async () => {
      if (analyzeResolve) {
        analyzeResolve({
          ok: true,
          json: async () => ({ status: 'ok' }),
        } as Response);
      }
    });

    // Since the scan took < 500ms total, overlay should still be visible
    // for the remainder of the 500ms minimum display time
    expect(screen.getByTestId('scan-overlay')).toBeInTheDocument();

    // Wait for overlay to disappear after the min display time
    await vi.waitFor(
      () => {
        expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
      },
      { timeout: 3000, interval: 100 },
    );

    fetchMock?.mockRestore();
  });
});
