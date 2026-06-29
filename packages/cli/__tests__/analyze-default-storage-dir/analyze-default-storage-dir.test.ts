/**
 * Integration tests: analyze 默认值集成测试
 *
 * 通过 analyze() 编程式 API 调用，mock dependency-cruiser 避免实际扫描，
 * 验证默认 storageDir 路径构建。
 *
 * Coverage targets (from test-design.md):
 *   - F-1 (E2E-s): analyze({ path: '.', cwd: '/tmp' }) 默认使用 .dc-reporter
 */

import { writeFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('dependency-cruiser', () => ({
  cruise: vi.fn().mockResolvedValue({ output: JSON.stringify({ modules: [] }) }),
}));
vi.mock('dependency-cruiser/config-utl/extract-depcruise-options', () => ({
  default: vi.fn().mockResolvedValue({}),
}));
vi.mock('dependency-cruiser/config-utl/extract-ts-config', () => ({
  default: vi.fn().mockResolvedValue({}),
}));
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { analyze } from '../../src/actions/analyze.js';

describe('集成测试 -- analyze 默认 storageDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-1 (E2E-s): default storageDir constructs .dc-reporter/scans/ path
  // ===========================================================================
  it('F-1 (E2E-s): analyze() 默认使用 .dc-reporter 目录', async () => {
    await analyze({ path: '.', cwd: '/tmp' });

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(outputPath).toContain('.dc-reporter');
    expect(outputPath).toContain('scans');
  });
});
