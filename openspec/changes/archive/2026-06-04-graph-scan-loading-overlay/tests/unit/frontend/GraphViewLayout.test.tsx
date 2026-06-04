/**
 * Unit tests: GraphViewLayout -- scanError removal and scan button regression
 *
 * Tests the change-related differences in GraphViewLayout:
 *   - scanError prop is still received but NO LONGER renders error text
 *   - Scan button disabled state, spinning class, and text changes (regression)
 *   - onScan undefined hides Scan button (backward compat regression)
 *
 * Coverage targets (from test-design.md):
 *   - scanError non-null: error text NOT rendered (core change)
 *   - Scan button disabled during scanning (regression)
 *   - Scan button spinning class during scanning (regression)
 *   - Scan button text change during scanning (regression)
 *   - onScan=undefined hides Scan button (backward compat)
 *
 * NOTE: The existing test file at `src/__tests__/unit/GraphViewLayout.test.tsx`
 * contains tests (AC-6) that verify error text IS rendered. After this change,
 * those tests must also be updated (see test-design.md Section 6).
 * This file covers the NEW expected behavior.
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

describe('GraphViewLayout -- scanError removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tCalls.length = 0;
  });

  afterEach(() => {
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
    render(
      <GraphViewLayout
        {...createDefaultProps({ scanError: 'Some error' })}
      />,
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toHaveTextContent('Child content');
  });

  // =========================================================================
  // Regression: Scan button renders and is enabled when scanning=false
  // =========================================================================
  it('REGRESSION: Scan button renders in action bar when onScan is provided', () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeInTheDocument();
    expect(scanBtn).toBeEnabled();
    expect(scanBtn).toHaveTextContent('Scan');
  });

  // =========================================================================
  // Regression: scanning=true disables Scan button and shows loading text
  // =========================================================================
  it('REGRESSION: scanning=true disables Scan button and shows scanning text', () => {
    render(<GraphViewLayout {...createDefaultProps({ scanning: true })} />);

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeDisabled();
    expect(scanBtn).toHaveTextContent('Scanning...');

    // Icon container should have spinning class
    const iconSpan = screen.getByTestId('scan-icon').parentElement;
    expect(iconSpan).toHaveClass('spinning');
  });

  // =========================================================================
  // Regression: clicking Scan button triggers onScan callback
  // =========================================================================
  it('REGRESSION: clicking enabled Scan button triggers onScan callback', () => {
    const onScan = vi.fn();
    render(<GraphViewLayout {...createDefaultProps({ onScan })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // Regression: disabled Scan button does not call onScan
  // =========================================================================
  it('REGRESSION: clicking disabled Scan button (scanning=true) does not call onScan', () => {
    const onScan = vi.fn();
    const { rerender } = render(
      <GraphViewLayout {...createDefaultProps({ onScan, scanning: false })} />,
    );

    // First click works
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    expect(onScan).toHaveBeenCalledTimes(1);

    // Rerender with scanning=true
    rerender(<GraphViewLayout {...createDefaultProps({ onScan, scanning: true })} />);

    // Click disabled button -- should not fire
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    expect(onScan).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  // =========================================================================
  // Regression: onScan=undefined hides Scan button (backward compat)
  // =========================================================================
  it('REGRESSION: onScan=undefined does NOT render Scan button (backward compat)', () => {
    render(<GraphViewLayout {...createDefaultProps({ onScan: undefined })} />);

    expect(screen.queryByRole('button', { name: 'Scan' })).not.toBeInTheDocument();

    // Refresh button should still be present
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument();
  });

  // =========================================================================
  // Regression: loading and scanning are independent states
  // =========================================================================
  it('REGRESSION: loading (Refresh) and scanning (Scan) are independent states', () => {
    const { rerender } = render(
      <GraphViewLayout
        {...createDefaultProps({ loading: true, scanning: true })}
      />,
    );

    // Both buttons disabled
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled();

    // Rerender: loading=false, scanning=true
    rerender(
      <GraphViewLayout
        {...createDefaultProps({ loading: false, scanning: true })}
      />,
    );

    // Refresh enabled, Scan still disabled
    expect(screen.getByRole('button', { name: 'Refresh data' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled();
  });

  // =========================================================================
  // Regression: Refresh button behavior unchanged by scanError prop
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
  // B-9: Scan button disabled during scanning, regardless of loading state
  // =========================================================================
  it('B-9: scanning=true disables Scan button even when loading=false', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({ scanning: true, loading: false })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled();
  });
});
