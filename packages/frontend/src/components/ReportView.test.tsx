/**
 * Unit tests: ReportView component -- violation statistics and list rendering
 *
 * Tests the extraction of ReportView from App.tsx, verifying violation statistics cards,
 * violation list rendering, and empty/undefined states.
 *
 * Coverage targets (from test-design.md):
 *   - F-28: renders violation statistics cards
 *   - F-29: renders violation list
 *   - F-29a: component has data-testid="report-view"
 *   - R-8: empty violations array renders "no violations"
 *   - R-9: violations undefined renders empty state
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { ViolationInfo } from '../types';
import { ReportView } from './ReportView';

// ---------------------------------------------------------------------------
// Mock i18n
// ---------------------------------------------------------------------------
vi.mock('../i18n', () => ({
  useT: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'report.errors': 'Errors',
        'report.warnings': 'Warnings',
        'report.info': 'Info',
        'report.noViolations': 'No violations found',
        'severity.error': 'ERROR',
        'severity.warn': 'WARN',
        'severity.info': 'INFO',
      };
      return map[key] ?? key;
    },
    lang: 'en',
    setLang: vi.fn(),
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeViolation(overrides: Partial<ViolationInfo> = {}): ViolationInfo {
  return {
    from: 'src/a.ts',
    to: 'src/b.ts',
    rule: 'no-unlisted-dep',
    severity: 'warn',
    message: 'Violation message',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReportView 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-28: renders violation statistics cards
  // ===========================================================================
  it('F-28: 渲染违规统计卡片（错误/警告/信息数量）', () => {
    const violations = [
      makeViolation({ severity: 'error' }),
      makeViolation({ severity: 'error' }),
      makeViolation({ severity: 'warn' }),
      makeViolation({ severity: 'info' }),
    ];
    render(<ReportView violations={violations} />);

    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-29: renders violation list
  // ===========================================================================
  it('F-29: 违规项逐行显示', () => {
    const violations = [
      makeViolation({
        from: 'src/a.ts',
        to: 'src/b.ts',
        rule: 'no-unlisted-dep',
        severity: 'warn',
      }),
      makeViolation({ from: 'src/c.ts', to: 'src/d.ts', rule: 'not-to-dev', severity: 'error' }),
    ];
    render(<ReportView violations={violations} />);

    expect(screen.getByTestId('violation-0')).toBeInTheDocument();
    expect(screen.getByTestId('violation-1')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-29a: component has data-testid="report-view"
  // ===========================================================================
  it('F-29a: 组件包含 data-testid="report-view"', () => {
    render(<ReportView violations={[]} />);

    expect(screen.getByTestId('report-view')).toBeInTheDocument();
  });

  // ===========================================================================
  // R-8: empty violations array renders "no violations" placeholder
  // ===========================================================================
  it('R-8: violations 为空数组时显示无违规提示', () => {
    render(<ReportView violations={[]} />);

    expect(screen.getByText('No violations found')).toBeInTheDocument();
  });

  // ===========================================================================
  // R-9: violations undefined renders empty state (type-safe: empty array fallback)
  // ===========================================================================
  it('R-9: violations 未定义时不抛异常，显示空状态', () => {
    expect(() => {
      render(<ReportView violations={undefined} />);
    }).not.toThrow();
  });
});
