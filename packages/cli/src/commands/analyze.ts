import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertDcOutput } from './convert.js';

export interface AnalyzeOptions {
  input: string;
  output?: string;
  level?: 'file' | 'directory' | 'package' | 'root';
  maxNodes?: number;
}

/**
 * Find the dcr-aggregate binary
 */
function findDcrAggregateBinary(): string | null {
  const isWin = process.platform === 'win32';
  const ext = isWin ? '.exe' : '';

  try {
    // Try to find in relative path from CLI dist directory
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const releaseBinary = resolve(thisDir, `../../../rust/target/release/dcr-aggregate${ext}`);
    if (existsSync(releaseBinary)) return releaseBinary;

    const debugBinary = resolve(thisDir, `../../../rust/target/debug/dcr-aggregate${ext}`);
    if (existsSync(debugBinary)) return debugBinary;
  } catch {}

  return null;
}

/**
 * Analyze dependency-cruiser JSON output
 */
export async function analyze(options: AnalyzeOptions): Promise<void> {
  const { input, output = 'graph.json', level, maxNodes = 5000 } = options;

  if (!existsSync(input)) {
    console.error(`Error: Input file not found: ${input}`);
    process.exit(1);
  }

  // Try Rust binary first
  const binary = findDcrAggregateBinary();

  if (binary) {
    const args = ['--input', input, '--output', output, '--max-nodes', String(maxNodes)];
    if (level) args.push('--level', level);

    console.log(`Running: ${binary} ${args.join(' ')}`);
    const result = spawnSync(binary, args, { stdio: 'inherit' });

    if (result.status === 0) {
      console.log(`Output written to: ${output}`);
      return;
    }
    console.warn('Rust binary failed, falling back to Node.js converter');
  }

  // Fallback: Node.js conversion
  console.log('Using Node.js converter (Rust binary not available)');

  const content = readFileSync(input, 'utf-8');
  const graph = convertDcOutput(content);
  writeFileSync(output, JSON.stringify(graph, null, 2));

  console.log(`Output written to: ${output}`);
}

export default analyze;
