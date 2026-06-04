/**
 * Unit tests: i18n -- new translation keys
 *
 * Verifies that the new `action.scanOverlayClose` translation key exists
 * in both en.ts and zh-CN.ts with non-empty string values.
 *
 * Coverage targets (from test-design.md):
 *   - action.scanOverlayClose exists in en.ts (non-empty string)
 *   - action.scanOverlayClose exists in zh-CN.ts (non-empty string)
 *
 * These are pure data validation tests -- no DOM or mock needed.
 */

import { describe, expect, it } from 'vite-plus/test';

import en from '@/i18n/en';
import zhCN from '@/i18n/zh-CN';

describe('i18n -- action.scanOverlayClose', () => {
  // =========================================================================
  // en.ts: action.scanOverlayClose exists and is non-empty
  // =========================================================================
  it('en.ts: action.scanOverlayClose exists and is a non-empty string', () => {
    // Access the nested key path
    const value = (en.action as Record<string, string>).scanOverlayClose;

    expect(value).toBeDefined();
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // zh-CN.ts: action.scanOverlayClose exists and is non-empty
  // =========================================================================
  it('zh-CN.ts: action.scanOverlayClose exists and is a non-empty string', () => {
    const value = (zhCN.action as Record<string, string>).scanOverlayClose;

    expect(value).toBeDefined();
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
  });
});
