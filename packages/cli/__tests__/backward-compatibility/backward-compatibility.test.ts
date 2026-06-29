/**
 * Integration tests: 向后兼容性集成测试
 *
 * 验证不传 --storage-dir 时行为与现有版本完全一致。
 *
 * Coverage targets (from test-design.md):
 *   - F-1 (E2E-s): analyze({ path: '.' }) 不传 storageDir
 *     路径构建为 <cwd>/.dc-reporter/scans/...
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

describe('集成测试 -- 向后兼容性', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-1 (E2E-s): analyze without storageDir uses .dc-reporter
  // ===========================================================================
  it('F-1 (E2E-s): analyze() 不传 storageDir 时使用 .dc-reporter', async () => {
    await analyze({ path: '.' });

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(outputPath).toContain('.dc-reporter');
    expect(outputPath).toContain('scans');
  });
});
