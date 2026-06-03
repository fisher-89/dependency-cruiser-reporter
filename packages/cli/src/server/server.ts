import express, { type Express } from 'express';

import { setupArchitectureRoutes } from './architecture/architecture.js';
import { setupDashboardRoutes } from './dashboard/index.js';
import { setupAnalyzeDepRoute } from './dep/analyze.js';
import { setupGraphRoute } from './dep/graph.js';

export interface ServerOptions {
  port: number;
  host: string;
  graphFile?: string;
  maxNodes?: number;
  cwd?: string;
}

export class DcrServer {
  private app: Express;
  private _port: number;
  private host: string;
  private graphFile?: string;
  private maxNodes: number;
  private cwd: string;
  private server?: ReturnType<typeof this.app.listen>;

  /** Get the actual port the server is listening on */
  get port(): number {
    return this._port;
  }

  constructor(options: ServerOptions) {
    this._port = options.port;
    this.host = options.host;
    this.graphFile = options.graphFile;
    this.maxNodes = options.maxNodes ?? 200;
    this.cwd = options.cwd ?? '.';

    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Architecture routes (GET /api/architecture/model, POST /api/architecture/generate, POST /api/archi-to-rules)
    setupArchitectureRoutes(this.app, this.cwd);

    // Dep analyze route (POST /api/analyze)
    setupAnalyzeDepRoute(this.app, { cwd: this.cwd });

    // Dep graph route (POST /api/graph)
    setupGraphRoute(this.app, { graphFile: this.graphFile, maxNodes: this.maxNodes });

    // Dashboard static file serving and SPA fallback
    setupDashboardRoutes(this.app);
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
