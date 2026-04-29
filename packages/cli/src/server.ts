import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, type Request, type Response } from 'express';
import { convertWithFallback, reAggregateProcessedGraph } from './commands/convert.js';
import type { ProcessedGraph } from './commands/convert.js';

export interface ServerOptions {
  port: number;
  host: string;
  graphFile?: string;
  maxNodes?: number;
}

export class DcrServer {
  private app: Express;
  private _port: number;
  private host: string;
  private graphFile?: string;
  private maxNodes: number;
  private server?: ReturnType<typeof this.app.listen>;

  /** Get the actual port the server is listening on */
  get port(): number {
    return this._port;
  }

  constructor(options: ServerOptions) {
    this._port = options.port;
    this.host = options.host;
    this.graphFile = options.graphFile;
    this.maxNodes = options.maxNodes ?? 500;

    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Get frontend dist directory
    const cliDir = dirname(fileURLToPath(import.meta.url));
    const frontendDist = resolve(cliDir, '../../frontend/dist');

    // API: Get config
    this.app.get('/api/config', (_req: Request, res: Response) => {
      res.json({
        hasGraphFile: !!this.graphFile,
      });
    });

    // API: Get graph data (auto-converts raw dependency-cruiser JSON)
    this.app.post('/api/graph', (req: Request, res: Response) => {
      if (!this.graphFile) {
        res.status(404).json({ error: 'No graph file specified' });
        return;
      }

      if (!existsSync(this.graphFile)) {
        res.status(404).json({ error: `Graph file not found: ${this.graphFile}` });
        return;
      }

      try {
        const content = readFileSync(this.graphFile, 'utf-8');
        const parsed = JSON.parse(content);
        const expandedDirs = req.body?.expanded_dirs as string[] | undefined;

        // Raw dependency-cruiser format: has 'modules' array
        if (parsed.modules && Array.isArray(parsed.modules)) {
          const graph = convertWithFallback(content, this.maxNodes, expandedDirs);
          res.json(graph);
          return;
        }

        // Already ProcessedGraph: has nodes/edges/meta
        if (parsed.nodes && parsed.edges && parsed.meta) {
          // Re-aggregate if too large
          if (parsed.nodes.length > this.maxNodes) {
            const aggregated = reAggregateProcessedGraph(parsed as ProcessedGraph, this.maxNodes, expandedDirs);
            res.json(aggregated);
            return;
          }
          // Set expanded_dirs if provided
          if (expandedDirs) {
            parsed.meta.expanded_dirs = expandedDirs;
          }
          res.json(parsed);
          return;
        }

        // Unknown format
        res.status(400).json({ error: 'Unrecognized graph file format' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to read graph file' });
      }
    });

    // Serve frontend static files
    this.app.use(express.static(frontendDist));

    // SPA fallback
    this.app.get('*', (_req: Request, res: Response) => {
      const indexPath = resolve(frontendDist, 'index.html');
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Frontend not built. Run 'pnpm build' in packages/frontend");
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tryListen = (port: number) => {
        const server = this.app.listen(port, this.host, () => {
          this._port = port;
          this.server = server;
          resolve();
        });

        server.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE' && port < 65535) {
            console.log(`Port ${port} is in use, trying ${port + 1}...`);
            server.close();
            tryListen(port + 1);
          } else {
            reject(err);
          }
        });
      };

      tryListen(this.port);
    });
  }

  stop(): void {
    this.server?.close();
  }
}

export function createServer(options: ServerOptions): DcrServer {
  return new DcrServer(options);
}

export default DcrServer;
