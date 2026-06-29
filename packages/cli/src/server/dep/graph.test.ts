/**
 * Unit tests: graph.ts -- POST /api/graph meta.source field injection
 *
 * Tests that setupGraphRoute correctly injects `source` into the response meta,
 * and handles error conditions (missing graph file, file not found, invalid format).
 *
 * Coverage targets (from test-design.md):
 *   - F-21: response meta includes source field
 *   - F-22: source is graphFile absolute path
 *   - R-12: graphFile undefined returns 404 without source
 *   - R-13: file not found returns 404
 *   - R-14: invalid format returns 400
 *   - B-14: source path with spaces and special chars
 *   - B-15: source is preserved after convert error
 *   - B-16: expanded_dirs from body do not affect source
 */

import { existsSync, readFileSync } from 'node:fs';

import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import * as convertModule from '../../utils/convert.js';
import { setupGraphRoute } from './graph.js';

// ---------------------------------------------------------------------------
// Mock fs operations
// ---------------------------------------------------------------------------
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock convert utility
// ---------------------------------------------------------------------------
let mockConvert: ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockGraphResponse = {
  nodes: [],
  edges: [],
  combos: [],
  meta: {
    original_node_count: 10,
    aggregated_node_count: 5,
    total_violations: 0,
    expanded_dirs: ['src'],
  },
  violations: [],
};

const defaultGraphContent = JSON.stringify({ modules: [{ source: 'src/index.ts' }] });

// ---------------------------------------------------------------------------
// Helper: create a fresh app for each test
// ---------------------------------------------------------------------------
function createApp(graphFile?: string, maxNodes = 200): express.Express {
  const app = express();
  app.use(express.json());
  setupGraphRoute(app, { graphFile, maxNodes });
  return app;
}

// ---------------------------------------------------------------------------
// Test: make a POST /api/graph request and return the response
// ---------------------------------------------------------------------------
function postGraph(
  app: express.Express,
  body: Record<string, unknown> = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    // We use supertest-style pattern but with a simple HTTP server for Node env
    // TODO: Replace with supertest import once added as devDependency
    const http = require('node:http');
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        return reject(new Error('Failed to get server address'));
      }
      const port = addr.port;
      const options = {
        hostname: '127.0.0.1',
        port,
        path: '/api/graph',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };
      const req = http.request(
        options,
        (res: {
          statusCode?: number;
          on: (event: string, cb: (chunk: string) => void) => void;
        }) => {
          let data = '';
          res.on('data', (chunk: string) => {
            data += chunk;
          });
          res.on('end', () => {
            server.close();
            try {
              resolve({ status: res.statusCode ?? 500, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode ?? 500, body: { raw: data } });
            }
          });
        },
      );
      req.on('error', (err: Error) => {
        server.close();
        reject(err);
      });
      req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe('graph.ts -- POST /api/graph meta.source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConvert = vi.spyOn(convertModule, 'convert') as unknown as ReturnType<typeof vi.fn>;
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultGraphContent);
    mockConvert.mockResolvedValue(mockGraphResponse as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-21: response meta includes source field
  // ===========================================================================
  it('F-21: POST /api/graph 返回的 meta 中包含 source 字段', async () => {
    const app = createApp('/abs/path/graph.json');
    const res = await postGraph(app, { expanded_dirs: ['src'] });
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.meta).toBeDefined();
    expect((res.body.meta as Record<string, unknown>).source).toBeDefined();
  });

  // ===========================================================================
  // F-22: source is graphFile absolute path
  // ===========================================================================
  it('F-22: source 字段值为 graphFile 的绝对路径', async () => {
    const app = createApp('/abs/path/graph.json');
    const res = await postGraph(app, { expanded_dirs: [] });
    expect(res.status).toBe(200);
    expect((res.body.meta as Record<string, unknown>).source).toBe('/abs/path/graph.json');
  });

  // ===========================================================================
  // R-12: graphFile undefined returns 404 without source
  // ===========================================================================
  it('R-12: graphFile 未定义时返回 404 且 meta 不包含 source', async () => {
    const app = createApp(undefined);
    const res = await postGraph(app);
    expect(res.status).toBe(404);
    // 响应体中不应包含 meta.source
    expect(res.body.meta).toBeUndefined();
  });

  // ===========================================================================
  // R-13: file not found returns 404
  // ===========================================================================
  it('R-13: graphFile 指向不存在的文件时返回 404', async () => {
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const app = createApp('/nonexistent/graph.json');
    const res = await postGraph(app);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(String(res.body.error).toLowerCase()).toContain('not found');
  });

  // ===========================================================================
  // R-14: invalid format returns 400
  // ===========================================================================
  it('R-14: JSON 内容不含 modules 数组时返回 400', async () => {
    (readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({ notModules: true }),
    );
    const app = createApp('/abs/path/graph.json');
    const res = await postGraph(app);
    expect(res.status).toBe(400);
    expect(String(res.body.error).toLowerCase()).toContain('unrecognized');
  });

  // ===========================================================================
  // B-14: source path with spaces and special chars
  // ===========================================================================
  it('B-14: graphFile 路径包含空格和特殊字符时保持原样', async () => {
    const specialPath = 'C:/my project/graph (1).json';
    const app = createApp(specialPath);
    const res = await postGraph(app);
    expect(res.status).toBe(200);
    expect((res.body.meta as Record<string, unknown>).source).toBe(specialPath);
  });

  // ===========================================================================
  // B-15: source is preserved after convert error
  // ===========================================================================
  it('B-15: convert 抛异常时返回 500 且 meta.source 不存在', async () => {
    // 使用异步工厂确保 mock 返回 rejected promise
    mockConvert.mockImplementation(async () => {
      throw new Error('Convert failed');
    });
    const app = createApp('/abs/path/graph.json');
    const res = await postGraph(app);
    expect(res.status).toBe(500);
    // 异常时 meta 不应包含 source
    const meta = res.body.meta as Record<string, unknown> | undefined;
    if (meta) {
      expect(meta.source).toBeUndefined();
    }
  });

  // ===========================================================================
  // B-16: expanded_dirs from body do not affect source
  // ===========================================================================
  it('B-16: expanded_dirs 参数不影响 meta.source', async () => {
    const app = createApp('/abs/path/graph.json');
    const resWithDirs = await postGraph(app, { expanded_dirs: ['src', 'src/cli'] });
    const resWithoutDirs = await postGraph(app, {});

    const sourceWithDirs = (resWithDirs.body.meta as Record<string, unknown>).source;
    const sourceWithoutDirs = (resWithoutDirs.body.meta as Record<string, unknown>).source;

    expect(sourceWithDirs).toBe('/abs/path/graph.json');
    expect(sourceWithoutDirs).toBe('/abs/path/graph.json');
  });
});
