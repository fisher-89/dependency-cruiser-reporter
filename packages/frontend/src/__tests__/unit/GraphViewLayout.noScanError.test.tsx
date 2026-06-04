/**
 * Unit tests: GraphViewLayout -- scanError no longer renders inline error
 *
 * After the graph-scan-loading-overlay change, scanError is no longer displayed
 * inline in GraphViewLayout (it is shown in the full-screen ScanOverlay instead).
 * This file verifies that behavior.
 *
 * Coverage targets:
 *   - AC-6: scanError is NOT rendered as inline error text
 *   - scanError being passed does not affect Scan button state
 *   - scanError prop is accepted but has no visible effect
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { GraphViewLayout } from '@/components/GraphViewLayout';

// ---------------------------------------------------------------------------
// Mock i18n hook
// ---------------------------------------------------------------------------
vi.mock('@/i18n', () => ({
  useT: () => ({
    t: (key: string) => {
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

describe('GraphViewLayout -- scanError removed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // AC-6 (modified): scanError is no longer rendered inline
  // =========================================================================
  it('AC-6: does NOT render inline error text when scanError is set', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({ scanError: 'dependency-cruiser did not produce output' })}
      />,
    );

    // The error text should NOT be visible in GraphViewLayout
    expect(screen.queryByText(/dependency-cruiser/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Scan failed/)).not.toBeInTheDocument();
  });

  // =========================================================================
  // scanError prop is accepted but Scan button behavior is unaffected
  // =========================================================================
  it('Scan button state is unaffected when scanError is passed', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({
          scanning: false,
          scanError: 'Some error',
        })}
      />,
    );

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).not.toBeDisabled();
    expect(scanBtn).toHaveTextContent('Scan');
  });

  // =========================================================================
  // scanError does not interfere with scanning state
  // =========================================================================
  it('scanError does not affect disabled state when scanning is true', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({
          scanning: true,
          scanError: 'Some error',
        })}
      />,
    );

    const scanBtn = screen.getByRole('button', { name: 'Scan' });
    expect(scanBtn).toBeDisabled();
    expect(scanBtn).toHaveTextContent('Scanning...');
  });

  // =========================================================================
  // scanError=null still renders normally
  // =========================================================================
  it('renders normally when scanError is null', () => {
    render(<GraphViewLayout {...createDefaultProps({ scanError: null })} />);

    expect(screen.getByRole('button', { name: 'Scan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  // =========================================================================
  // scanError undefined still renders normally
  // =========================================================================
  it('renders normally when scanError is undefined', () => {
    render(<GraphViewLayout {...createDefaultProps({ scanError: undefined })} />);

    expect(screen.getByRole('button', { name: 'Scan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument();
  });
});
