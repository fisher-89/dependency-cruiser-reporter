/**
 * Integration tests: analyze() 幂等性集成测试
 *
 * mock dependency-cruiser，调用 analyze() 两次，对比输出文件内容。
 * 使用真实临时目录验证覆盖写入行为。
 *
 * Coverage targets (from test-design.md):
 *   - I-1: analyze() produces identical output on second call
 *   - I-2: analyze() does not duplicate entries on second call
 */

import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
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

const mockCruiseOutput = vi.hoisted(() =>
  JSON.stringify({ modules: [{ source: 'src/index.ts' }] }),
);

vi.mock('dependency-cruiser', () => ({
  cruise: vi.fn().mockResolvedValue({ output: mockCruiseOutput }),
}));
vi.mock('dependency-cruiser/config-utl/extract-depcruise-options', () => ({
  default: vi.fn().mockResolvedValue({}),
}));
vi.mock('dependency-cruiser/config-utl/extract-ts-config', () => ({
  default: vi.fn().mockResolvedValue({}),
}));

import { analyze } from '../../src/actions/analyze.js';

describe('幂等性测试 -- analyze()', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'dcr-analyze-idem-'));
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
  // I-1: analyze() produces identical output on second call
  // ===========================================================================
  it('I-1: analyze() 两次调用输出文件内容一致', async () => {
    // First call
    const outputPath1 = await analyze({ path: '.', storageDir: tempDir, cwd: '.' });
    const content1 = readFileSync(outputPath1, 'utf-8');

    // Second call with same params
    const outputPath2 = await analyze({ path: '.', storageDir: tempDir, cwd: '.' });
    const content2 = readFileSync(outputPath2, 'utf-8');

    expect(outputPath1).toBe(outputPath2);
    expect(content1).toEqual(content2);
  });

  // ===========================================================================
  // I-2: analyze() does not duplicate entries on second call
  // ===========================================================================
  it('I-2: analyze() 两次调用后 scans 目录文件数不变（覆盖写入非追加）', async () => {
    // First call
    await analyze({ path: '.', storageDir: tempDir, cwd: '.' });

    const scansDir = join(tempDir, 'scans');
    const filesAfterFirst = readdirSync(scansDir);
    expect(filesAfterFirst).toHaveLength(1);

    // Second call
    await analyze({ path: '.', storageDir: tempDir, cwd: '.' });

    const filesAfterSecond = readdirSync(scansDir);
    expect(filesAfterSecond).toHaveLength(1);
  });
});
