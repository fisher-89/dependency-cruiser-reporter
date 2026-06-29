/**
 * Unit tests: GraphViewLayout -- scanError removal and scan button regression
 *
 * Tests the change-related differences in GraphViewLayout:
 *   - scanError prop is still received but NO LONGER renders error text
 *   - Scan button disabled state, spinning class, and text changes (regression)
 *
 * Coverage targets (from test-design.md):
 *   - scanError non-null: error text NOT rendered (core change)
 *   - Scan button disabled during scanning (regression)
 *   - Scan button spinning class during scanning (regression)
 *   - Scan button text change during scanning (regression)
 *
 * NOTE: GraphViewLayout now manages scanning internally (no external onScan/scanning props).
 * Tests verify the Scan button's built-in behavior via click + fetch mock.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  } satisfies Record<string, unknown>;
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

describe('GraphViewLayout -- scanError removal', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    tCalls.length = 0;
    fetchMock = mockFetchHanging();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Core change: scanError text is NO LONGER rendered
  // =========================================================================
  it('scanError non-null does NOT render error text in GraphViewLayout (removed in this change)', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({ scanError: 'dependency-cruiser did not produce output' })}
      />,
    );

    // The error text "{t('action.scanError')}: {scanError}" should NOT be present
    expect(screen.queryByText(/Scan failed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/dependency-cruiser/)).not.toBeInTheDocument();
  });

  // =========================================================================
  // Core change: scanError=null still renders fine (no error shown)
  // =========================================================================
  it('scanError=null does not show error text (unchanged behavior)', () => {
    render(<GraphViewLayout {...createDefaultProps({ scanError: null })} />);

    expect(screen.queryByText(/Scan failed/)).not.toBeInTheDocument();
  });

  // =========================================================================
  // Core change: scanError does not affect child content rendering
  // =========================================================================
  it('scanError non-null does not prevent child content from rendering', () => {
    render(<GraphViewLayout {...createDefaultProps({ scanError: 'Some error' })} />);

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toHaveTextContent('Child content');
  });

  // =========================================================================
  // Regression: Scan button renders in action bar
  // =========================================================================
  it('REGRESSION: Scan button renders in action bar', () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeInTheDocument();
    expect(scanBtn).toBeEnabled();
    expect(scanBtn).toHaveTextContent('Scan');
  });

  // =========================================================================
  // Regression: clicking Scan triggers internal scanning (button disabled, text changes)
  // =========================================================================
  it('REGRESSION: clicking Scan disables button and shows scanning text', async () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeEnabled();

    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(scanBtn).toBeDisabled();
    });
    expect(scanBtn).toHaveTextContent('Scanning...');

    // Icon container should have spinning class (action bar icon, not ScanOverlay)
    const scanIcons = screen.getAllByTestId('scan-icon');
    const actionBarIcon = scanIcons[0]; // First icon is in the action bar
    expect(actionBarIcon.parentElement).toHaveClass('spinning');
  });

  // =========================================================================
  // Regression: clicking Scan triggers fetch, not onScan callback
  // =========================================================================
  it('REGRESSION: clicking Scan triggers fetch to /api/analyze', () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/analyze', { method: 'POST' });
  });

  // =========================================================================
  // Regression: disabled Scan button cannot trigger another fetch
  // =========================================================================
  it('REGRESSION: clicking disabled Scan button does not trigger duplicate fetch', async () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(scanBtn).toBeDisabled();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Click disabled button -- should not fire another fetch
    fireEvent.click(scanBtn);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // Regression: Scan button is always rendered (built-in)
  // =========================================================================
  it('REGRESSION: Scan button is always rendered (built-in, not conditional)', () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    // Scan button is built into GraphViewLayout -- always present
    expect(screen.getByRole('button', { name: 'Scan' })).toBeInTheDocument();
    // Refresh button should also be present
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument();
  });

  // =========================================================================
  // Regression: loading and internal scanning are independent states
  // =========================================================================
  it('REGRESSION: loading (Refresh) and internal scanning (Scan) are independent states', async () => {
    const { rerender } = render(
      <GraphViewLayout
        {...createDefaultProps({
          loading: true,
        })}
      />,
    );

    // Refresh disabled due to loading, Scan enabled
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scan' })).toBeEnabled();

    // Click Scan to start internal scanning
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled();
    });

    // Rerender: loading=false, internal scanning still active
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

  // =========================================================================
  // Regression: Refresh button behavior unaffected by scanError
  // =========================================================================
  it('REGRESSION: Refresh button is unaffected by scanError prop', () => {
    const onRefresh = vi.fn();
    render(
      <GraphViewLayout
        {...createDefaultProps({
          onRefresh,
          scanError: 'Some error',
          loading: false,
        })}
      />,
    );

    const refreshBtn = screen.getByRole('button', { name: 'Refresh data' });
    expect(refreshBtn).toBeEnabled();
    expect(refreshBtn).toHaveTextContent('Refresh data');

    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // B-9: Scan button click triggers disabled state regardless of loading
  // =========================================================================
  it('B-9: clicking Scan disables button even when loading=false', async () => {
    render(<GraphViewLayout {...createDefaultProps({ loading: false })} />);

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeEnabled();

    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(scanBtn).toBeDisabled();
    });
  });
});
