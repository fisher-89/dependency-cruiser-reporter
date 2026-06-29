/**
 * Integration tests: analyze 绝对路径集成测试
 *
 * 验证绝对路径直接使用而非拼接 cwd。
 *
 * Coverage targets (from test-design.md):
 *   - F-3 (E2E-s): analyze({ path: '.', storageDir: '/tmp/data', cwd: '/project' })
 *     使用绝对路径
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

describe('集成测试 -- analyze 绝对路径 storageDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-3 (E2E-s): absolute storageDir used directly
  // ===========================================================================
  it('F-3 (E2E-s): analyze() 绝对路径 storageDir 直接使用', async () => {
    await analyze({ path: '.', storageDir: '/tmp/data', cwd: '/project' });

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(outputPath).toContain(resolve('/tmp', 'data', 'scans'));
    expect(outputPath).not.toContain(resolve('/project', 'tmp'));
  });
});
