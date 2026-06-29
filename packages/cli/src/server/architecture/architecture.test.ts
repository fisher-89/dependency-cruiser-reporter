/**
 * Unit tests: architecture.ts -- setupArchitectureRoutes storageDir 路径
 *
 * 验证 setupArchitectureRoutes 使用 storageDir 构建路径的行为。
 *
 * Coverage targets (from test-design.md):
 *   - F-15: GET /api/architecture/model uses storageDir-based archDir
 *   - F-16: POST /api/architecture/generate uses storageDir-based archDir
 *   - F-17: POST /api/archi-to-rules passes storageDir to archiToRules
 */

import { readdirSync, writeFileSync } from 'node:fs';

import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

// Mock the .template file to avoid rolldown transform errors
vi.mock('./main.c4.template', () => ({
  default: '// mock C4 template',
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

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue(['main.c4']),
  readFileSync: vi.fn().mockReturnValue('// c4 content'),
  writeFileSync: vi.fn(),
}));

vi.mock('../../actions/archi-to-rules.js', () => ({
  archiToRules: vi.fn().mockResolvedValue(undefined),
}));

import { setupArchitectureRoutes } from './architecture.js';

function makeRequest(
  app: express.Express,
  method: string,
  path: string,
  body?: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const http = require('node:http');
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
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
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
      if (body) req.write(body);
      req.end();
    });
  });
}

describe('setupArchitectureRoutes storageDir 路径', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-15: GET /api/architecture/model uses storageDir-based archDir
  // ===========================================================================
  it('F-15: GET /api/architecture/model 使用 storageDir 构建读取路径', async () => {
    setupArchitectureRoutes(app, '/project', '/custom/data');
    await makeRequest(app, 'GET', '/api/architecture/model');

    const readdirCalls = (readdirSync as ReturnType<typeof vi.fn>).mock.calls;
    expect(readdirCalls.length).toBeGreaterThan(0);
    const archDirCall = readdirCalls.find(
      (call: string[]) =>
        call[0] &&
        typeof call[0] === 'string' &&
        call[0].includes('custom') &&
        call[0].includes('data') &&
        call[0].includes('architecture'),
    );
    expect(archDirCall).toBeDefined();
  });

  // ===========================================================================
  // F-16: POST /api/architecture/generate uses storageDir-based archDir
  // ===========================================================================
  it('F-16: POST /api/architecture/generate 使用 storageDir 构建写入路径', async () => {
    setupArchitectureRoutes(app, '/project', '/custom/data');
    await makeRequest(app, 'POST', '/api/architecture/generate', '{}');

    expect(writeFileSync).toHaveBeenCalled();
    const writeCalls = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls;
    const mainC4Call = writeCalls.find(
      (call: string[]) =>
        call[0] &&
        typeof call[0] === 'string' &&
        call[0].includes('custom') &&
        call[0].includes('data') &&
        call[0].includes('architecture') &&
        call[0].includes('main.c4'),
    );
    expect(mainC4Call).toBeDefined();
  });

  // ===========================================================================
  // F-17: POST /api/archi-to-rules passes storageDir to archiToRules
  // ===========================================================================
  it('F-17: POST /api/archi-to-rules 将 storageDir 传递给 archiToRules', async () => {
    const { archiToRules: mockArchiToRules } = await import('../../actions/archi-to-rules.js');

    setupArchitectureRoutes(app, '/project', '.data');
    await makeRequest(app, 'POST', '/api/archi-to-rules', '{}');

    expect(mockArchiToRules).toHaveBeenCalledWith({ cwd: '/project', storageDir: '.data' });
  });
});
