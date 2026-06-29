import { type Express, type Request, type Response } from 'express';

import { analyze } from '../../actions/analyze.js';

export function setupAnalyzeDepRoute(
  app: Express,
  { cwd, storageDir }: { cwd: string; storageDir: string },
): void {
  app.post('/api/analyze', async (_req: Request, res: Response) => {
    try {
      const output = await analyze({ path: '.', cwd, storageDir });
      res.json({ output });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Scan failed', details: message });
    }
  });
}
