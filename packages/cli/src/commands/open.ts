import { existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { type ServerOptions, createServer } from '../server/server.js';

export interface OpenOptions {
  file?: string;
  port?: number;
  host?: string;
  /** Max nodes before auto-aggregation (default 500) */
  maxNodes?: number;
  /** Workspace root directory (default ".") */
  cwd?: string;
}

const DEFAULT_MAX_NODES = 500;

/**
 * Open web viewer with HTTP server
 */
export async function open(options: OpenOptions): Promise<void> {
  const { file, port = 3000, host = 'localhost', maxNodes = DEFAULT_MAX_NODES, cwd = '.' } = options;

  let resolvedFile = file;
  if (!resolvedFile) {
    const absCwd = resolve(cwd);
    const defaultFile = resolve(absCwd, '.dc-reporter', 'scans', `${basename(absCwd)}-graph.json`);
    if (existsSync(defaultFile)) {
      resolvedFile = defaultFile;
      console.log(`Using graph file: ${resolvedFile}`);
    }
  }

  const serverOptions: ServerOptions = {
    port,
    host,
    graphFile: resolvedFile,
    maxNodes,
    cwd,
  };

  const server = createServer(serverOptions);

  await server.start();

  console.log(`Server running at http://${host}:${server.port}`);
  if (file) {
    console.log(`Graph file: ${file}`);
  }
  console.log('Press Ctrl+C to stop');

  // Keep process running
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.stop();
    process.exit(0);
  });
}

export default open;
