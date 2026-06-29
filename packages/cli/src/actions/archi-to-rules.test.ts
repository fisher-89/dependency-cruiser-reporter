/**
 * Unit tests: archi-to-rules.ts -- archiToRules() storageDir 路径构建
 *
 * Mock C4 模型和文件系统，验证 archDir 和 output 路径构建：
 * - 默认 storageDir 构建 .dc-reporter/architecture/ archDir
 * - 自定义 storageDir 构建自定义 archDir
 * - 默认 storageDir 构建 .dc-reporter/archi-rules.json output
 * - 自定义 storageDir 构建自定义 output 路径
 * - 显式 output 覆盖 storageDir-based default
 *
 * Coverage targets (from test-design.md):
 *   - F-5: default storageDir constructs .dc-reporter/architecture/ archDir
 *   - F-6: custom storageDir constructs custom archDir
 *   - F-7: default storageDir constructs .dc-reporter/archi-rules.json output
 *   - F-8: custom storageDir constructs custom output path
 *   - R-3: explicit output overrides storageDir-based default
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue('{}'),
  readdirSync: vi.fn().mockReturnValue(['main.c4']),
}));

vi.mock('@likec4/language-services/node', () => ({
  fromSources: vi.fn().mockResolvedValue({
    hasErrors: vi.fn().mockReturnValue(false),
    getErrors: vi.fn().mockReturnValue([]),
    syncComputedModel: vi.fn().mockReturnValue({
      $data: {
        elements: {},
        relations: {},
      },
    }),
  }),
}));

import { archiToRules } from './archi-to-rules.js';

describe('archiToRules() storageDir 路径构建', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-5: default storageDir constructs .dc-reporter/architecture/ archDir
  // ===========================================================================
  it('F-5: storageDir 未指定时 archDir 默认使用 .dc-reporter/architecture/', async () => {
    await archiToRules({ cwd: '/project' });
    // readdirSync 应该被调用以读取 architecture 目录
    const readdirCalls = (readdirSync as ReturnType<typeof vi.fn>).mock.calls;
    const archDirCall = readdirCalls.find((call: string[]) => call[0]?.includes?.('architecture'));
    expect(archDirCall).toBeDefined();
  });

  // ===========================================================================
  // F-6: custom storageDir constructs custom archDir
  // ===========================================================================
  it('F-6: 自定义 storageDir 构建自定义 archDir', async () => {
    await archiToRules({ storageDir: '.arch', cwd: '/project' });
    const readdirCalls = (readdirSync as ReturnType<typeof vi.fn>).mock.calls;
    const archDirCall = readdirCalls.find((call: string[]) =>
      call[0]?.includes?.(`.arch${sep}architecture`),
    );
    expect(archDirCall).toBeDefined();
  });

  // ===========================================================================
  // F-7: default storageDir constructs .dc-reporter/archi-rules.json output
  // ===========================================================================
  it('F-7: storageDir 未指定时 output 默认使用 .dc-reporter/archi-rules.json', async () => {
    await archiToRules({ cwd: '/project' });
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const outputPath = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(outputPath).toContain(resolve('/project', '.dc-reporter', 'archi-rules.json'));
  });

  // ===========================================================================
  // F-8: custom storageDir constructs custom output path
  // ===========================================================================
  it('F-8: 自定义 storageDir 构建自定义 output 路径', async () => {
    await archiToRules({ storageDir: '.arch', cwd: '/project' });
    expect(writeFileSync).toHaveBeenCalled();
    const writeCalls = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls;
    const rulesCall = writeCalls.find((call: string[]) => call[0]?.includes?.('archi-rules.json'));
    expect(rulesCall).toBeDefined();
    if (rulesCall) {
      expect(rulesCall[0]).toContain(resolve('/project', '.arch', 'archi-rules.json'));
    }
  });

  // ===========================================================================
  // R-3: explicit output overrides storageDir-based default
  // ===========================================================================
  it('R-3: 显式指定 output 时覆盖 storageDir-based 默认路径', async () => {
    await archiToRules({ cwd: '/project', storageDir: '.arch', output: '/rules/custom.json' });
    expect(writeFileSync).toHaveBeenCalled();
    const writeCalls = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls;
    const rulesCall = writeCalls.find((call: string[]) => call[0]?.includes?.('custom.json'));
    expect(rulesCall).toBeDefined();
    if (rulesCall) {
      expect(rulesCall[0]).toBe(resolve('/rules', 'custom.json'));
    }
  });
});
