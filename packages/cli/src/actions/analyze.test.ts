/**
 * Unit tests: analyze.ts -- analyze() storageDir 路径构建
 *
 * Mock dependency-cruiser 和文件系统操作，验证输出路径构建逻辑：
 * - 默认 storageDir 构建 .dc-reporter/scans/ 路径
 * - 自定义相对路径 storageDir 构建自定义路径
 * - 绝对路径 storageDir 直接使用
 * - storageDir 基于 cwd 解析
 * - 显式 output 覆盖 storageDir 默认路径
 *
 * Coverage targets (from test-design.md):
 *   - F-1: default storageDir constructs .dc-reporter/scans/ path
 *   - F-2: custom relative storageDir constructs correct path
 *   - F-3: absolute storageDir is used directly
 *   - F-4: storageDir resolves relative to cwd
 *   - R-2: explicit output overrides storageDir default
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

// Mock dependency-cruiser modules before imports
vi.mock('dependency-cruiser', () => ({
  cruise: vi.fn().mockResolvedValue({ output: JSON.stringify({ modules: [] }) }),
}));

vi.mock('dependency-cruiser/config-utl/extract-depcruise-options', () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock('dependency-cruiser/config-utl/extract-ts-config', () => ({
  default: vi.fn().mockResolvedValue({}),
}));

import { analyze } from './analyze.js';

// ---------------------------------------------------------------------------
// Mock fs operations
// ---------------------------------------------------------------------------
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('analyze() storageDir 路径构建', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-1: default storageDir constructs .dc-reporter/scans/ path
  // ===========================================================================
  it('F-1: storageDir 未指定时默认使用 .dc-reporter/scans/ 路径', async () => {
    await analyze({ path: '.', cwd: '/project' });
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(outputPath).toContain(resolve('/project', '.dc-reporter', 'scans'));
  });

  // ===========================================================================
  // F-2: custom relative storageDir constructs correct path
  // ===========================================================================
  it('F-2: 自定义相对路径 storageDir 构建正确输出路径', async () => {
    await analyze({ path: '.', storageDir: '.my-dir', cwd: '/project' });
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(outputPath).toContain(resolve('/project', '.my-dir', 'scans'));
  });

  // ===========================================================================
  // F-3: absolute storageDir is used directly
  // ===========================================================================
  it('F-3: 绝对路径 storageDir 直接使用不拼接 cwd', async () => {
    await analyze({ path: '.', storageDir: '/tmp/data', cwd: '/project' });
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(outputPath).toContain(resolve('/tmp', 'data', 'scans'));
    expect(outputPath).not.toContain(resolve('/project', 'tmp'));
  });

  // ===========================================================================
  // F-4: storageDir resolves relative to cwd
  // ===========================================================================
  it('F-4: storageDir 基于 cwd 正确解析', async () => {
    await analyze({ path: '.', storageDir: '.data', cwd: '/workspace/packages/core' });
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(outputPath).toBe(
      resolve('/workspace/packages/core', '.data', 'scans', 'core-graph.json'),
    );
  });

  // ===========================================================================
  // R-2: explicit output overrides storageDir default
  // ===========================================================================
  it('R-2: 显式指定 output 时不受 storageDir 影响', async () => {
    await analyze({
      path: '.',
      output: '/custom/output.json',
      storageDir: '.my-dir',
      cwd: '/project',
    });
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // output is passed as-is (not resolved), so it should match the raw value
    expect(outputPath).toBe('/custom/output.json');
  });

  // ===========================================================================
  // Edge: writeFileSync 被调用时目录不存在则创建
  // ===========================================================================
  it('B-5: 输出目录不存在时自动创建', async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await analyze({ path: '.', storageDir: '.data', cwd: '/project' });
    expect(mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining(resolve('/project', '.data', 'scans')),
      expect.objectContaining({ recursive: true }),
    );
  });
});
