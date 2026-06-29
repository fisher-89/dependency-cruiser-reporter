/**
 * Integration tests: --cwd 与 --storage-dir 交互集成测试
 *
 * 验证 --cwd 与 --storage-dir 组合使用时路径解析正确性。
 *
 * Coverage targets (from test-design.md):
 *   - F-4 (E2E-s): analyze({ path: '.', storageDir: '.data', cwd: '/workspace/packages/core' })
 *     writeFileSync 写入路径为 /workspace/packages/core/.data/scans/
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

describe('集成测试 -- --cwd 与 --storage-dir 交互', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-4 (E2E-s): storageDir resolves relative to cwd
  // ===========================================================================
  it('F-4 (E2E-s): storageDir 基于 cwd 正确解析', async () => {
    await analyze({ path: '.', storageDir: '.data', cwd: '/workspace/packages/core' });

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(outputPath).toBe(
      resolve('/workspace/packages/core', '.data', 'scans', 'core-graph.json'),
    );
  });
});
