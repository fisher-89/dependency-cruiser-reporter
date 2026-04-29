import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, type Request, type Response } from 'express';

export interface ServerOptions {
  port: number;
  host: string;
  graphFile?: string;
}

export class DcrServer {
  private app: Express;
  private _port: number;
  private host: string;
  private graphFile?: string;
  private server?: ReturnType<typeof this.app.listen>;

  /** Get the actual port the server is listening on */
  get port(): number {
    return this._port;
  }

  constructor(options: ServerOptions) {
    this._port = options.port;
    this.host = options.host;
    this.graphFile = options.graphFile;

    this.app = express();
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

    // API: Get graph data
    this.app.get('/api/graph', (_req: Request, res: Response) => {
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
        res.json(JSON.parse(content));
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
