import { existsSync, readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

interface ProcessedGraph {
  nodes: {
    id: string;
    label: string;
    node_type: 'file' | 'directory' | 'package';
    path?: string;
    violation_count: number;
    orphan?: boolean;
    children?: string[];
  }[];
  edges: {
    source: string;
    target: string;
    edge_type: 'local' | 'npm' | 'core' | 'dynamic';
    weight: number;
    circular?: boolean;
  }[];
  meta: {
    original_node_count: number;
    aggregated_node_count: number;
    aggregation_level: 'file' | 'directory' | 'package' | 'root';
    total_violations: number;
    expanded_dirs?: string[];
  };
  violations: {
    from: string;
    to: string;
    rule: string;
    severity: 'error' | 'warn' | 'info';
    message?: string;
  }[];
}

function findDcrAggregateBinary(): string | null {
  const isWin = process.platform === 'win32';
  const ext = isWin ? '.exe' : '';

  // Try relative path from CLI dist directory
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const releaseBin = resolve(thisDir, `../../rust/target/release/dcr-aggregate${ext}`);
    if (existsSync(releaseBin)) return releaseBin;
    const debugBin = resolve(thisDir, `../../rust/target/debug/dcr-aggregate${ext}`);
    if (existsSync(debugBin)) return debugBin;
  } catch { }

  return null;
}

/**
 * Convert raw dependency-cruiser JSON to ProcessedGraph using Rust binary.
 * Throws an error if Rust binary is unavailable or fails.
 */
export function convertWithFallback(dcJson: string, maxNodes = 200, expandedDirs?: string[]): ProcessedGraph {
  const binary = findDcrAggregateBinary();

  if (!binary) {
    throw new Error('Rust binary (dcr-aggregate) not found. Please build it with: pnpm build:rust');
  }

  // Write input to temp file for Rust binary
  const tmpDir = mkdtempSync(join(tmpdir(), 'dcr-'));
  const tmpInput = join(tmpDir, 'input.json');
  const tmpOutput = join(tmpDir, 'output.json');
  writeFileSync(tmpInput, dcJson);

  const args = ['--input', tmpInput, '--output', tmpOutput, '--max-nodes', String(maxNodes)];
  if (expandedDirs && expandedDirs.length > 0) {
    args.push('--expanded-dirs', expandedDirs.join(','));
  }

  const result = spawnSync(binary, args, { encoding: 'utf-8' });

  if (result.status !== 0) {
    // Clean up temp files on error
    try {
      unlinkSync(tmpInput);
      unlinkSync(tmpOutput);
      rmdirSync(tmpDir);
    } catch { }
    throw new Error(`Rust binary failed: ${result.stderr || 'Unknown error'}`);
  }

  console.log('convert in rust\n', result.stdout)

  const output = readFileSync(tmpOutput, 'utf-8');
  // Clean up temp files
  try {
    unlinkSync(tmpInput);
    unlinkSync(tmpOutput);
    rmdirSync(tmpDir);
  } catch { }

  return JSON.parse(output) as ProcessedGraph;
}
