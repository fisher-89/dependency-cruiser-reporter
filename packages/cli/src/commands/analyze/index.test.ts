/**
 * Unit tests: commands/analyze/index.ts -- storageDir 参数透传
 *
 * 验证 analyze() 入口函数将 storageDir 透传到 action。
 *
 * Coverage targets (from test-design.md):
 *   - F-19: analyze command passes storageDir through
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mockAnalyzeAction = vi.hoisted(() => vi.fn().mockResolvedValue('/path/output.json'));

vi.mock('../../actions/analyze.js', () => ({
  analyze: mockAnalyzeAction,
}));

import { analyze } from './index.js';

describe('analyze 命令 storageDir 参数透传', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-19: analyze command passes storageDir through
  // ===========================================================================
  it('F-19: analyze 命令将 storageDir 参数透传到 action', async () => {
    const options = { path: '.', storageDir: '.data', cwd: '.' };
    await analyze(options);
    expect(mockAnalyzeAction).toHaveBeenCalledTimes(1);
    expect(mockAnalyzeAction).toHaveBeenCalledWith(options);
  });

  it('F-19-2: storageDir 未指定时 action 也正确收到参数', async () => {
    const options = { path: '.' };
    await analyze(options);
    expect(mockAnalyzeAction).toHaveBeenCalledWith(options);
  });
});
