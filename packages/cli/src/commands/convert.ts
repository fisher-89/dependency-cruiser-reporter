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
