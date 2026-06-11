/**
 * Test skeleton: GraphViewLayout -- 热力图切换按钮
 *
 * Tests the stability heatmap toggle button in GraphViewLayout:
 *   - Button renders with i18n text
 *   - ON/OFF visual distinction (active style)
 *   - Click calls onStabilityHeatmapChange with toggled value
 *   - Scanning state does not affect toggle
 *   - Undefined callback does not crash
 *
 * Coverage targets (from test-design.md):
 *   - AC-5: 热力图默认关闭
 *   - AC-6: 点击切换按钮，节点显示阴影（按钮交互部分）
 *   - AC-9: 切换按钮显示正确的 i18n 文本
 *   - F-15, F-16, F-17: Forward ACs
 *   - R-12, R-13: Reverse ACs
 *   - B-27, B-29: Boundary cases
 */

import { fireEvent, render, screen } from '@testing-library/react';
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
        'action.stabilityHeatmap': 'Heatmap',
        'nav.refresh': 'Refresh data',
      };
      return map[key] ?? key;
    },
  }),
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
    children: <div data-testid="child-content">Child content</div>,
    stabilityHeatmap: false,
    onStabilityHeatmapChange: vi.fn(),
    ...overrides,
  } as Parameters<typeof GraphViewLayout>[0];
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

describe('GraphViewLayout -- 热力图切换按钮', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = mockFetchHanging();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // F-15: renders heatmap toggle button with i18n text in action bar
  // =========================================================================
  it('F-15: 应渲染热力图切换按钮，显示 i18n 文本 "Heatmap"', () => {
    render(<GraphViewLayout {...createDefaultProps()} />);

    const heatmapBtn = screen.getByRole('button', { name: 'Heatmap' });
    expect(heatmapBtn).toBeInTheDocument();
    expect(heatmapBtn).toHaveTextContent('Heatmap');
  });

  // =========================================================================
  // F-16: heatmap ON activates accent style, OFF uses default
  // =========================================================================
  it('F-16: 热力图开启时按钮应有激活样式，关闭时为默认样式', () => {
    // TODO: Check that the button has an "active" CSS class or style
    // when stabilityHeatmap=true, and does NOT have it when false.
    //
    // The production code applies `styles.actionBtnActive` when true:
    //   border: 1px solid var(--color-accent)
    //   background: var(--color-accent-bg)
    //   color: var(--color-accent)
    //
    // aria-pressed attribute should also reflect the state.

    const { rerender } = render(
      <GraphViewLayout {...createDefaultProps({ stabilityHeatmap: false })} />,
    );

    const btn = screen.getByRole('button', { name: 'Heatmap' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');

    rerender(<GraphViewLayout {...createDefaultProps({ stabilityHeatmap: true })} />);

    expect(screen.getByRole('button', { name: 'Heatmap' })).toHaveAttribute('aria-pressed', 'true');
  });

  // =========================================================================
  // F-17: clicking toggle calls onStabilityHeatmapChange with !stabilityHeatmap
  // =========================================================================
  it('F-17: 点击切换按钮应调用 onStabilityHeatmapChange 并传入相反值', () => {
    const onStabilityHeatmapChange = vi.fn();

    // Test OFF -> ON
    const { rerender } = render(
      <GraphViewLayout
        {...createDefaultProps({
          stabilityHeatmap: false,
          onStabilityHeatmapChange,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Heatmap' }));
    expect(onStabilityHeatmapChange).toHaveBeenCalledWith(true);

    onStabilityHeatmapChange.mockClear();

    // Test ON -> OFF
    rerender(
      <GraphViewLayout
        {...createDefaultProps({
          stabilityHeatmap: true,
          onStabilityHeatmapChange,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Heatmap' }));
    expect(onStabilityHeatmapChange).toHaveBeenCalledWith(false);
  });

  // =========================================================================
  // R-12: scanning=true does not disable or affect heatmap toggle
  // =========================================================================
  it('R-12: 扫描状态不应影响热力图切换按钮（仍可点击）', async () => {
    const onStabilityHeatmapChange = vi.fn();
    render(
      <GraphViewLayout
        {...createDefaultProps({
          stabilityHeatmap: false,
          onStabilityHeatmapChange,
        })}
      />,
    );

    // Click Scan to start scanning (fetch hangs, keeps scanning=true)
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));

    // Heatmap button should remain enabled
    const heatmapBtn = screen.getByRole('button', { name: 'Heatmap' });
    expect(heatmapBtn).toBeEnabled();

    // Clicking heatmap while scanning should still work
    fireEvent.click(heatmapBtn);
    expect(onStabilityHeatmapChange).toHaveBeenCalledWith(true);
  });

  // =========================================================================
  // R-13: rendering with onStabilityHeatmapChange undefined does not crash
  // =========================================================================
  it('R-13: onStabilityHeatmapChange 为 undefined 时不崩溃', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({
          onStabilityHeatmapChange: undefined,
        })}
      />,
    );

    // Button should render without crashing
    const heatmapBtn = screen.getByRole('button', { name: 'Heatmap' });
    expect(heatmapBtn).toBeInTheDocument();

    // Click should not throw
    expect(() => fireEvent.click(heatmapBtn)).not.toThrow();
  });

  // =========================================================================
  // B-27: stabilityHeatmap undefined renders as OFF (default style)
  // =========================================================================
  it('B-27: stabilityHeatmap 为 undefined 时应视为关闭状态', () => {
    render(
      <GraphViewLayout
        {...createDefaultProps({
          stabilityHeatmap: undefined,
        })}
      />,
    );

    const heatmapBtn = screen.getByRole('button', { name: 'Heatmap' });
    // When stabilityHeatmap is undefined, aria-pressed should be false (coerced by !!)
    expect(heatmapBtn).toHaveAttribute('aria-pressed', 'false');
  });

  // =========================================================================
  // B-29: heatmap state persists across scanning state changes
  // =========================================================================
  it('B-29: 热力图状态应在扫描状态切换时保持不变', async () => {
    const onStabilityHeatmapChange = vi.fn();
    const { rerender } = render(
      <GraphViewLayout
        {...createDefaultProps({
          stabilityHeatmap: true,
          onStabilityHeatmapChange,
        })}
      />,
    );

    // Heatmap is ON
    expect(screen.getByRole('button', { name: 'Heatmap' })).toHaveAttribute('aria-pressed', 'true');

    // Start scanning
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));

    // Heatmap should still be ON
    expect(screen.getByRole('button', { name: 'Heatmap' })).toHaveAttribute('aria-pressed', 'true');

    // Rerender (simulate state change from scan completing)
    rerender(
      <GraphViewLayout
        {...createDefaultProps({
          stabilityHeatmap: true,
          onStabilityHeatmapChange,
        })}
      />,
    );

    // Heatmap still ON
    expect(screen.getByRole('button', { name: 'Heatmap' })).toHaveAttribute('aria-pressed', 'true');
  });
});
