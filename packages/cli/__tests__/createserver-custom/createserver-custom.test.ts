/**
 * Integration tests: createServer 自定义 storageDir 集成测试
 *
 * 构造 DcrServer 并验证路由正确传递 storageDir。
 *
 * Coverage targets (from test-design.md):
 *   - F-12 (E2E-s): createServer({ storageDir: '.data', cwd: '/tmp' })
 *     架构路由使用自定义存储目录
 *   - F-15 (E2E-s): createServer({ storageDir: '/abs/data', cwd: '/tmp' })
 *     绝对路径
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mockSetupArchitectureRoutes = vi.hoisted(() => vi.fn());
const mockSetupAnalyzeDepRoute = vi.hoisted(() => vi.fn());
const mockSetupDashboardRoutes = vi.hoisted(() => vi.fn());
const mockSetupGraphRoute = vi.hoisted(() => vi.fn());

vi.mock('../../src/server/architecture/architecture.js', () => ({
  setupArchitectureRoutes: mockSetupArchitectureRoutes,
}));
vi.mock('../../src/server/dep/analyze.js', () => ({
  setupAnalyzeDepRoute: mockSetupAnalyzeDepRoute,
}));
vi.mock('../../src/server/dashboard/index.js', () => ({
  setupDashboardRoutes: mockSetupDashboardRoutes,
}));
vi.mock('../../src/server/dep/graph.js', () => ({
  setupGraphRoute: mockSetupGraphRoute,
}));

import { createServer } from '../../src/server/server.js';

describe('集成测试 -- createServer 自定义 storageDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-12 (E2E-s): custom storageDir passed to architecture route
  // ===========================================================================
  it('F-12 (E2E-s): createServer 将自定义 storageDir 传递给架构路由', () => {
    createServer({ port: 3000, host: 'localhost', storageDir: '.data', cwd: '/tmp' });

    expect(mockSetupArchitectureRoutes).toHaveBeenCalledWith(expect.anything(), '/tmp', '.data');
    expect(mockSetupAnalyzeDepRoute).toHaveBeenCalledWith(expect.anything(), {
      cwd: '/tmp',
      storageDir: '.data',
    });
  });

  // ===========================================================================
  // F-15 (E2E-s): absolute storageDir passed to architecture route
  // ===========================================================================
  it('F-15 (E2E-s): createServer 将绝对路径 storageDir 传递给架构路由', () => {
    createServer({ port: 3000, host: 'localhost', storageDir: '/abs/data', cwd: '/tmp' });

    expect(mockSetupArchitectureRoutes).toHaveBeenCalledWith(
      expect.anything(),
      '/tmp',
      '/abs/data',
    );
  });
});
