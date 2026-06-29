/**
 * Integration tests: dashboard 默认值集成测试
 *
 * mock createServer，验证默认文件发现路径。
 *
 * Coverage targets (from test-design.md):
 *   - F-9 (E2E-s): dashboard({ cwd: '/tmp' }) 默认 file 路径包含 .dc-reporter
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

describe('集成测试 -- dashboard 默认 storageDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-9 (E2E-s): default storageDir constructs .dc-reporter/scans/ path
  // ===========================================================================
  it('F-9 (E2E-s): dashboard() 默认 file 路径包含 .dc-reporter/scans/', async () => {
    await dashboard({ cwd: '/tmp' });

    expect(mockCreateServer).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const serverOptions = callArgs[0];
    expect(serverOptions.graphFile).toContain(resolve('/tmp', '.dc-reporter', 'scans'));
  });
});
