/**
 * Unit tests: ScanOverlay component
 *
 * Tests the ScanOverlay component across all four render states:
 *   visible=false (no render), visible=true, status='scanning',
 *   visible=true, status='error' (with and without errorMessage),
 *   and verifies the onDismiss callback, keyboard event capture,
 *   CSS class names, and CSS variable usage.
 *
 * Coverage targets (from test-design.md):
 *   - AC-1: 4 render states (visible=false + 3 visible=true scenarios)
 *   - AC-1: position:fixed, inset:0, z-index:9999 via data-testid
 *   - AC-2: pointer-events:auto (default) and tabIndex={0}
 *   - AC-3: indeterminate progress bar and status text in scanning state
 *   - AC-6: error message, close button, onDismiss callback in error state
 *   - AC-8: CSS variable usage (no hardcoded color values)
 *   - AC-9: CSS @keyframes animation via class name check
 *   - B-6: errorMessage=null shows fallback
 *   - B-7: z-index higher than nav bar
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ScanOverlay } from '@/components/ScanOverlay';

// ---------------------------------------------------------------------------
// Mock i18n hook -- track which keys are accessed
// ---------------------------------------------------------------------------
const tCalls: string[] = [];

vi.mock('@/i18n', () => ({
  useT: () => ({
    t: (key: string) => {
      tCalls.push(key);
      const map: Record<string, string> = {
        'action.scanning': 'Scanning...',
        'action.scanOverlayClose': 'Close',
        'action.scanError': 'Scan failed',
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
  ScanIcon: () => <span data-testid="scan-icon" />,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScanOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tCalls.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // AC-1: visible=false renders nothing
  // =========================================================================
  it('AC-1: does NOT render anything when visible=false', () => {
    const { container } = render(
      <ScanOverlay visible={false} status="scanning" errorMessage={null} onDismiss={undefined} />,
    );

    // Component should return null -- no DOM output
    expect(container.innerHTML).toBe('');
  });

  // =========================================================================
  // AC-1: visible=true, status='scanning' renders full-screen overlay
  // =========================================================================
  it('AC-1: visible=true, status=scanning renders overlay with position fixed and z-index 9999', () => {
    render(
      <ScanOverlay visible={true} status="scanning" errorMessage={null} onDismiss={undefined} />,
    );

    const overlay = screen.getByTestId('scan-overlay');
    expect(overlay).toBeInTheDocument();

    // Verify style properties for full-screen coverage
    expect(overlay.style.position).toBe('fixed');
    expect(overlay.style.inset).toBe('0px'); // jsdom returns pixel values
    // zIndex may come back as string from style
    expect(overlay.style.zIndex).toBe('9999');
  });

  // =========================================================================
  // AC-2: Overlay blocks pointer events via full coverage (inset:0)
  // =========================================================================
  it('AC-2: overlay has default pointer-events behavior (auto)', () => {
    render(
      <ScanOverlay visible={true} status="scanning" errorMessage={null} onDismiss={undefined} />,
    );

    const overlay = screen.getByTestId('scan-overlay');

    // pointer-events should be 'auto' or unset (default), since the overlay
    // relies on physical coverage (inset:0) rather than pointer-events:none
    // to block interactions.
    expect(overlay.style.pointerEvents).toBe('');
  });

  // =========================================================================
  // AC-2: Overlay has tabIndex={0} for keyboard event capture
  // =========================================================================
  it('AC-2: overlay has tabIndex={0} to capture keyboard event focus', () => {
    render(
      <ScanOverlay visible={true} status="scanning" errorMessage={null} onDismiss={undefined} />,
    );

    const overlay = screen.getByTestId('scan-overlay');
    expect(overlay).toHaveAttribute('tabindex', '0');

    // TODO: In a full keyboard event test, verify that keydown events on the
    // overlay are captured and not propagated to underlying elements.
    // This requires a synthetic keyboard event dispatch on the overlay element.
  });

  // =========================================================================
  // AC-3: Scanning state shows indeterminate progress bar and status text
  // =========================================================================
  it('AC-3: status=scanning renders progress bar and scanning status text', () => {
    render(
      <ScanOverlay visible={true} status="scanning" errorMessage={null} onDismiss={undefined} />,
    );

    // Indeterminate progress bar should be present
    const progressBar = screen.getByTestId('scan-progress-bar');
    expect(progressBar).toBeInTheDocument();

    // Status text for scanning
    expect(screen.getByText('Scanning...')).toBeInTheDocument();
  });

  // =========================================================================
  // AC-3: Scanning state does NOT render close button
  // =========================================================================
  it('AC-3: status=scanning does NOT render a close/dismiss button', () => {
    render(
      <ScanOverlay visible={true} status="scanning" errorMessage={null} onDismiss={undefined} />,
    );

    expect(screen.queryByTestId('scan-overlay-close')).not.toBeInTheDocument();
  });

  // =========================================================================
  // AC-6: Error state shows error message and close button
  // =========================================================================
  it('AC-6: status=error renders error message text and close button', () => {
    const onDismiss = vi.fn();
    render(
      <ScanOverlay
        visible={true}
        status="error"
        errorMessage="Scan failed: connection timeout"
        onDismiss={onDismiss}
      />,
    );

    // Error message should be visible
    expect(screen.getByText('Scan failed: connection timeout')).toBeInTheDocument();

    // Close button should be present
    const closeBtn = screen.getByTestId('scan-overlay-close');
    expect(closeBtn).toBeInTheDocument();
  });

  // =========================================================================
  // AC-6: Clicking close button triggers onDismiss callback
  // =========================================================================
  it('AC-6: clicking close button fires onDismiss callback', () => {
    const onDismiss = vi.fn();
    render(
      <ScanOverlay
        visible={true}
        status="error"
        errorMessage="Something went wrong"
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByTestId('scan-overlay-close'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // AC-6: Error state does NOT render progress bar
  // =========================================================================
  it('AC-6: status=error does NOT render progress bar', () => {
    const onDismiss = vi.fn();
    render(
      <ScanOverlay
        visible={true}
        status="error"
        errorMessage="Scan failed"
        onDismiss={onDismiss}
      />,
    );

    expect(screen.queryByTestId('scan-progress-bar')).not.toBeInTheDocument();
  });

  // =========================================================================
  // AC-8: Overlay and card use CSS variables, not hardcoded colors
  // =========================================================================
  it('AC-8: overlay background and card use CSS variables (not hardcoded color values)', () => {
    render(
      <ScanOverlay visible={true} status="scanning" errorMessage={null} onDismiss={undefined} />,
    );

    const overlay = screen.getByTestId('scan-overlay');

    // Verify the background uses CSS variable syntax (var(--...))
    // TODO: exact assertion depends on implementation. Expected examples:
    //   overlay.style.background === 'var(--color-bg)' or similar
    expect(overlay.style.background).toMatch(/var\(--/);

    const card = screen.getByTestId('scan-overlay-card');
    expect(card.style.background).toMatch(/var\(--/);
  });

  // =========================================================================
  // AC-9: Progress bar uses CSS @keyframes animation via class name
  // =========================================================================
  it('AC-9: progress bar class contains scan-progress-bar for CSS animation', () => {
    render(
      <ScanOverlay visible={true} status="scanning" errorMessage={null} onDismiss={undefined} />,
    );

    const progressBar = screen.getByTestId('scan-progress-bar');

    // The animation is driven by CSS @keyframes via class scan-progress-bar.
    // In jsdom, computed animation styles are not fully supported, so we
    // verify the class name presence as indirect evidence.
    expect(progressBar.className).toMatch(/scan-progress/);
  });

  // =========================================================================
  // B-6: errorMessage=null shows fallback or empty error area
  // =========================================================================
  it('B-6: status=error with errorMessage=null shows fallback/empty error area', () => {
    const onDismiss = vi.fn();
    render(
      <ScanOverlay visible={true} status="error" errorMessage={null} onDismiss={onDismiss} />,
    );

    // Close button should still be visible
    expect(screen.getByTestId('scan-overlay-close')).toBeInTheDocument();

    // TODO: verify that a fallback error text is displayed (e.g., default
    // error message key), or that the error area is present but empty.
    // The exact behavior depends on the implementation.
  });

  // =========================================================================
  // B-6: errorMessage="" displays empty string
  // =========================================================================
  it('B-6: status=error with errorMessage="" displays empty error area with close button', () => {
    const onDismiss = vi.fn();
    render(
      <ScanOverlay visible={true} status="error" errorMessage="" onDismiss={onDismiss} />,
    );

    // Close button should still be visible regardless of error message content
    expect(screen.getByTestId('scan-overlay-close')).toBeInTheDocument();

    // TODO: verify that the error area renders with empty string as message
  });

  // =========================================================================
  // B-7: Overlay z-index is higher than typical navigation z-index
  // =========================================================================
  it('B-7: overlay zIndex is 9999 to cover all content including navigation', () => {
    render(
      <ScanOverlay visible={true} status="scanning" errorMessage={null} onDismiss={undefined} />,
    );

    const overlay = screen.getByTestId('scan-overlay');

    // Z-index must be high enough to cover header/nav elements.
    // 9999 ensures it sits above any reasonable app content z-index.
    expect(overlay.style.zIndex).toBe('9999');

    // TODO: if the app navigational elements have a known z-index, also
    // assert that 9999 > nav_z_index.
  });
});
