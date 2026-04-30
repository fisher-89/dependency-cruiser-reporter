import { existsSync, readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

interface DcModule {
  source: string;
  dependencies: (DcDependency | string)[];
  valid: boolean;
  orphan?: boolean;
  rules?: { name: string; severity: string }[];
}

interface DcDependency {
  resolved: string;
  moduleSystem: string;
  coreModule: boolean;
  couldNotResolve: boolean;
  dependencyTypes: string[];
  circular?: boolean;
  rules?: { name: string; severity: string }[];
}

interface DcOutput {
  modules: DcModule[];
  summary?: {
    violations: number;
    error: number;
    warn: number;
    info: number;
    totalCruised: number;
    totalDependenciesCruised: number;
  };
}

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

function classifyEdge(dep: DcDependency): 'local' | 'npm' | 'core' | 'dynamic' {
  if (dep.coreModule) return 'core';
  if (dep.couldNotResolve) return 'dynamic';
  if (
    dep.dependencyTypes.some(
      (t) => t === 'npm' || t === 'npm-dev' || t === 'npm-optional' || t === 'npm-peer'
    )
  )
    return 'npm';
  return 'local';
}

function classifySeverity(s: string): 'error' | 'warn' | 'info' {
  if (s === 'error') return 'error';
  if (s === 'warn') return 'warn';
  return 'info';
}

export function convertDcOutput(dcJson: string): ProcessedGraph {
  const dc: DcOutput = JSON.parse(dcJson);

  const nodeMap = new Map<
    string,
    { id: string; label: string; violation_count: number; orphan?: boolean }
  >();
  const violations: ProcessedGraph['violations'] = [];
  const edgeSet = new Map<
    string,
    {
      source: string;
      target: string;
      edge_type: ProcessedGraph['edges'][0]['edge_type'];
      weight: number;
      circular?: boolean;
    }
  >();

  for (const mod of dc.modules) {
    if (!nodeMap.has(mod.source)) {
      const label = mod.source.split('/').pop() || mod.source;
      nodeMap.set(mod.source, { id: mod.source, label, violation_count: 0, orphan: mod.orphan });
    } else if (mod.orphan) {
      const existing = nodeMap.get(mod.source);
      if (existing) existing.orphan = mod.orphan;
    }

    // Module-level violations (orphans)
    if (mod.rules) {
      for (const rule of mod.rules) {
        violations.push({
          from: mod.source,
          to: mod.source,
          rule: rule.name,
          severity: classifySeverity(rule.severity),
        });
        const srcNode = nodeMap.get(mod.source);
        if (srcNode) srcNode.violation_count += 1;
      }
    }

    for (const rawDep of mod.dependencies) {
      // Handle both object format (real DC output) and string format (simplified)
      const dep =
        typeof rawDep === 'string'
          ? {
            resolved: rawDep,
            moduleSystem: 'es6',
            coreModule: false,
            couldNotResolve: false,
            dependencyTypes: ['local' as const],
            circular: false,
          }
          : rawDep;

      if (!nodeMap.has(dep.resolved)) {
        const label = dep.resolved.split('/').pop() || dep.resolved;
        nodeMap.set(dep.resolved, { id: dep.resolved, label, violation_count: 0 });
      }

      const edgeKey = `${mod.source}|${dep.resolved}`;
      const existing = edgeSet.get(edgeKey);
      const edgeType = classifyEdge(dep);
      if (existing) {
        existing.weight += 1;
        if (dep.circular) existing.circular = true;
      } else {
        edgeSet.set(edgeKey, {
          source: mod.source,
          target: dep.resolved,
          edge_type: edgeType,
          weight: 1,
          circular: dep.circular || false,
        });
      }

      if (dep.rules) {
        for (const rule of dep.rules) {
          violations.push({
            from: mod.source,
            to: dep.resolved,
            rule: rule.name,
            severity: classifySeverity(rule.severity),
          });
          const srcNode = nodeMap.get(mod.source);
          if (srcNode) srcNode.violation_count += 1;
        }
      }
    }
  }

  const nodeCount = nodeMap.size;
  let aggregationLevel: 'file' | 'directory' | 'package' | 'root' = 'file';
  if (nodeCount > 20000) aggregationLevel = 'root';
  else if (nodeCount > 5000) aggregationLevel = 'package';
  else if (nodeCount > 1000) aggregationLevel = 'directory';

  const nodes: ProcessedGraph['nodes'] = [];
  for (const [, v] of nodeMap) {
    const node: ProcessedGraph['nodes'][0] = { ...v, node_type: 'file', path: v.id };
    if (!node.orphan) node.orphan = undefined;
    nodes.push(node);
  }

  return {
    nodes,
    edges: [...edgeSet.values()],
    meta: {
      original_node_count: nodeCount,
      aggregated_node_count: nodeCount,
      aggregation_level: aggregationLevel,
      total_violations: violations.length,
    },
    violations,
  };
}

export function findDcrAggregateBinary(): string | null {
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
export function convertWithFallback(dcJson: string, maxNodes = 5000, expandedDirs?: string[]): ProcessedGraph {
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

  const output = readFileSync(tmpOutput, 'utf-8');
  // Clean up temp files
  try {
    unlinkSync(tmpInput);
    unlinkSync(tmpOutput);
    rmdirSync(tmpDir);
  } catch { }

  const graph = JSON.parse(output) as ProcessedGraph;
  if (expandedDirs) {
    graph.meta.expanded_dirs = expandedDirs;
  }
  return graph;
}

/**
 * Compute expanded_dirs from a ProcessedGraph.
 * For file-level nodes, all parent directories are considered expanded.
 * For directory-level nodes, they are collapsed (not expanded).
 */
export function computeExpandedDirs(graph: ProcessedGraph): string[] {
  const expanded = new Set<string>();
  // If there are directory-level nodes, those directories are NOT expanded
  // (they are aggregated). So we only add parent dirs of file-level nodes.
  for (const node of graph.nodes) {
    if (node.node_type === 'file') {
      // Add all parent directories of this file
      const path = node.path ?? node.id;
      const parts = path.split('/');
      for (let i = 1; i < parts.length; i++) {
        expanded.add(parts.slice(0, i).join('/'));
      }
    } else if (node.node_type === 'directory') {
      const path = node.path ?? node.id;
      expanded.add(path)
      const parts = path.split('/');
      for (let i = 1; i < parts.length; i++) {
        expanded.add(parts.slice(0, i).join('/'));
      }
    }
  }

  return Array.from(expanded).sort();
}
