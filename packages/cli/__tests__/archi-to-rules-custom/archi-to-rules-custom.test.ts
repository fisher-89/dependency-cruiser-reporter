/**
 * Integration tests: archi-to-rules 自定义路径集成测试
 *
 * mock loadC4Model，验证自定义路径。
 *
 * Coverage targets (from test-design.md):
 *   - F-6 (E2E-s): archiToRules({ storageDir: '.arch', cwd: '/tmp' })
 *     读取 .arch/architecture/
 *   - F-8 (E2E-s): archiToRules({ storageDir: '.arch', cwd: '/tmp' })
 *     输出到 .arch/archi-rules.json
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
      $data: { elements: {}, relations: {} },
    }),
  }),
}));

import { archiToRules } from '../../src/actions/archi-to-rules.js';

describe('集成测试 -- archi-to-rules 自定义 storageDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-6 (E2E-s): custom storageDir reads from custom archDir
  // ===========================================================================
  it('F-6 (E2E-s): archiToRules() 自定义 storageDir 读取自定义 archDir', async () => {
    await archiToRules({ storageDir: '.arch', cwd: '/tmp' });

    const readdirCalls = (readdirSync as ReturnType<typeof vi.fn>).mock.calls;
    const archDirCall = readdirCalls.find((call: string[]) =>
      call[0]?.includes?.(`.arch${sep}architecture`),
    );
    expect(archDirCall).toBeDefined();
    if (archDirCall) {
      expect(archDirCall[0]).toContain(resolve('/tmp', '.arch', 'architecture'));
    }
  });

  // ===========================================================================
  // F-8 (E2E-s): custom storageDir outputs to custom path
  // ===========================================================================
  it('F-8 (E2E-s): archiToRules() 自定义 storageDir 输出到 .arch/archi-rules.json', async () => {
    await archiToRules({ storageDir: '.arch', cwd: '/tmp' });

    expect(writeFileSync).toHaveBeenCalled();
    const writeCalls = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls;
    const rulesCall = writeCalls.find((call: string[]) => call[0]?.includes?.('archi-rules.json'));
    expect(rulesCall).toBeDefined();
    if (rulesCall) {
      expect(rulesCall[0]).toContain(resolve('/tmp', '.arch', 'archi-rules.json'));
    }
  });
});
