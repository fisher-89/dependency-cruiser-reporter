/**
 * Unit tests: server.ts -- DcrServer storageDir 参数传递
 *
 * 验证 DcrServer 将 storageDir 参数传递给各路由设置函数。
 *
 * Coverage targets (from test-design.md):
 *   - F-12: custom storageDir passed to setupArchitectureRoutes
 *   - F-13: custom storageDir passed to setupAnalyzeDepRoute
 *   - F-14: default storageDir resolved when undefined
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mockSetupArchitectureRoutes = vi.hoisted(() => vi.fn());
const mockSetupAnalyzeDepRoute = vi.hoisted(() => vi.fn());
const mockSetupDashboardRoutes = vi.hoisted(() => vi.fn());

vi.mock('./architecture/architecture.js', () => ({
  setupArchitectureRoutes: mockSetupArchitectureRoutes,
}));

vi.mock('./dep/analyze.js', () => ({
  setupAnalyzeDepRoute: mockSetupAnalyzeDepRoute,
}));

vi.mock('./dashboard/index.js', () => ({
  setupDashboardRoutes: mockSetupDashboardRoutes,
}));

vi.mock('./dep/graph.js', () => ({
  setupGraphRoute: vi.fn(),
}));

import { createServer } from './server.js';

describe('DcrServer storageDir 参数传递', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-12: custom storageDir passed to setupArchitectureRoutes
  // ===========================================================================
  it('F-12: 自定义 storageDir 传递给 setupArchitectureRoutes', () => {
    createServer({ port: 3000, host: 'localhost', storageDir: '.data', cwd: '/project' });
    expect(mockSetupArchitectureRoutes).toHaveBeenCalledWith(
      expect.anything(),
      '/project',
      '.data',
    );
  });

  // ===========================================================================
  // F-13: custom storageDir passed to setupAnalyzeDepRoute
  // ===========================================================================
  it('F-13: 自定义 storageDir 传递给 setupAnalyzeDepRoute', () => {
    createServer({ port: 3000, host: 'localhost', storageDir: '.data', cwd: '/project' });
    expect(mockSetupAnalyzeDepRoute).toHaveBeenCalledWith(expect.anything(), {
      cwd: '/project',
      storageDir: '.data',
    });
  });

  // ===========================================================================
  // F-14: default storageDir resolved when undefined
  // ===========================================================================
  it('F-14: storageDir 未指定时默认使用 .dc-reporter', () => {
    createServer({ port: 3000, host: 'localhost', cwd: '/project' });
    expect(mockSetupArchitectureRoutes).toHaveBeenCalledWith(
      expect.anything(),
      '/project',
      '.dc-reporter',
    );
    expect(mockSetupAnalyzeDepRoute).toHaveBeenCalledWith(expect.anything(), {
      cwd: '/project',
      storageDir: '.dc-reporter',
    });
  });

  // ===========================================================================
  // Edge: storageDir 空字符串处理
  // ===========================================================================
  it('B-6: storageDir 为空字符串时各路由收到空字符串', () => {
    createServer({ port: 3000, host: 'localhost', storageDir: '', cwd: '/project' });
    expect(mockSetupArchitectureRoutes).toHaveBeenCalledWith(expect.anything(), '/project', '');
    expect(mockSetupAnalyzeDepRoute).toHaveBeenCalledWith(expect.anything(), {
      cwd: '/project',
      storageDir: '',
    });
  });
});
