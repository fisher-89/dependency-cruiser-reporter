/**
 * Integration tests: archiToRules() 幂等性集成测试
 *
 * mock C4 模型解析，调用 archiToRules() 两次，对比输出文件。
 * 使用真实临时目录验证覆盖写入。
 *
 * Coverage targets (from test-design.md):
 *   - I-3: archiToRules() produces identical archi-rules.json on second call
 *   - I-4: archiToRules() does not modify .dependency-cruiser.js extends twice
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

// Use real fs for idempotency checks - no mock on fs operations
// Only mock @likec4/language-services/node

vi.mock('@likec4/language-services/node', () => ({
  fromSources: vi.fn().mockResolvedValue({
    hasErrors: vi.fn().mockReturnValue(false),
    getErrors: vi.fn().mockReturnValue([]),
    syncComputedModel: vi.fn().mockReturnValue({
      $data: {
        elements: {
          'test.pkg': {
            id: 'test.pkg',
            name: 'pkg',
            kind: 'package',
            title: 'Test Package',
            tags: [],
            links: [],
          },
        },
        relations: {},
      },
    }),
  }),
}));

import { archiToRules } from '../../src/actions/archi-to-rules.js';

describe('幂等性测试 -- archiToRules()', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'dcr-archi-idem-'));
    // Pre-create architecture subdirectory with a .c4 file
    // Use cwd: tempDir + storageDir: '.' so loadC4Model resolves correctly on all platforms
    mkdirSync(join(tempDir, 'architecture'), { recursive: true });
    writeFileSync(join(tempDir, 'architecture', 'main.c4'), '// test', 'utf-8');
    // Create dir for mock element resolved path (test.pkg -> src/test/pkg)
    mkdirSync(join(tempDir, 'src', 'test', 'pkg'), { recursive: true });
    // Create .dependency-cruiser.js
    writeFileSync(
      join(tempDir, '.dependency-cruiser.js'),
      'module.exports = {\n  extends: [],\n};',
      'utf-8',
    );
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // I-3: archiToRules() produces identical archi-rules.json on second call
  // ===========================================================================
  it('I-3: archiToRules() 两次调用输出的 archi-rules.json 一致', async () => {
    // Use cwd: tempDir + storageDir: '.' so loadC4Model resolves correctly on all platforms
    // (path.join on Windows doesn't properly reset for absolute path segments)
    // First call
    await archiToRules({ storageDir: '.', cwd: tempDir });
    const outputPath = join(tempDir, 'archi-rules.json');
    const content1 = readFileSync(outputPath, 'utf-8');

    // Second call
    await archiToRules({ storageDir: '.', cwd: tempDir });
    const content2 = readFileSync(outputPath, 'utf-8');

    expect(content1).toEqual(content2);
  });

  // ===========================================================================
  // I-4: archiToRules() does not duplicate extends entries
  // ===========================================================================
  it('I-4: archiToRules() 不重复追加 .dependency-cruiser.js 的 extends 字段', async () => {
    const configPath = join(tempDir, '.dependency-cruiser.js');

    // Reset config to clean state
    writeFileSync(configPath, 'module.exports = {\n  extends: [],\n};', 'utf-8');

    // First call
    await archiToRules({ storageDir: '.', cwd: tempDir });
    let configContent = readFileSync(configPath, 'utf-8');
    expect(configContent.match(/archi-rules\.json/g)).toHaveLength(1);

    // Second call
    await archiToRules({ storageDir: '.', cwd: tempDir });
    configContent = readFileSync(configPath, 'utf-8');
    expect(configContent.match(/archi-rules\.json/g)).toHaveLength(1);
  });
});
