/**
 * Integration tests: dashboard() 文件发现幂等性集成测试
 *
 * mock createServer 追踪参数，mock readdirSync 和 existsSync 控制文件发现结果。
 * 验证重复调用时扫描文件发现结果相同。
 *
 * Coverage targets (from test-design.md):
 *   - I-7: dashboard() discovers same files on repeated call
 *   - I-8: dashboard() does not accumulate duplicate file entries
 */

import { existsSync, readdirSync } from 'node:fs';
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
  readdirSync: vi.fn().mockReturnValue(['src-graph.json', 'lib-graph.json', 'test-graph.json']),
}));

import { dashboard } from '../../src/commands/dashboard/index.js';

describe('幂等性测试 -- dashboard() 文件发现', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // I-7: dashboard() discovers same files on repeated call
  // ===========================================================================
  it('I-7: dashboard() 重复调用发现的 graphFile 值相同', async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
      'src-graph.json',
      'lib-graph.json',
      'test-graph.json',
    ]);

    await dashboard({ storageDir: '/tmp/data', cwd: '/project' });
    const callArgs1 = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const graphFile1 = callArgs1[0].graphFile;

    vi.clearAllMocks();
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
      'src-graph.json',
      'lib-graph.json',
      'test-graph.json',
    ]);

    await dashboard({ storageDir: '/tmp/data', cwd: '/project' });
    const callArgs2 = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const graphFile2 = callArgs2[0].graphFile;

    expect(graphFile1).toEqual(graphFile2);
  });

  // ===========================================================================
  // I-8: dashboard() does not accumulate duplicate file entries
  // ===========================================================================
  it('I-8: dashboard() 重复调用不重复发现文件', async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (readdirSync as ReturnType<typeof vi.fn>).mockReturnValue(['src-graph.json']);

    await dashboard({ storageDir: '/tmp/data', cwd: '/project' });
    const callArgs1 = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const graphFile1 = callArgs1[0].graphFile;

    vi.clearAllMocks();
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (readdirSync as ReturnType<typeof vi.fn>).mockReturnValue(['src-graph.json']);

    await dashboard({ storageDir: '/tmp/data', cwd: '/project' });
    const callArgs2 = mockCreateServer.mock.calls[0] as unknown as [Record<string, unknown>];
    const graphFile2 = callArgs2[0].graphFile;

    // Same result (no accumulation)
    expect(graphFile1).toEqual(graphFile2);
    // Not an array (no duplicate file entries)
    expect(Array.isArray(graphFile1)).toBe(false);
  });
});
