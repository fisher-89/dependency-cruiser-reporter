/**
 * Integration tests: POST /api/architecture/generate 幂等性集成测试
 *
 * 两次 POST 请求生成 main.c4，对比内容。
 * 使用真实临时目录验证覆盖写入。
 *
 * Coverage targets (from test-design.md):
 *   - I-5: POST /api/architecture/generate produces identical main.c4 on second call
 *   - I-6: POST /api/architecture/generate does not create duplicate files
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import express from 'express';
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

// Mock the .template file to avoid rolldown transform errors
vi.mock('../../src/server/architecture/main.c4.template', () => ({
  default: '// Mock C4 template for idempotency test',
}));

// No mock on node:fs - use real FS for idempotency tests
// No mock on architecture.js - use real implementation
import { setupArchitectureRoutes } from '../../src/server/architecture/architecture.js';

function makePostRequest(app: express.Express, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const http = require('node:http');
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/architecture/generate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      () => {
        resolve();
      },
    );
    req.on('error', reject);
    req.write('{}');
    req.end();
  });
}

describe('幂等性测试 -- POST /api/architecture/generate', () => {
  let tempDir: string;
  let app: express.Express;
  let server: ReturnType<(typeof express.Express)['prototype']['listen']>;
  let port: number;

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'dcr-arch-gen-'));
    app = express();
    app.use(express.json());
    setupArchitectureRoutes(app, tempDir, '.');
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr !== 'string') {
          port = addr.port;
          resolve();
        } else {
          reject(new Error('Failed to get server port'));
        }
      });
    });
  });

  afterAll(() => {
    server?.close();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // I-5: POST /api/architecture/generate produces identical main.c4 on second call
  // ===========================================================================
  it('I-5: POST /api/architecture/generate 两次调用生成相同 main.c4', async () => {
    // First call
    await makePostRequest(app, port);
    const archDir = join(tempDir, '.', 'architecture');
    const mainC4Path = join(archDir, 'main.c4');
    const content1 = readFileSync(mainC4Path, 'utf-8');

    // Second call
    await makePostRequest(app, port);
    const content2 = readFileSync(mainC4Path, 'utf-8');

    expect(content1).toEqual(content2);
  });

  // ===========================================================================
  // I-6: POST /api/architecture/generate does not create duplicate files
  // ===========================================================================
  it('I-6: POST /api/architecture/generate 不生成重复文件', async () => {
    const archDir = join(tempDir, '.', 'architecture');
    const filesBefore = readdirSync(archDir).filter((f) => f.endsWith('.c4'));

    // Call again
    await makePostRequest(app, port);

    const filesAfter = readdirSync(archDir).filter((f) => f.endsWith('.c4'));
    expect(filesAfter.length).toBe(filesBefore.length);
  });
});
