import { existsSync, readFileSync } from 'node:fs';

import { type Express, type Request, type Response } from 'express';

import { convert } from '../../utils/convert.js';

export function setupGraphRoute(
  app: Express,
  { graphFile, maxNodes }: { graphFile?: string; maxNodes: number },
): void {
  app.post('/api/graph', async (req: Request, res: Response) => {
    if (!graphFile) {
      res.status(404).json({ error: 'No graph file specified' });
      return;
    }

    if (!existsSync(graphFile)) {
      res.status(404).json({ error: `Graph file not found: ${graphFile}` });
      return;
    }

    try {
      const content = readFileSync(graphFile, 'utf-8');
      const parsed = JSON.parse(content);
      const expandedDirs: string[] | undefined = req.body?.expanded_dirs?.length
        ? req.body.expanded_dirs
        : undefined;

      if (parsed.modules && Array.isArray(parsed.modules)) {
        const graph = await convert(content, maxNodes, expandedDirs);
        res.json({ ...graph, meta: { ...graph.meta, source: graphFile } });
        return;
      }

      // Unknown format
      res.status(400).json({ error: 'Unrecognized graph file format' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to read graph file', details: String(error) });
    }
  });
}
