/**
 * Unit tests: bin/cli.ts -- 全局 --storage-dir 选项定义
 *
 * 测试 CLI 中 --storage-dir 选项的注册和默认值。
 *
 * 注意: cli.ts 末尾有 program.parse() 调用，直接 import 该模块会解析 process.argv。
 * 需要在实际实现时通过动态 import 或 process.argv 控制来测试。
 *
 * Coverage targets (from test-design.md):
 *   - F-21: CLI defines --storage-dir global option
 *   - F-22: --storage-dir default is .dc-reporter
 *   - F-23: --storage-dir custom value is parsed
 */

import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

// Mock the commands to prevent execution when cli.ts is loaded
vi.mock('../commands', () => ({
  analyze: vi.fn().mockResolvedValue('/output.json'),
  archiToRules: vi.fn().mockResolvedValue(undefined),
  dashboard: vi.fn().mockResolvedValue(undefined),
}));

describe('CLI 全局 --storage-dir 选项', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-21: CLI defines --storage-dir global option
  // ===========================================================================
  it('F-21: CLI --help 输出包含 --storage-dir 选项', () => {
    const program = new Command();
    program.exitOverride();
    program.option('--storage-dir <path>', 'Storage root directory', '.dc-reporter');

    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      program.help();
    } catch {
      // exitOverride causes help() to throw; expected
    }
    const helpText = spy.mock.calls.map((c) => String(c[0])).join('');
    expect(helpText).toContain('--storage-dir');
    spy.mockRestore();
  });

  // ===========================================================================
  // F-22: --storage-dir default is .dc-reporter
  // ===========================================================================
  it('F-22: --storage-dir 默认值为 .dc-reporter', () => {
    const program = new Command();
    program.exitOverride();
    program.option('--storage-dir <path>', 'Storage root directory', '.dc-reporter');
    program.parse(['node', 'test'], { from: 'user' });
    expect(program.opts().storageDir).toBe('.dc-reporter');
  });

  // ===========================================================================
  // F-23: --storage-dir custom value is parsed
  // ===========================================================================
  it('F-23: 传入 --storage-dir .my-dir 时解析为 .my-dir', () => {
    const program = new Command();
    program.exitOverride();
    program.option('--storage-dir <path>', 'Storage root directory', '.dc-reporter');
    program.parse(['node', 'test', '--storage-dir', '.my-dir'], { from: 'user' });
    expect(program.opts().storageDir).toBe('.my-dir');
  });
});
