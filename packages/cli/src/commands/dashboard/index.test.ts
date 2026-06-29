/**
 * Unit tests: commands/dashboard/index.ts -- storageDir 路径构建
 *
 * Mock createServer 调用，验证默认文件发现路径和 serverOptions 传递。
 *
 * Coverage targets (from test-design.md):
 *   - F-9: default storageDir constructs .dc-reporter/scans/ default file
 *   - F-10: custom storageDir constructs custom default file
 *   - F-11: explicit file option overrides storageDir-based default
 *   - B-4: default file does not exist falls back to no file
 *   - B-5: absolute storageDir used directly
 */

import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mockExistsSync = vi.hoisted(() => vi.fn());

const mockCreateServer = vi.hoisted(() =>
  vi.fn(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    port: 3000,
  })),
);

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock('../../server/server.js', () => ({
  createServer: mockCreateServer,
}));

import { dashboard } from './index.js';

describe('dashboard 命令 storageDir 路径构建', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-9: default storageDir constructs .dc-reporter/scans/ default file
  // ===========================================================================
  it('F-9: storageDir 未指定时默认文件路径使用 .dc-reporter/scans/', async () => {
    mockExistsSync.mockReturnValue(true);
    await dashboard({ cwd: '/project' });
    expect(mockCreateServer).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const serverOptions = callArgs[0];
    expect(serverOptions.graphFile).toContain(resolve('/project', '.dc-reporter', 'scans'));
  });

  // ===========================================================================
  // F-10: custom storageDir constructs custom default file
  // ===========================================================================
  it('F-10: 自定义 storageDir 构建自定义默认文件路径', async () => {
    mockExistsSync.mockReturnValue(true);
    await dashboard({ storageDir: '.my-dir', cwd: '/project' });
    expect(mockCreateServer).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const serverOptions = callArgs[0];
    expect(serverOptions.graphFile).toContain(resolve('/project', '.my-dir', 'scans'));
  });

  // ===========================================================================
  // F-11: explicit file option overrides storageDir-based default
  // ===========================================================================
  it('F-11: 显式指定 file 选项时覆盖 storageDir-based 默认路径', async () => {
    await dashboard({ file: '/custom/graph.json', storageDir: '.my-dir', cwd: '/project' });
    expect(mockCreateServer).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const serverOptions = callArgs[0];
    // file is passed as-is (not resolved), so it should match the raw value
    expect(serverOptions.graphFile).toBe('/custom/graph.json');
  });

  // ===========================================================================
  // B-4: default file does not exist falls back to no file
  // ===========================================================================
  it('B-4: 默认文件不存在时 graphFile 为 undefined', async () => {
    mockExistsSync.mockReturnValue(false);
    await dashboard({ cwd: '/project' });
    expect(mockCreateServer).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const serverOptions = callArgs[0];
    expect(serverOptions.graphFile).toBeUndefined();
  });

  // ===========================================================================
  // B-5: absolute storageDir used directly
  // ===========================================================================
  it('B-5: 绝对路径 storageDir 直接用于默认文件路径', async () => {
    mockExistsSync.mockReturnValue(true);
    await dashboard({ storageDir: '/data', cwd: '/project' });
    expect(mockCreateServer).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const serverOptions = callArgs[0];
    expect(serverOptions.graphFile).toContain(resolve('/data', 'scans'));
    expect(serverOptions.graphFile).not.toContain(resolve('/project', 'data'));
  });
});
