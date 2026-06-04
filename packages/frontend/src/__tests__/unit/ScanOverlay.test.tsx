/**
 * Unit tests: ScanOverlay
 *
 * Tests the ScanOverlay full-screen loading overlay component for the
 * scanning and error states, including visibility, rendering, and callbacks.
 *
 * Coverage targets (from design.md):
 *   - visible=false returns null
 *   - visible=true; status=scanning renders overlay with ScanIcon + loading spinner
 *   - visible=true; status=error renders error message + dismiss button
 *   - Clicking dismiss button triggers onDismiss callback
 *   - Overlay uses position:fixed, inset:0, z-index:9999
 *   - data-testid="scan-overlay"
 *   - Min display time (500ms) for scanning state
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ScanOverlay } from '@/components/ScanOverlay';

// ---------------------------------------------------------------------------
// Mock i18n hook
// ---------------------------------------------------------------------------
vi.mock('@/i18n', () => ({
  useT: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'action.scanning': 'Scanning...',
        'action.scanError': 'Scan failed',
        'action.scanOverlayClose': 'Close',
      };
      return map[key] ?? key;
    },
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock theme hook
// ---------------------------------------------------------------------------
vi.mock('@/theme', () => ({
  useTheme: () => ({
    theme: 'light',
    resolvedTheme: 'light',
    cycleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock ScanIcon component
// ---------------------------------------------------------------------------
vi.mock('@/components/icons', () => ({
  ScanIcon: () => <span data-testid="scan-icon" />,
}));

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
interface PartialProps {
  visible?: boolean;
  status?: 'scanning' | 'error';
  errorMessage?: string | null;
  onDismiss?: (() => void) | undefined;
}

function createProps(overrides: PartialProps = {}) {
  return {
    visible: true,
    status: 'scanning' as const,
    errorMessage: null,
    onDismiss: undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScanOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // visible=false returns null (no DOM rendered)
  // =========================================================================
  it('returns null when visible is false', () => {
    const { container } = render(<ScanOverlay {...createProps({ visible: false })} />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument();
  });

  // =========================================================================
  // visible=true renders overlay with data-testid
  // =========================================================================
  it('renders overlay with data-testid="scan-overlay" when visible is true', () => {
    render(<ScanOverlay {...createProps()} />);

    expect(screen.getByTestId('scan-overlay')).toBeInTheDocument();
  });

  // =========================================================================
  // scanning state shows ScanIcon with spinning class
  // =========================================================================
  it('renders spinning ScanIcon and scanning text when status is scanning', () => {
    render(<ScanOverlay {...createProps({ status: 'scanning' })} />);

    const scanIcon = screen.getByTestId('scan-icon');
    expect(scanIcon).toBeInTheDocument();
    expect(scanIcon.parentElement).toHaveClass('spinning');

    expect(screen.getByText('Scanning...')).toBeInTheDocument();
  });

  // =========================================================================
  // scanning state shows loading spinner
  // =========================================================================
  it('renders loading spinner when status is scanning', () => {
    render(<ScanOverlay {...createProps({ status: 'scanning' })} />);

    const spinner = screen.getByTestId('scan-spinner');
    expect(spinner).toBeInTheDocument();
  });

  // =========================================================================
  // error state shows error message and dismiss button
  // =========================================================================
  it('renders error message and Close button when status is error', () => {
    const onDismiss = vi.fn();
    render(
      <ScanOverlay
        {...createProps({
          status: 'error',
          errorMessage: 'Test error: something went wrong',
          onDismiss,
        })}
      />,
    );

    expect(screen.getByText('Scan failed')).toBeInTheDocument();
    expect(screen.getByText('Test error: something went wrong')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    expect(closeBtn).toBeInTheDocument();
  });

  // =========================================================================
  // clicking dismiss button triggers onDismiss callback
  // =========================================================================
  it('calls onDismiss when Close button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ScanOverlay
        {...createProps({
          status: 'error',
          errorMessage: 'error',
          onDismiss,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // overlay uses position: fixed with inset: 0
  // =========================================================================
  it('has position: fixed and inset: 0 styles', () => {
    render(<ScanOverlay {...createProps({ status: 'scanning' })} />);

    const overlay = screen.getByTestId('scan-overlay');
    expect(overlay).toHaveStyle('position: fixed');
    expect(overlay).toHaveStyle('inset: 0');
  });

  // =========================================================================
  // overlay z-index is 9999
  // =========================================================================
  it('has z-index 9999', () => {
    render(<ScanOverlay {...createProps({ status: 'scanning' })} />);

    const overlay = screen.getByTestId('scan-overlay');
    expect(overlay).toHaveStyle('z-index: 9999');
  });

  // =========================================================================
  // error state does not show spinner or ScanIcon
  // =========================================================================
  it('does not show spinner or ScanIcon in error state', () => {
    render(
      <ScanOverlay
        {...createProps({
          status: 'error',
          errorMessage: 'error',
          onDismiss: vi.fn(),
        })}
      />,
    );

    expect(screen.queryByTestId('scan-spinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scan-icon')).not.toBeInTheDocument();
  });

  // =========================================================================
  // dismiss button not rendered when onDismiss is undefined
  // =========================================================================
  it('does not render Close button when onDismiss is undefined', () => {
    render(
      <ScanOverlay
        {...createProps({
          status: 'error',
          errorMessage: 'error',
          onDismiss: undefined,
        })}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
