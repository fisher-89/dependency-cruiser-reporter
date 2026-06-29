/**
 * Integration tests: analyze 自定义相对路径集成测试
 *
 * mock dependency-cruiser，验证相对路径解析。
 *
 * Coverage targets (from test-design.md):
 *   - F-2 (E2E-s): analyze({ path: '.', storageDir: '.custom', cwd: '/tmp' }) 使用自定义目录
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

describe('集成测试 -- analyze 自定义相对路径 storageDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-2 (E2E-s): custom relative storageDir
  // ===========================================================================
  it('F-2 (E2E-s): analyze() 使用自定义相对路径 storageDir', async () => {
    await analyze({ path: '.', storageDir: '.custom', cwd: '/tmp' });

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(outputPath).toContain(resolve('/tmp', '.custom', 'scans'));
  });
});
