/**
 * Integration tests: archi-to-rules 默认值集成测试
 *
 * mock loadC4Model，验证默认路径。
 *
 * Coverage targets (from test-design.md):
 *   - F-5 (E2E-s): archiToRules({ cwd: '/tmp' }) 默认读取 .dc-reporter/architecture/
 *   - F-7 (E2E-s): archiToRules({ cwd: '/tmp' }) 默认输出到 .dc-reporter/archi-rules.json
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

describe('集成测试 -- archi-to-rules 默认 storageDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-5 (E2E-s): default storageDir constructs .dc-reporter/architecture/ archDir
  // ===========================================================================
  it('F-5 (E2E-s): archiToRules() 默认读取 .dc-reporter/architecture/', async () => {
    await archiToRules({ cwd: '/tmp' });

    const readdirCalls = (readdirSync as ReturnType<typeof vi.fn>).mock.calls;
    const archDirCall = readdirCalls.find((call: string[]) => call[0]?.includes?.('architecture'));
    expect(archDirCall).toBeDefined();
    if (archDirCall) {
      expect(archDirCall[0]).toContain(resolve('/tmp', '.dc-reporter', 'architecture'));
    }
  });

  // ===========================================================================
  // F-7 (E2E-s): default storageDir outputs to .dc-reporter/archi-rules.json
  // ===========================================================================
  it('F-7 (E2E-s): archiToRules() 默认输出到 .dc-reporter/archi-rules.json', async () => {
    await archiToRules({ cwd: '/tmp' });

    expect(writeFileSync).toHaveBeenCalled();
    const writeCalls = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls;
    const rulesCall = writeCalls.find((call: string[]) => call[0]?.includes?.('archi-rules.json'));
    expect(rulesCall).toBeDefined();
    if (rulesCall) {
      expect(rulesCall[0]).toContain(resolve('/tmp', '.dc-reporter', 'archi-rules.json'));
    }
  });
});
