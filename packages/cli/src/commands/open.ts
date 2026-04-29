import { existsSync, readFileSync } from 'node:fs';
import { unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type ServerOptions, createServer } from '../server.js';
import { convertDcOutput, reAggregateProcessedGraph } from './convert.js';

export interface OpenOptions {
  file?: string;
  port?: number;
  host?: string;
  /** Max nodes before auto-aggregation (default 500) */
  maxNodes?: number;
}

const DEFAULT_MAX_NODES = 500;

/**
 * Open web viewer with HTTP server
 */
export async function open(options: OpenOptions): Promise<void> {
  const { file, port = 3000, host = 'localhost', maxNodes = DEFAULT_MAX_NODES } = options;

  let graphFile = file;

  // If file is provided, check if it needs aggregation
  if (file && existsSync(file)) {
    try {
      const content = readFileSync(file, 'utf-8');
      let graph = JSON.parse(content);

      // Check if it's raw dependency-cruiser output (has 'modules' array)
      if (graph.modules && Array.isArray(graph.modules)) {
        console.log('Converting dependency-cruiser output to ProcessedGraph...');
        graph = convertDcOutput(content);

        // Write to temp file
        const tempFile = join(tmpdir(), `graph-${Date.now()}.json`);
        writeFileSync(tempFile, JSON.stringify(graph, null, 2));
        graphFile = tempFile;
        console.log(`Converted graph: ${tempFile}`);
      }

      // Check if it's a ProcessedGraph (has nodes/edges/meta)
      if (graph.nodes && graph.edges && graph.meta) {
        const nodeCount = graph.nodes.length;

        if (nodeCount > maxNodes) {
          console.log(`Large graph detected: ${nodeCount} nodes (max: ${maxNodes})`);
          console.log('Auto-aggregating...');

          const aggregated = reAggregateProcessedGraph(graph, maxNodes);
          console.log(
            `Aggregated to ${aggregated.nodes.length} nodes (${aggregated.meta.aggregation_level} level)`
          );

          // Write to temp file
          const tempFile = join(tmpdir(), `graph-${Date.now()}.json`);
          writeFileSync(tempFile, JSON.stringify(aggregated, null, 2));
          graphFile = tempFile;

          console.log(`Using aggregated graph: ${tempFile}`);
        }
      }
    } catch (err) {
      // If parsing fails, just serve the file as-is
      console.warn('Could not parse graph file, serving raw file');
    }
  }

  const serverOptions: ServerOptions = {
    port,
    host,
    graphFile,
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
    // Clean up temp file if we created one
    if (graphFile !== file && graphFile?.includes(tmpdir())) {
      try {
        unlinkSync(graphFile);
      } catch {}
    }
    process.exit(0);
  });
}

export default open;
