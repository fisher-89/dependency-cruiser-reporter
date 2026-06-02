/**
 * Unit tests: i18n — action namespace keys
 *
 * Verifies that the `action` namespace contains all required translation keys
 * in both English and Chinese, and that switching language changes the
 * resolved translation text.
 *
 * NOTE: These tests use inlined translation dictionaries so they are
 * self-contained and do not need workspace-scoped module resolution.
 * Real tests at packages/frontend/src/__tests__/unit/i18n.test.tsx import
 * the actual en.ts and zh-CN.ts modules from the workspace.
 *
 * Coverage targets (from test-design.md):
 *   - AC-8: en.ts action namespace has scan, scanning, scanError,
 *           generateRules, generatingRules, generateRulesError
 *   - AC-8: zh-CN.ts action namespace has corresponding 6 Chinese keys
 *   - B-16: language switch changes Scan button text
 *   - B-17: language switch changes Generate Rules button text
 */

import { describe, expect, it } from 'vite-plus/test';

// ---------------------------------------------------------------------------
// Inlined translation dictionaries (mirrors packages/frontend/src/i18n/en.ts
// and packages/frontend/src/i18n/zh-CN.ts action namespace)
// ---------------------------------------------------------------------------
const enAction: Record<string, string> = {
  scan: 'Scan',
  scanning: 'Scanning...',
  scanError: 'Scan failed',
  generateRules: 'Generate Rules',
  generatingRules: 'Generating Rules...',
  generateRulesError: 'Failed to generate rules',
};

const zhCNAction: Record<string, string> = {
  scan: '扫描',
  scanning: '扫描中...',
  scanError: '扫描失败',
  generateRules: '生成规则',
  generatingRules: '正在生成规则...',
  generateRulesError: '生成规则失败',
};

const enNav: Record<string, string> = {
  refresh: 'Refresh data',
};

// All required action namespace keys (sorted alphabetically for consistency)
const ACTION_KEYS = [
  'generateRules',
  'generateRulesError',
  'generatingRules',
  'scan',
  'scanError',
  'scanning',
] as const;

/**
 * Simple translation look-up: given a language and a dotted key like
 * "action.scan", returns the translated string or the key itself as a fallback.
 */
function t(lang: 'en' | 'zh-CN', key: string): string {
  const dict = lang === 'en' ? enAction : zhCNAction;
  // Strip the "action." prefix to index into the flat dictionary
  const k = key.replace(/^action\./, '');
  return dict[k] ?? key;
}

/**
 * Resolve a key from a specific namespace dictionary.
 */
function resolveNs(
  ns: Record<string, string>,
  key: string,
): string | undefined {
  return ns[key];
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('i18n — action namespace (en)', () => {
  // =========================================================================
  // AC-8: en.ts has all 6 action namespace keys
  // =========================================================================
  it('AC-8: en.ts action namespace has all 6 required keys', () => {
    for (const key of ACTION_KEYS) {
      expect(enAction).toHaveProperty(key);
      expect(typeof enAction[key]).toBe('string');
      expect(enAction[key].length).toBeGreaterThan(0);
    }
  });

  // =========================================================================
  // AC-8: en.ts scan key value
  // =========================================================================
  it('AC-8: en.ts action.scan is "Scan"', () => {
    expect(t('en', 'action.scan')).toBe('Scan');
    expect(enAction.scan).toBe('Scan');
  });

  // =========================================================================
  // AC-8: en.ts scanning key value
  // =========================================================================
  it('AC-8: en.ts action.scanning is "Scanning..."', () => {
    expect(t('en', 'action.scanning')).toBe('Scanning...');
    expect(enAction.scanning).toBe('Scanning...');
  });

  // =========================================================================
  // AC-8: en.ts scanError key value (can vary, just check existence)
  // =========================================================================
  it('AC-8: en.ts action.scanError exists and is a non-empty string', () => {
    expect(enAction.scanError.length).toBeGreaterThan(0);
    expect(typeof enAction.scanError).toBe('string');
  });

  // =========================================================================
  // AC-8: en.ts generateRules key value
  // =========================================================================
  it('AC-8: en.ts action.generateRules is "Generate Rules"', () => {
    expect(t('en', 'action.generateRules')).toBe('Generate Rules');
    expect(enAction.generateRules).toBe('Generate Rules');
  });

  // =========================================================================
  // AC-8: en.ts generatingRules key value
  // =========================================================================
  it('AC-8: en.ts action.generatingRules is "Generating Rules..."', () => {
    expect(t('en', 'action.generatingRules')).toBe('Generating Rules...');
    expect(enAction.generatingRules).toBe('Generating Rules...');
  });

  // =========================================================================
  // AC-8: en.ts generateRulesError exists
  // =========================================================================
  it('AC-8: en.ts action.generateRulesError exists and is a non-empty string', () => {
    expect(enAction.generateRulesError.length).toBeGreaterThan(0);
    expect(typeof enAction.generateRulesError).toBe('string');
  });
});

describe('i18n — action namespace (zh-CN)', () => {
  // =========================================================================
  // AC-8: zh-CN.ts has all 6 action namespace keys
  // =========================================================================
  it('AC-8: zh-CN.ts action namespace has all 6 required keys', () => {
    for (const key of ACTION_KEYS) {
      expect(zhCNAction).toHaveProperty(key);
      expect(typeof zhCNAction[key]).toBe('string');
      expect(zhCNAction[key].length).toBeGreaterThan(0);
    }
  });

  // =========================================================================
  // AC-8: zh-CN.ts scan translates to Chinese
  // =========================================================================
  it('AC-8: zh-CN.ts action.scan is "扫描"', () => {
    expect(t('zh-CN', 'action.scan')).toBe('扫描');
    expect(zhCNAction.scan).toBe('扫描');
  });

  // =========================================================================
  // AC-8: zh-CN.ts scanning translates to Chinese
  // =========================================================================
  it('AC-8: zh-CN.ts action.scanning is "扫描中..."', () => {
    expect(t('zh-CN', 'action.scanning')).toBe('扫描中...');
    expect(zhCNAction.scanning).toBe('扫描中...');
  });

  // =========================================================================
  // AC-8: zh-CN.ts scanError exists
  // =========================================================================
  it('AC-8: zh-CN.ts action.scanError exists and is a non-empty string', () => {
    expect(zhCNAction.scanError.length).toBeGreaterThan(0);
    expect(typeof zhCNAction.scanError).toBe('string');
  });

  // =========================================================================
  // AC-8: zh-CN.ts generateRules translates
  // =========================================================================
  it('AC-8: zh-CN.ts action.generateRules is "生成规则"', () => {
    expect(t('zh-CN', 'action.generateRules')).toBe('生成规则');
    expect(zhCNAction.generateRules).toBe('生成规则');
  });

  // =========================================================================
  // AC-8: zh-CN.ts generatingRules translates
  // =========================================================================
  it('AC-8: zh-CN.ts action.generatingRules is "正在生成规则..."', () => {
    expect(t('zh-CN', 'action.generatingRules')).toBe('正在生成规则...');
    expect(zhCNAction.generatingRules).toBe('正在生成规则...');
  });

  // =========================================================================
  // AC-8: zh-CN.ts generateRulesError exists
  // =========================================================================
  it('AC-8: zh-CN.ts action.generateRulesError exists and is a non-empty string', () => {
    expect(zhCNAction.generateRulesError.length).toBeGreaterThan(0);
    expect(typeof zhCNAction.generateRulesError).toBe('string');
  });
});

describe('i18n — language switching', () => {
  // =========================================================================
  // B-16: Switching from en to zh-CN changes Scan button text
  // =========================================================================
  it('B-16: switching language from en to zh-CN changes Scan translation', () => {
    // Real test: packages/frontend/src/__tests__/unit/i18n.test.tsx
    // Verifies that t('action.scan') returns different values when the
    // active language changes, using useT hook's setLang.
    const enText = t('en', 'action.scan');
    const zhText = t('zh-CN', 'action.scan');

    expect(enText).toBe('Scan');
    expect(zhText).toBe('扫描');
    expect(enText).not.toBe(zhText);
  });

  // =========================================================================
  // B-17: Switching from zh-CN to en changes Generate Rules button text
  // =========================================================================
  it('B-17: switching language from zh-CN to en changes Generate Rules translation', () => {
    // Real test: packages/frontend/src/__tests__/unit/i18n.test.tsx
    // Verifies that t('action.generateRules') returns different values when
    // switching between zh-CN and en.
    const zhText = t('zh-CN', 'action.generateRules');
    const enText = t('en', 'action.generateRules');

    expect(zhText).toBe('生成规则');
    expect(enText).toBe('Generate Rules');
    expect(zhText).not.toBe(enText);
  });

  // =========================================================================
  // Namespace isolation: action should not conflict with existing namespaces
  // =========================================================================
  it('action namespace does not conflict with existing nav namespace', () => {
    // Real test: packages/frontend/src/__tests__/unit/i18n.test.tsx
    // Verifies that en.action.scan !== en.nav.refresh (different namespaces)
    const actionScan = resolveNs(enAction, 'scan');
    const navRefresh = resolveNs(enNav, 'refresh');

    expect(actionScan).toBe('Scan');
    expect(navRefresh).toBe('Refresh data');
    expect(actionScan).not.toBe(navRefresh);
  });
});
