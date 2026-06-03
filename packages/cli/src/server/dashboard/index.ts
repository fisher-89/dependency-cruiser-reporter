import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import express, { type Express, type Request, type Response } from 'express';

export function setupDashboardRoutes(app: Express): void {
  // Auto-detect frontend dist: dev mode resolves to packages/frontend/dist/,
  // bundle mode falls back to ./frontend alongside cli.js
  const _devFrontend = fileURLToPath(new URL('../../frontend/dist', import.meta.url).href);
  const frontendDist = existsSync(_devFrontend)
    ? _devFrontend
    : fileURLToPath(new URL('./frontend', import.meta.url).href);

  // Serve frontend static files
  app.use(express.static(frontendDist));

  // SPA fallback
  app.get('*', (_req: Request, res: Response) => {
    const indexPath = resolve(frontendDist, 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res
        .status(404)
        .send(`Frontend not built. Run 'pnpm build' in packages/frontend.(PATH:${indexPath})`);
    }
  });
}
