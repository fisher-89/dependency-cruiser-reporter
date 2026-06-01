import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { type Express, type Request, type Response } from 'express';

import mainC4Template from './main.c4.template';

export function setupArchitectureRoutes(app: Express, cwd: string): void {
  // API: Get architecture model (C4 parsing)
  app.get('/api/architecture/model', async (_req: Request, res: Response) => {
    const archDir = join(resolve(cwd), '.dc-reporter', 'architecture');

    if (!existsSync(archDir)) {
      res.status(404).json({ error: 'Architecture directory not found' });
      return;
    }

    let files: string[];
    try {
      files = readdirSync(archDir).filter((f) => f.endsWith('.c4'));
    } catch {
      res.status(500).json({ error: 'Failed to read architecture directory' });
      return;
    }

    if (files.length === 0) {
      res.status(404).json({ error: 'No .c4 files found in architecture directory' });
      return;
    }

    try {
      const sources: Record<string, string> = {};
      for (const file of files) {
        sources[file] = readFileSync(join(archDir, file), 'utf-8');
      }

      const { fromSources } = await import('@likec4/language-services/node');
      const likec4 = await fromSources(sources);

      if (likec4.hasErrors()) {
        const errors = likec4.getErrors();
        res.status(422).json({ error: 'C4 parse errors', details: JSON.stringify(errors) });
        return;
      }

      const computed = likec4.syncComputedModel();
      res.json(computed.$data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(422).json({ error: 'Failed to parse C4 files', details: message });
    }
  });

  // API: Generate architecture model (create starter .c4 file)
  app.post('/api/architecture/generate', async (_req: Request, res: Response) => {
    const archDir = join(resolve(cwd), '.dc-reporter', 'architecture');

    try {
      if (!existsSync(archDir)) {
        mkdirSync(archDir, { recursive: true });
      }
      writeFileSync(join(archDir, 'main.c4'), mainC4Template, 'utf-8');
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Failed to generate architecture model', details: message });
    }
  });
}
