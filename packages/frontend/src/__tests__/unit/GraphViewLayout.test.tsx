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
 *   - AC-6: scanError displays error message
 *   - B-1:  disabled button during scanning prevents repeated clicks
 *   - B-2:  scan completes without auto-refresh
 *   - B-3:  network error is displayed via scanError prop
 *   - B-19: loading and scanning states are independent
 */

import { fireEvent, render, screen } from '@testing-library/react';
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
    onScan: vi.fn(),
    scanning: false,
    scanError: null as string | null,
    children: <div data-testid="child-content">Child content</div>,
    ...overrides,
  } as Parameters<typeof GraphViewLayout>[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GraphViewLayout -- Scan button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tCalls.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // AC-1: Scan button renders in action bar when onScan is provided
  // =========================================================================
  it('AC-1: renders Scan button in action bar when onScan prop is provided', () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeInTheDocument();
    expect(scanBtn).toHaveTextContent('Scan');

    // The Scan button has inline styles (actionBtn equivalent)
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
  // AC-1: Backward compatibility -- no Scan button when onScan is undefined
  // =========================================================================
  it('AC-1: does NOT render Scan button when onScan is undefined (backward compat)', () => {
    render(<GraphViewLayout {...createDefaultProps({ onScan: undefined })} />);

    expect(screen.queryByRole('button', { name: 'Scan' })).not.toBeInTheDocument();

    // Refresh button should still be present
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument();
  });

  // =========================================================================
  // AC-2: Clicking Scan button triggers onScan callback
  // =========================================================================
  it('AC-2: clicking Scan button triggers onScan callback', () => {
    const onScan = vi.fn();
    render(<GraphViewLayout {...createDefaultProps({ onScan })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // AC-3: scanning=true disables button and shows loading text
  // =========================================================================
  it('AC-3: scanning=true disables the Scan button and shows loading text', () => {
    render(<GraphViewLayout {...createDefaultProps({ scanning: true })} />);

    // The aria-label stays 'Scan' even when scanning=true, so we query by
    // the stable accessible name then verify disabled state and visible text.
    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeDisabled();
    expect(scanBtn).toHaveTextContent('Scanning...');

    // The icon's parent span should have the 'spinning' class
    const iconSpan = screen.getByTestId('scan-icon').parentElement;
    expect(iconSpan).toHaveClass('spinning');
  });

  // =========================================================================
  // AC-3: scanning transition adds spinning class
  // =========================================================================
  it('AC-3: scanning changes from false to true adds spinning class', () => {
    const { rerender } = render(<GraphViewLayout {...createDefaultProps({ scanning: false })} />);

    // Rerender with scanning=true
    rerender(<GraphViewLayout {...createDefaultProps({ scanning: true })} />);

    const iconSpan = screen.getByTestId('scan-icon').parentElement;
    expect(iconSpan).toHaveClass('spinning');
  });

  // =========================================================================
  // AC-6: scanError shows error message
  // =========================================================================
  it('AC-6: scanError displays error message element', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({ scanError: 'dependency-cruiser did not produce output' })}
      />,
    );

    // The error text is formatted as "{t('action.scanError')}: {scanError}"
    expect(
      screen.getByText('Scan failed: dependency-cruiser did not produce output'),
    ).toBeInTheDocument();
  });

  // =========================================================================
  // AC-6: scanError=null hides error element
  // =========================================================================
  it('AC-6: scanError=null hides error element', () => {
    render(<GraphViewLayout {...createDefaultProps({ scanError: null })} />);

    expect(screen.queryByText(/Scan failed/)).not.toBeInTheDocument();
  });

  // =========================================================================
  // B-1: disabled button during scanning prevents repeated onScan calls
  // =========================================================================
  it('B-1: clicking Scan button while scanning=true does not call onScan again', () => {
    const onScan = vi.fn();
    const { rerender } = render(
      <GraphViewLayout {...createDefaultProps({ onScan, scanning: false })} />,
    );

    // Click while enabled
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    expect(onScan).toHaveBeenCalledTimes(1);

    // Rerender with scanning=true - button becomes disabled
    rerender(<GraphViewLayout {...createDefaultProps({ onScan, scanning: true })} />);

    // Button now shows loading text and is disabled
    // (aria-label stays 'Scan' but the button text content changes)
    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeDisabled();
    expect(scanBtn).toHaveTextContent('Scanning...');

    // Attempting to click disabled button should NOT call onScan again
    fireEvent.click(scanBtn);
    expect(onScan).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  // =========================================================================
  // B-2: scan completes without auto-refresh
  // =========================================================================
  it('B-2: after onScan completes, no auto-refresh/reload is triggered', () => {
    const onScan = vi.fn();
    const onRefresh = vi.fn();
    const { rerender } = render(
      <GraphViewLayout {...createDefaultProps({ onScan, onRefresh, scanning: false })} />,
    );

    // Simulate scan: scanning false -> true
    rerender(<GraphViewLayout {...createDefaultProps({ onScan, onRefresh, scanning: true })} />);

    // Simulate scan complete: scanning true -> false
    rerender(<GraphViewLayout {...createDefaultProps({ onScan, onRefresh, scanning: false })} />);

    // onRefresh should NOT have been called -- no auto-refresh
    expect(onRefresh).not.toHaveBeenCalled();
  });

  // =========================================================================
  // B-3: Scan button displays error state via scanError prop
  // =========================================================================
  it('B-3: Scan button displays error state when scanError is set', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({
          scanning: false,
          scanError: 'Network request failed: TypeError: Failed to fetch',
        })}
      />,
    );

    expect(screen.getByText(/Network request failed/)).toBeInTheDocument();

    // Button should NOT be disabled after error (scanning=false)
    expect(screen.getByRole('button', { name: 'Scan' })).not.toBeDisabled();
  });

  // =========================================================================
  // B-19: loading (Refresh) and scanning are independent states
  // =========================================================================
  it('B-19: loading and scanning are independent states', () => {
    const { rerender } = render(
      <GraphViewLayout
        {...createDefaultProps({
          loading: true,
          scanning: true,
        })}
      />,
    );

    // Both buttons disabled (Scan button accessed by stable label 'Scan')
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled();

    // Rerender: loading=false, scanning=true
    rerender(
      <GraphViewLayout
        {...createDefaultProps({
          loading: false,
          scanning: true,
        })}
      />,
    );

    // Refresh enabled, Scan still disabled (independent)
    expect(screen.getByRole('button', { name: 'Refresh data' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled();
  });
});
