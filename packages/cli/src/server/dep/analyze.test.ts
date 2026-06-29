/**
 * Unit tests: server/dep/analyze.ts -- setupAnalyzeDepRoute storageDir 参数传递
 *
 * 验证 setupAnalyzeDepRoute 将 storageDir 传递给 analyze()。
 *
 * Coverage targets (from test-design.md):
 *   - F-18: POST /api/analyze passes storageDir to analyze()
 */

import http from 'node:http';

import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mockAnalyze = vi.hoisted(() => vi.fn().mockResolvedValue('/output/path.json'));

vi.mock('../../actions/analyze.js', () => ({
  analyze: mockAnalyze,
}));

import { setupAnalyzeDepRoute } from './analyze.js';

function makePostRequest(
  app: express.Express,
  path: string,
  body: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        return reject(new Error('No address'));
      }
      const options = {
        hostname: '127.0.0.1',
        port: (addr as { port: number }).port,
        path,
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
          res.on('data', (chunk: string) => (data += chunk));
          res.on('end', () => {
            server.close();
            resolve({ status: res.statusCode ?? 0, body: data });
          });
        },
      );
      req.on('error', (err: Error) => {
        server.close();
        reject(err);
      });
      req.write(body);
      req.end();
    });
  });
}

describe('setupAnalyzeDepRoute storageDir 参数传递', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-18: POST /api/analyze passes storageDir to analyze()
  // ===========================================================================
  it('F-18: POST /api/analyze 将 storageDir 透传到 analyze()', async () => {
    const app = express();
    app.use(express.json());
    setupAnalyzeDepRoute(app, { cwd: '/project', storageDir: '.data' });

    await makePostRequest(app, '/api/analyze', '{}');

    expect(mockAnalyze).toHaveBeenCalledWith({
      path: '.',
      cwd: '/project',
      storageDir: '.data',
    });
  });
});
