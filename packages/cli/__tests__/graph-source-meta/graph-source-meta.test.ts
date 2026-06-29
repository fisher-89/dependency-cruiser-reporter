/**
 * Integration tests: POST /api/graph meta.source
 *
 * Verifies that the Express app returns meta.source when POST /api/graph is called,
 * and that the source value matches the graphFile parameter.
 *
 * Coverage targets (from test-design.md):
 *   - F-21 (E2E): POST /api/graph response meta contains source
 *   - F-22 (E2E): source value matches graphFile absolute path
 */

import { existsSync, readFileSync } from 'node:fs';

import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { setupGraphRoute } from '../../src/server/dep/graph.js';
import * as convertModule from '../../src/utils/convert.js';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const mockConvert = vi.spyOn(convertModule, 'convert');

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
// Helper: create app, start server, POST, return parsed response
// ---------------------------------------------------------------------------
function postGraph(
  app: express.Express,
  body: Record<string, unknown> = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        return reject(new Error('Failed to get server address'));
      }
      const port = addr.port;
      const http = require('node:http');
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

describe('CLI 集成测试 -- POST /api/graph meta.source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultGraphContent);
    mockConvert.mockResolvedValue(mockGraphResponse as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-21 (E2E): POST /api/graph response meta contains source
  // ===========================================================================
  it('F-21 (E2E): POST /api/graph 响应 meta 包含 source 字段', async () => {
    const app = express();
    app.use(express.json());
    setupGraphRoute(app, { graphFile: '/abs/path/to/.dc-reporter/graph.json', maxNodes: 200 });

    const res = await postGraph(app, { expanded_dirs: ['src'] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('meta');
    expect((res.body as { meta: Record<string, unknown> }).meta).toHaveProperty('source');
    expect(typeof (res.body as { meta: Record<string, unknown> }).meta.source).toBe('string');
  });

  // ===========================================================================
  // F-22 (E2E): source value matches graphFile absolute path
  // ===========================================================================
  it('F-22 (E2E): meta.source 值与传入的 graphFile 参数一致', async () => {
    const graphFilePath = '/abs/path/to/.dc-reporter/graph.json';
    const app = express();
    app.use(express.json());
    setupGraphRoute(app, { graphFile: graphFilePath, maxNodes: 200 });

    const res = await postGraph(app, { expanded_dirs: [] });

    expect(res.status).toBe(200);
    expect((res.body as { meta: Record<string, unknown> }).meta.source).toBe(graphFilePath);
  });
});
