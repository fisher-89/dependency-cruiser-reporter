import { type Express, type Request, type Response } from 'express';

import { analyze } from '../../commands/analyze.js';
import { archiToRules } from '../../commands/archi-to-rules.js';

export function setupActionRoutes(app: Express, { cwd }: { cwd: string }): void {
  app.post('/api/analyze', async (_req: Request, res: Response) => {
    try {
      const output = await analyze({ path: '.', cwd });
      res.json({ output });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Scan failed', details: message });
    }
  });

  app.post('/api/archi-to-rules', async (_req: Request, res: Response) => {
    try {
      await archiToRules({ cwd });
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Failed to generate rules', details: message });
    }
  });
}
