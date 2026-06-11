/**
 * Test skeleton: i18n -- stabilityHeatmap 翻译键
 *
 * Verifies that the `action.stabilityHeatmap` translation key exists
 * in both en.ts and zh-CN.ts with the correct string values.
 *
 * Coverage targets (from test-design.md):
 *   - AC-9: 切换按钮显示正确的 i18n 文本
 *   - F-20: en.ts action.stabilityHeatmap is "Heatmap"
 *   - F-21: zh-CN.ts action.stabilityHeatmap is "稳定性热力图"
 */

import { describe, expect, it } from 'vite-plus/test';

import en from '@/i18n/en';
import zhCN from '@/i18n/zh-CN';

describe('i18n -- action.stabilityHeatmap', () => {
  // =========================================================================
  // F-20: en.ts action.stabilityHeatmap is "Heatmap"
  // =========================================================================
  it('F-20: en.ts action.stabilityHeatmap 应为 "Heatmap"', () => {
    const value = (en.action as Record<string, string>).stabilityHeatmap;

    expect(value).toBeDefined();
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
    expect(value).toBe('Heatmap');
  });

  // =========================================================================
  // F-21: zh-CN.ts action.stabilityHeatmap is "稳定性热力图"
  // =========================================================================
  it('F-21: zh-CN.ts action.stabilityHeatmap 应为 "稳定性热力图"', () => {
    const value = (zhCN.action as Record<string, string>).stabilityHeatmap;

    expect(value).toBeDefined();
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
    expect(value).toBe('稳定性热力图');
  });
});
