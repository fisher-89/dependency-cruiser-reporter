/**
 * Unit tests: commands/archi-to-rules/index.ts -- storageDir 参数透传
 *
 * 验证 archiToRules() 入口函数将 storageDir 透传到 action。
 *
 * Coverage targets (from test-design.md):
 *   - F-20: archiToRules command passes storageDir through
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mockArchiToRulesAction = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../../actions/archi-to-rules.js', () => ({
  archiToRules: mockArchiToRulesAction,
}));

import { archiToRules } from './index.js';

describe('archi-to-rules 命令 storageDir 参数透传', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-20: archiToRules command passes storageDir through
  // ===========================================================================
  it('F-20: archi-to-rules 命令将 storageDir 参数透传到 action', async () => {
    const options = { storageDir: '.data', cwd: '.' };
    await archiToRules(options);
    expect(mockArchiToRulesAction).toHaveBeenCalledTimes(1);
    expect(mockArchiToRulesAction).toHaveBeenCalledWith(options);
  });

  it('F-20-2: storageDir 未指定时 action 也正确收到空 options', async () => {
    await archiToRules();
    expect(mockArchiToRulesAction).toHaveBeenCalledWith(undefined);
  });
});
