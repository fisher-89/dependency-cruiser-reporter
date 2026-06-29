/**
 * Unit tests: GraphViewLayout -- Scan button
 *
 * Tests that GraphViewLayout renders the Scan button in the action bar when
 * `onScan` prop is provided, and that the button's appearance and behavior
 * change according to `scanning` and `scanError` props.
 *
 * Coverage targets (from test-design.md):
 *   - AC-1: Scan button renders in action bar with text action.scan
 *   - AC-1: Scan button visible in all three views (Graph/Report/Metrics)
 *   - AC-2: Clicking Scan button triggers onScan callback
 *   - AC-3: scanning=true shows disabled button with loading text
 *   - AC-3: scanning transition triggers spinning class
 *   - B-1:  disabled button during scanning prevents repeated clicks
 *   - B-19: loading and scanning states are independent
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { GraphViewLayout } from '@/components/GraphViewLayout';

// ---------------------------------------------------------------------------
// Mock i18n hook -- track which keys are accessed
// ---------------------------------------------------------------------------
const tCalls: string[] = [];

vi.mock('@/i18n', () => ({
  useT: () => ({
    t: (key: string) => {
      tCalls.push(key);
      const map: Record<string, string> = {
        'action.scan': 'Scan',
        'action.scanning': 'Scanning...',
        'action.scanError': 'Scan failed',
        'nav.refresh': 'Refresh data',
      };
      return map[key] ?? key;
    },
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock theme (ScanOverlay uses useTheme internally)
// ---------------------------------------------------------------------------
vi.mock('@/theme', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', cycleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock icon components
// ---------------------------------------------------------------------------
vi.mock('@/components/icons', () => ({
  RefreshIcon: () => <span data-testid="refresh-icon" />,
  ScanIcon: () => <span data-testid="scan-icon" />,
}));

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------
function createDefaultProps(overrides: Record<string, unknown> = {}) {
  return {
    loading: false,
    onRefresh: vi.fn(),
    stabilityHeatmap: false,
    onStabilityHeatmapChange: vi.fn(),
    children: <div data-testid="child-content">Child content</div>,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Hanging fetch mock -- never resolves, keeps scanning=true
// ---------------------------------------------------------------------------
function mockFetchHanging() {
  return vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GraphViewLayout -- Scan button', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    tCalls.length = 0;
    // Default: prevent real API calls by hanging (component will stay in scanning)
    fetchMock = mockFetchHanging();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // AC-1: Scan button renders in action bar
  // =========================================================================
  it('AC-1: renders Scan button in action bar alongside children', () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeInTheDocument();
    expect(scanBtn).toHaveTextContent('Scan');
    expect(scanBtn).toBeEnabled();
  });

  // =========================================================================
  // AC-1: Scan button appears alongside graph view children
  // =========================================================================
  it('AC-1: renders Scan button alongside graph view children', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({
          children: <div data-testid="graph-content">Graph view</div>,
        })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Scan' })).toBeInTheDocument();
    expect(screen.getByTestId('graph-content')).toBeInTheDocument();
  });

  // =========================================================================
  // AC-1: Scan button appears alongside report/metrics view children
  // =========================================================================
  it('AC-1: renders Scan button alongside report/metrics view content', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({
          children: <div data-testid="report-content">Report view</div>,
        })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Scan' })).toBeInTheDocument();
    expect(screen.getByTestId('report-content')).toBeInTheDocument();
  });

  // =========================================================================
  // AC-1: Scan button is always rendered (no external onScan prop needed)
  // =========================================================================
  it('AC-1: renders Scan button by default (no onScan prop)', () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    // The Scan button is built into GraphViewLayout -- always present
    expect(screen.getByRole('button', { name: 'Scan' })).toBeInTheDocument();
    // Refresh button should also be present
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument();
  });

  // =========================================================================
  // AC-2: Clicking Scan button triggers fetch('/api/analyze')
  // =========================================================================
  it('AC-2: clicking Scan button triggers fetch to /api/analyze', async () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));

    // The component calls fetch('/api/analyze', { method: 'POST' })
    expect(fetchMock).toHaveBeenCalledWith('/api/analyze', { method: 'POST' });
  });

  // =========================================================================
  // AC-3: scanning disables the Scan button and shows loading text
  // =========================================================================
  it('AC-3: clicking Scan disables button and shows scanning text', async () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeEnabled();

    fireEvent.click(scanBtn);

    // After click, internal scanning becomes true -- button disabled
    await waitFor(() => {
      expect(scanBtn).toBeDisabled();
    });
    expect(scanBtn).toHaveTextContent('Scanning...');

    // The icon's parent span (action bar Scan button, not ScanOverlay) should have the 'spinning' class
    const scanIcons = screen.getAllByTestId('scan-icon');
    const actionBarIcon = scanIcons[0]; // First icon is in the action bar
    expect(actionBarIcon.parentElement).toHaveClass('spinning');
  });

  // =========================================================================
  // B-1: disabled button during scanning prevents further action
  // =========================================================================
  it('B-1: clicking Scan while scanning does not trigger multiple scans', async () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    fireEvent.click(scanBtn);

    // Wait for scanning state to be true
    await waitFor(() => {
      expect(scanBtn).toBeDisabled();
    });

    // fetch should have been called exactly once
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Clicking disabled button should not trigger another fetch
    fireEvent.click(scanBtn);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // B-2: scan completes triggers onRefresh (not a no-op)
  // =========================================================================
  it('B-2: on successful scan, onRefresh is called', async () => {
    vi.useFakeTimers();
    const onRefresh = vi.fn();

    // Mock fetch to resolve successfully
    const okFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    render(<GraphViewLayout {...createDefaultProps({ onRefresh })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));

    // Advance past the minDisplay 500ms and let promises resolve
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
    okFetch.mockRestore();
  });

  // =========================================================================
  // B-19: loading (Refresh) and scanning are independent states
  // =========================================================================
  it('B-19: loading and scanning are independent states', async () => {
    const { rerender } = render(
      <GraphViewLayout
        {...createDefaultProps({
          loading: true,
        })}
      />,
    );

    // Refresh button disabled due to loading=true
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeDisabled();
    // Scan button not yet clicked -- enabled
    expect(screen.getByRole('button', { name: 'Scan' })).toBeEnabled();

    // Click Scan to start internal scanning
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled();
    });

    // Rerender: loading=false, scanning still true internally
    rerender(
      <GraphViewLayout
        {...createDefaultProps({
          loading: false,
        })}
      />,
    );

    // Refresh enabled, Scan still disabled (independent states)
    expect(screen.getByRole('button', { name: 'Refresh data' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled();
  });
});
