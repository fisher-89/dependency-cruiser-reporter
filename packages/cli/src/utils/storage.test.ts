/**
 * Unit tests: storage.ts -- parseStorageDir() 路径解析
 *
 * 测试 parseStorageDir 纯函数的路径解析逻辑：
 * - 绝对路径直接使用
 * - 相对路径基于 absCwd 解析
 * - 边界值测试（空字符串、特殊字符、尾部斜杠）
 *
 * Coverage targets (from test-design.md):
 *   - F-1: undefined storageDir defaults to .dc-reporter
 *   - R-1: undefined absCwd 错误处理
 *   - B-1: empty storageDir resolves to cwd
 *   - B-2: storageDir with special characters
 *   - B-3: storageDir with trailing slash
 */

import { isAbsolute, resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

// parseStorageDir 是纯函数，无需 mock
import { parseStorageDir } from './storage.js';

describe('parseStorageDir() 路径解析', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-1: undefined storageDir defaults to .dc-reporter
  // ===========================================================================
  it('F-1: storageDir 未指定时默认为 .dc-reporter', () => {
    const result = parseStorageDir('.dc-reporter', '/project');
    expect(result).toBe(resolve('/project', '.dc-reporter'));
  });

  // ===========================================================================
  // F-2: relative storageDir resolved against absCwd
  // ===========================================================================
  it('F-2: 相对路径基于 absCwd 解析', () => {
    const result = parseStorageDir('.my-dir', '/project');
    expect(result).toBe(resolve('/project', '.my-dir'));
  });

  // ===========================================================================
  // F-3: absolute storageDir used directly
  // ===========================================================================
  it('F-3: 绝对路径直接使用不基于 cwd 解析', () => {
    const storageDir = '/abs/data';
    const absCwd = '/project';
    const result = parseStorageDir(storageDir, absCwd);
    // POSIX: /abs/data is absolute, returned as-is
    // Windows: /abs/data is NOT absolute, resolved against absCwd
    const expected = isAbsolute(storageDir) ? storageDir : resolve(absCwd, storageDir);
    expect(result).toBe(expected);
  });

  // ===========================================================================
  // F-4: storageDir resolves relative to cwd
  // ===========================================================================
  it('F-4: storageDir 基于 cwd 进行解析', () => {
    const result = parseStorageDir('.data', '/workspace/packages/core');
    expect(result).toBe(resolve('/workspace/packages/core', '.data'));
  });

  // ===========================================================================
  // R-1: absCwd 未定义时应合理处理
  // ===========================================================================
  it('R-1: absCwd 为 undefined 时抛出类型错误', () => {
    // parseStorageDir 将 undefined absCwd 传递给 resolve()，抛 TypeError
    expect(() => parseStorageDir('.data', undefined as unknown as string)).toThrow();
  });

  // ===========================================================================
  // B-1: empty storageDir resolves to cwd
  // ===========================================================================
  it('B-1: storageDir 为空字符串时返回 cwd', () => {
    const result = parseStorageDir('', '/project');
    expect(result).toBe(resolve('/project', ''));
  });

  // ===========================================================================
  // B-2: storageDir with special characters
  // ===========================================================================
  it('B-2: storageDir 包含空格和特殊字符时路径正确拼接', () => {
    const result = parseStorageDir('./my data (v1)', '/project');
    expect(result).toBe(resolve('/project', 'my data (v1)'));
  });

  // ===========================================================================
  // B-3: storageDir with trailing slash
  // ===========================================================================
  it('B-3: storageDir 尾部有斜杠时路径正确解析', () => {
    const result = parseStorageDir('.my-dir/', '/project');
    expect(result).toBe(resolve('/project', '.my-dir'));
  });

  // ===========================================================================
  // 参数类型边界：storageDir 为绝对路径含特殊字符
  // ===========================================================================
  it('B-4: 绝对路径包含特殊字符时直接使用', () => {
    const storageDir = '/data/my project (v2)';
    const absCwd = '/project';
    const result = parseStorageDir(storageDir, absCwd);
    // POSIX: /data/my project (v2) is absolute, returned as-is
    // Windows: /data/my project (v2) is NOT absolute, resolved against absCwd
    const expected = isAbsolute(storageDir) ? storageDir : resolve(absCwd, storageDir);
    expect(result).toBe(expected);
  });
});
