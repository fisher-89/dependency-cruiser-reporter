import { existsSync, readFileSync, writeFileSync } from "node:fs";

interface DcModule {
  source: string;
  dependencies: DcDependency[];
  valid: boolean;
}

interface DcDependency {
  resolved: string;
  moduleSystem: string;
  coreModule: boolean;
  couldNotResolve: boolean;
  dependencyTypes: string[];
  followable: boolean;
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
    node_type: "file" | "directory" | "package";
    path?: string;
    violation_count: number;
    children?: string[];
  }[];
  edges: {
    source: string;
    target: string;
    edge_type: "local" | "npm" | "core" | "dynamic";
    weight: number;
  }[];
  meta: {
    original_node_count: number;
    aggregated_node_count: number;
    aggregation_level: "file" | "directory" | "package" | "root";
    total_violations: number;
  };
  violations: {
    from: string;
    to: string;
    rule: string;
    severity: "error" | "warn" | "info";
    message?: string;
  }[];
}

function classifyEdge(dep: DcDependency): "local" | "npm" | "core" | "dynamic" {
  if (dep.coreModule) return "core";
  if (dep.couldNotResolve) return "dynamic";
  if (
    dep.dependencyTypes.some(
      (t) => t === "npm" || t === "npm-dev" || t === "npm-optional" || t === "npm-peer"
    )
  )
    return "npm";
  return "local";
}

function classifySeverity(s: string): "error" | "warn" | "info" {
  if (s === "error") return "error";
  if (s === "warn") return "warn";
  return "info";
}

export function convertDcOutput(dcJson: string): ProcessedGraph {
  const dc: DcOutput = JSON.parse(dcJson);

  const nodeMap = new Map<string, { id: string; label: string; violation_count: number }>();
  const violations: ProcessedGraph["violations"] = [];
  const edgeSet = new Map<string, { source: string; target: string; edge_type: ProcessedGraph["edges"][0]["edge_type"]; weight: number }>();

  for (const mod of dc.modules) {
    if (!nodeMap.has(mod.source)) {
      const label = mod.source.split("/").pop() || mod.source;
      nodeMap.set(mod.source, { id: mod.source, label, violation_count: 0 });
    }

    for (const dep of mod.dependencies) {
      if (!nodeMap.has(dep.resolved)) {
        const label = dep.resolved.split("/").pop() || dep.resolved;
        nodeMap.set(dep.resolved, { id: dep.resolved, label, violation_count: 0 });
      }

      const edgeKey = `${mod.source}|${dep.resolved}`;
      const existing = edgeSet.get(edgeKey);
      const edgeType = classifyEdge(dep);
      if (existing) {
        existing.weight += 1;
      } else {
        edgeSet.set(edgeKey, { source: mod.source, target: dep.resolved, edge_type: edgeType, weight: 1 });
      }

      if (dep.rules) {
        for (const rule of dep.rules) {
          violations.push({
            from: mod.source,
            to: dep.resolved,
            rule: rule.name,
            severity: classifySeverity(rule.severity),
          });
          const node = nodeMap.get(mod.source)!;
          node.violation_count += 1;
        }
      }
    }
  }

  const nodeCount = nodeMap.size;
  let aggregationLevel: "file" | "directory" | "package" | "root" = "file";
  if (nodeCount > 20000) aggregationLevel = "root";
  else if (nodeCount > 5000) aggregationLevel = "package";
  else if (nodeCount > 1000) aggregationLevel = "directory";

  const nodes: ProcessedGraph["nodes"] = [];
  for (const [, v] of nodeMap) {
    nodes.push({ ...v, node_type: "file", path: v.id });
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
  const { input, output = "graph.json" } = options;

  if (!existsSync(input)) {
    console.error(`Error: Input file not found: ${input}`);
    process.exit(1);
  }

  // Try Rust binary first, then fall back to Node.js conversion
  const binary = findDcrAggregateBinary();
  if (binary && existsSync(binary)) {
    const { spawnSync } = await import("node:child_process");
    const args = ["--input", input, "--output", output, "--max-nodes", "5000"];
    console.log(`Running: ${binary} ${args.join(" ")}`);
    const result = spawnSync(binary, args, { stdio: "inherit" });
    if (result.status === 0) {
      console.log(`Output written to: ${output}`);
      return;
    }
    console.warn("Rust binary failed, falling back to Node.js conversion");
  }

  // Fallback: Node.js conversion
  console.log("Using Node.js converter (Rust binary not available)");
  const content = readFileSync(input, "utf-8");
  const graph = convertDcOutput(content);
  writeFileSync(output, JSON.stringify(graph, null, 2));
  console.log(`Output written to: ${output}`);
}

function findDcrAggregateBinary(): string | null {
  const { existsSync: exists } = require("node:fs");
  const { resolve, dirname } = require("node:path");
  const isWin = process.platform === "win32";
  const ext = isWin ? ".exe" : "";

  // Try relative path from CLI dist directory
  try {
    const { fileURLToPath } = require("node:url");
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const releaseBin = resolve(thisDir, `../../../rust/target/release/dcr-aggregate${ext}`);
    if (exists(releaseBin)) return releaseBin;
    const debugBin = resolve(thisDir, `../../../rust/target/debug/dcr-aggregate${ext}`);
    if (exists(debugBin)) return debugBin;
  } catch {}

  return null;
}

/**
 * Re-aggregate an already-processed graph (ProcessedGraph format)
 * Used when open command receives a large pre-processed graph
 */
export function reAggregateProcessedGraph(
  graph: ProcessedGraph,
  maxNodes: number = 500
): ProcessedGraph {
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
  const paths = graph.nodes.map((n) => (n.path || n.id).split("/"));
  const maxPathDepth = Math.max(...paths.map((p) => p.length));

  // Find the deepest depth that stays under maxNodes
  let bestDepth = 1;
  for (let depth = 1; depth < maxPathDepth; depth++) {
    const groupCount = new Set(
      paths.map((parts) => {
        const dirParts = parts.slice(0, -1);
        return dirParts.slice(0, depth).join("/");
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

function aggregateByDirectory(graph: ProcessedGraph, maxDepth: number = 3): ProcessedGraph {
  const nodeMap = new Map<string, { children: string[]; violationCount: number }>();
  const sourceToDir = new Map<string, string>();

  // Group nodes by parent directory (with depth limit for deep paths)
  for (const node of graph.nodes) {
    const path = node.path || node.id;
    const parts = path.split("/");

    // For directory nodes, go up one level; for file nodes, use parent dir
    let dirParts: string[];
    if (node.node_type === "directory") {
      dirParts = parts.slice(0, -1);
    } else {
      dirParts = parts.slice(0, -1);
    }

    // Truncate to max depth for deep paths
    if (dirParts.length > maxDepth) {
      dirParts = dirParts.slice(0, maxDepth);
    }

    const dirId = dirParts.length > 0 ? dirParts.join("/") : "root";

    sourceToDir.set(node.id, dirId);

    if (!nodeMap.has(dirId)) {
      nodeMap.set(dirId, { children: [], violationCount: 0 });
    }
    const entry = nodeMap.get(dirId)!;
    if (node.children) {
      entry.children.push(...node.children);
    } else {
      entry.children.push(node.id);
    }
    entry.violationCount += node.violation_count;
  }

  // Build aggregated nodes
  const nodes: ProcessedGraph["nodes"] = [];
  for (const [id, data] of nodeMap) {
    nodes.push({
      id,
      label: id.split("/").pop() || id,
      node_type: "directory",
      path: id,
      violation_count: data.violationCount,
      children: data.children,
    });
  }

  // Aggregate edges: remap source/target to directory
  const edgeMap = new Map<string, { edge_type: ProcessedGraph["edges"][0]["edge_type"]; weight: number }>();
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

  const edges: ProcessedGraph["edges"] = [];
  for (const [key, data] of edgeMap) {
    const [source, target] = key.split("|");
    edges.push({ source, target, edge_type: data.edge_type, weight: data.weight });
  }

  return {
    nodes,
    edges,
    meta: {
      original_node_count: graph.meta.original_node_count,
      aggregated_node_count: nodes.length,
      aggregation_level: "directory",
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
    const entry = nodeMap.get(pkg)!;
    // Merge children from the source node if it has any
    if (node.children) {
      entry.children.push(...node.children);
    } else {
      entry.children.push(node.id);
    }
    entry.violationCount += node.violation_count;
  }

  // Build aggregated nodes
  const nodes: ProcessedGraph["nodes"] = [];
  for (const [id, data] of nodeMap) {
    nodes.push({
      id,
      label: id,
      node_type: "package",
      path: id,
      violation_count: data.violationCount,
      children: data.children,
    });
  }

  // Aggregate edges
  const edgeMap = new Map<string, { edge_type: ProcessedGraph["edges"][0]["edge_type"]; weight: number }>();
  for (const edge of graph.edges) {
    const srcPkg = sourceToPkg.get(edge.source) || "local";
    const tgtPkg = sourceToPkg.get(edge.target) || "local";

    if (srcPkg === tgtPkg) continue;

    const key = `${srcPkg}|${tgtPkg}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.weight += edge.weight;
    } else {
      edgeMap.set(key, { edge_type: edge.edge_type, weight: edge.weight });
    }
  }

  const edges: ProcessedGraph["edges"] = [];
  for (const [key, data] of edgeMap) {
    const [source, target] = key.split("|");
    edges.push({ source, target, edge_type: data.edge_type, weight: data.weight });
  }

  return {
    nodes,
    edges,
    meta: {
      original_node_count: graph.meta.original_node_count,
      aggregated_node_count: nodes.length,
      aggregation_level: "package",
      total_violations: graph.meta.total_violations,
    },
    violations: graph.violations,
  };
}

function aggregateByRoot(graph: ProcessedGraph): ProcessedGraph {
  const allChildren = graph.nodes.map((n) => n.id);
  const totalViolations = graph.nodes.reduce((sum, n) => sum + n.violation_count, 0);

  return {
    nodes: [
      {
        id: "root",
        label: "root",
        node_type: "package",
        path: "root",
        violation_count: totalViolations,
        children: allChildren,
      },
    ],
    edges: [],
    meta: {
      original_node_count: graph.meta.original_node_count,
      aggregated_node_count: 1,
      aggregation_level: "root",
      total_violations: graph.meta.total_violations,
    },
    violations: graph.violations,
  };
}

function extractPackageFromPath(path: string): string {
  // Check for node_modules pattern
  const nmIdx = path.indexOf("node_modules/");
  if (nmIdx !== -1) {
    const afterNm = path.slice(nmIdx + 13);
    const parts = afterNm.split("/");
    // Handle scoped packages (@org/pkg)
    if (parts[0]?.startsWith("@") && parts.length > 1) {
      return `${parts[0]}/${parts[1]}`;
    }
    return parts[0] || "local";
  }
  return "local";
}
