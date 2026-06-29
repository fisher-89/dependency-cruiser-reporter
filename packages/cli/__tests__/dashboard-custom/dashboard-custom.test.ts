/**
 * Integration tests: dashboard 自定义路径集成测试
 *
 * mock createServer，验证自定义路径。
 *
 * Coverage targets (from test-design.md):
 *   - F-10 (E2E-s): dashboard({ storageDir: '.my-dir', cwd: '/tmp' })
 *     使用自定义目录
 */

import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mockCreateServer = vi.hoisted(() =>
  vi.fn(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    port: 3000,
  })),
);

vi.mock('../../src/server/server.js', () => ({
  createServer: mockCreateServer,
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

import { dashboard } from '../../src/commands/dashboard/index.js';

describe('集成测试 -- dashboard 自定义 storageDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-10 (E2E-s): custom storageDir constructs custom default file
  // ===========================================================================
  it('F-10 (E2E-s): dashboard() 自定义 storageDir 构建自定义文件路径', async () => {
    await dashboard({ storageDir: '.my-dir', cwd: '/tmp' });

    expect(mockCreateServer).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const serverOptions = callArgs[0];
    expect(serverOptions.graphFile).toContain(resolve('/tmp', '.my-dir', 'scans'));
  });
});
