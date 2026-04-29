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
  followable: boolean;
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

export interface ProcessedGraph {
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
              followable: true,
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

export async function analyzeWithFallback(options: {
  input: string;
  output?: string;
}): Promise<void> {
  const { input, output = 'graph.json' } = options;

  if (!existsSync(input)) {
    console.error(`Error: Input file not found: ${input}`);
    process.exit(1);
  }

  // Try Rust binary first, then fall back to Node.js conversion
  const binary = findDcrAggregateBinary();
  if (binary && existsSync(binary)) {
    const { spawnSync } = await import('node:child_process');
    const args = ['--input', input, '--output', output, '--max-nodes', '5000'];
    console.log(`Running: ${binary} ${args.join(' ')}`);
    const result = spawnSync(binary, args, { stdio: 'inherit' });
    if (result.status === 0) {
      console.log(`Output written to: ${output}`);
      return;
    }
    console.warn('Rust binary failed, falling back to Node.js conversion');
  }

  // Fallback: Node.js conversion
  console.log('Using Node.js converter (Rust binary not available)');
  const content = readFileSync(input, 'utf-8');
  const graph = convertDcOutput(content);
  writeFileSync(output, JSON.stringify(graph, null, 2));
  console.log(`Output written to: ${output}`);
}

export function findDcrAggregateBinary(): string | null {
  const isWin = process.platform === 'win32';
  const ext = isWin ? '.exe' : '';

  // Try relative path from CLI dist directory
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const releaseBin = resolve(thisDir, `../../../rust/target/release/dcr-aggregate${ext}`);
    if (existsSync(releaseBin)) return releaseBin;
    const debugBin = resolve(thisDir, `../../../rust/target/debug/dcr-aggregate${ext}`);
    if (existsSync(debugBin)) return debugBin;
  } catch {}

  return null;
}

/**
 * Convert raw dependency-cruiser JSON to ProcessedGraph.
 * Tries Rust binary first, falls back to Node.js convertDcOutput.
 * Re-aggregates if node count exceeds maxNodes.
 */
export function convertWithFallback(dcJson: string, maxNodes = 5000): ProcessedGraph {
  const binary = findDcrAggregateBinary();

  if (binary) {
    try {
      // Write input to temp file for Rust binary
      const tmpDir = mkdtempSync(join(tmpdir(), 'dcr-'));
      const tmpInput = join(tmpDir, 'input.json');
      const tmpOutput = join(tmpDir, 'output.json');
      writeFileSync(tmpInput, dcJson);

      const args = ['--input', tmpInput, '--output', tmpOutput, '--max-nodes', String(maxNodes)];
      const result = spawnSync(binary, args, { stdio: 'pipe' });

      if (result.status === 0) {
        const output = readFileSync(tmpOutput, 'utf-8');
        // Clean up temp files
        try {
          unlinkSync(tmpInput);
          unlinkSync(tmpOutput);
          rmdirSync(tmpDir);
        } catch {}
        return JSON.parse(output) as ProcessedGraph;
      }
      console.warn('Rust binary failed, falling back to Node.js converter');
    } catch {
      console.warn('Rust binary failed, falling back to Node.js converter');
    }
  }

  // Node.js fallback: convert then re-aggregate if needed
  const graph = convertDcOutput(dcJson);
  if (graph.nodes.length > maxNodes) {
    return reAggregateProcessedGraph(graph, maxNodes);
  }
  return graph;
}

/**
 * Re-aggregate an already-processed graph (ProcessedGraph format)
 * Used when open command receives a large pre-processed graph
 */
export function reAggregateProcessedGraph(graph: ProcessedGraph, maxNodes = 500): ProcessedGraph {
  const nodeCount = graph.nodes.length;

  // If already small enough, return as-is
  if (nodeCount <= maxNodes) {
    return graph;
  }

  // Calculate optimal depth to get under maxNodes
  const maxDepth = calculateOptimalDepth(graph, maxNodes);
  const result = aggregateByDirectory(graph, maxDepth);

  // If still too large, try package level
  if (result.nodes.length > maxNodes) {
    return aggregateByPackage(result);
  }

  return result;
}

/**
 * Calculate the optimal directory depth to get under maxNodes.
 * Finds the deepest depth that keeps node count below threshold.
 */
function calculateOptimalDepth(graph: ProcessedGraph, maxNodes: number): number {
  const paths = graph.nodes.map((n) => (n.path || n.id).split('/'));
  const maxPathDepth = Math.max(...paths.map((p) => p.length));

  // Find the deepest depth that stays under maxNodes
  let bestDepth = 1;
  for (let depth = 1; depth < maxPathDepth; depth++) {
    const groupCount = new Set(
      paths.map((parts) => {
        const dirParts = parts.slice(0, -1);
        return dirParts.slice(0, depth).join('/');
      })
    ).size;

    if (groupCount <= maxNodes) {
      bestDepth = depth; // Keep going deeper while under threshold
    } else {
      break; // Stop as soon as we exceed
    }
  }

  return bestDepth;
}

function aggregateByDirectory(graph: ProcessedGraph, maxDepth = 3): ProcessedGraph {
  const nodeMap = new Map<string, { children: string[]; violationCount: number }>();
  const sourceToDir = new Map<string, string>();

  // Group nodes by parent directory (with depth limit for deep paths)
  for (const node of graph.nodes) {
    const path = node.path || node.id;
    const parts = path.split('/');

    // For directory nodes, go up one level; for file nodes, use parent dir
    let dirParts: string[];
    if (node.node_type === 'directory') {
      dirParts = parts.slice(0, -1);
    } else {
      dirParts = parts.slice(0, -1);
    }

    // Truncate to max depth for deep paths
    if (dirParts.length > maxDepth) {
      dirParts = dirParts.slice(0, maxDepth);
    }

    const dirId = dirParts.length > 0 ? dirParts.join('/') : 'root';

    sourceToDir.set(node.id, dirId);

    if (!nodeMap.has(dirId)) {
      nodeMap.set(dirId, { children: [], violationCount: 0 });
    }
    const entry = nodeMap.get(dirId) as { children: string[]; violationCount: number };
    if (node.children) {
      entry.children.push(...node.children);
    } else {
      entry.children.push(node.id);
    }
    entry.violationCount += node.violation_count;
  }

  // Build aggregated nodes
  const nodes: ProcessedGraph['nodes'] = [];
  for (const [id, data] of nodeMap) {
    nodes.push({
      id,
      label: id.split('/').pop() || id,
      node_type: 'directory',
      path: id,
      violation_count: data.violationCount,
      children: data.children,
    });
  }

  // Aggregate edges: remap source/target to directory
  const edgeMap = new Map<
    string,
    { edge_type: ProcessedGraph['edges'][0]['edge_type']; weight: number }
  >();
  for (const edge of graph.edges) {
    const srcDir = sourceToDir.get(edge.source) || edge.source;
    const tgtDir = sourceToDir.get(edge.target) || edge.target;

    if (srcDir === tgtDir) continue;

    const key = `${srcDir}|${tgtDir}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.weight += edge.weight;
    } else {
      edgeMap.set(key, { edge_type: edge.edge_type, weight: edge.weight });
    }
  }

  const edges: ProcessedGraph['edges'] = [];
  for (const [key, data] of edgeMap) {
    const [source, target] = key.split('|');
    edges.push({ source, target, edge_type: data.edge_type, weight: data.weight });
  }

  return {
    nodes,
    edges,
    meta: {
      original_node_count: graph.meta.original_node_count,
      aggregated_node_count: nodes.length,
      aggregation_level: 'directory',
      total_violations: graph.meta.total_violations,
    },
    violations: graph.violations,
  };
}

function aggregateByPackage(graph: ProcessedGraph): ProcessedGraph {
  const nodeMap = new Map<string, { children: string[]; violationCount: number }>();
  const sourceToPkg = new Map<string, string>();

  // Group nodes by package (extract from node_modules or use "local")
  for (const node of graph.nodes) {
    const path = node.path || node.id;
    const pkg = extractPackageFromPath(path);

    sourceToPkg.set(node.id, pkg);

    if (!nodeMap.has(pkg)) {
      nodeMap.set(pkg, { children: [], violationCount: 0 });
    }
    const entry = nodeMap.get(pkg) as { children: string[]; violationCount: number };
    // Merge children from the source node if it has any
    if (node.children) {
      entry.children.push(...node.children);
    } else {
      entry.children.push(node.id);
    }
    entry.violationCount += node.violation_count;
  }

  // Build aggregated nodes
  const nodes: ProcessedGraph['nodes'] = [];
  for (const [id, data] of nodeMap) {
    nodes.push({
      id,
      label: id,
      node_type: 'package',
      path: id,
      violation_count: data.violationCount,
      children: data.children,
    });
  }

  // Aggregate edges
  const edgeMap = new Map<
    string,
    { edge_type: ProcessedGraph['edges'][0]['edge_type']; weight: number }
  >();
  for (const edge of graph.edges) {
    const srcPkg = sourceToPkg.get(edge.source) || 'local';
    const tgtPkg = sourceToPkg.get(edge.target) || 'local';

    if (srcPkg === tgtPkg) continue;

    const key = `${srcPkg}|${tgtPkg}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.weight += edge.weight;
    } else {
      edgeMap.set(key, { edge_type: edge.edge_type, weight: edge.weight });
    }
  }

  const edges: ProcessedGraph['edges'] = [];
  for (const [key, data] of edgeMap) {
    const [source, target] = key.split('|');
    edges.push({ source, target, edge_type: data.edge_type, weight: data.weight });
  }

  return {
    nodes,
    edges,
    meta: {
      original_node_count: graph.meta.original_node_count,
      aggregated_node_count: nodes.length,
      aggregation_level: 'package',
      total_violations: graph.meta.total_violations,
    },
    violations: graph.violations,
  };
}

export function aggregateByRoot(graph: ProcessedGraph): ProcessedGraph {
  const allChildren = graph.nodes.map((n) => n.id);
  const totalViolations = graph.nodes.reduce((sum, n) => sum + n.violation_count, 0);

  return {
    nodes: [
      {
        id: 'root',
        label: 'root',
        node_type: 'package',
        path: 'root',
        violation_count: totalViolations,
        children: allChildren,
      },
    ],
    edges: [],
    meta: {
      original_node_count: graph.meta.original_node_count,
      aggregated_node_count: 1,
      aggregation_level: 'root',
      total_violations: graph.meta.total_violations,
    },
    violations: graph.violations,
  };
}

function extractPackageFromPath(path: string): string {
  // Check for node_modules pattern
  const nmIdx = path.indexOf('node_modules/');
  if (nmIdx !== -1) {
    const afterNm = path.slice(nmIdx + 13);
    const parts = afterNm.split('/');
    // Handle scoped packages (@org/pkg)
    if (parts[0]?.startsWith('@') && parts.length > 1) {
      return `${parts[0]}/${parts[1]}`;
    }
    return parts[0] || 'local';
  }
  return 'local';
}
