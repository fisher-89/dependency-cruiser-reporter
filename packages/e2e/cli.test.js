import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { spawn, spawnSync, execSync } from "node:child_process";
import { existsSync, rmSync, readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "fixtures");
const sampleCruise = resolve(fixturesDir, "sample-cruise.json");
const outputDir = resolve(__dirname, ".output");

// Resolve CLI binary with absolute path
const cliBinary = resolve(__dirname, "../cli/bin/cli.js");
const monorepoRoot = resolve(__dirname, "../..");

describe("CLI Integration Tests", () => {
	before(() => {
		// Create output directory
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}
	});

	after(() => {
		// Cleanup output directory
		if (existsSync(outputDir)) {
			rmSync(outputDir, { recursive: true, force: true });
		}
	});

	test("--help shows usage", () => {
		const result = spawnSync("node", [cliBinary, "--help"], {
			cwd: __dirname,
			encoding: "utf-8",
		});

		assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);
		assert.ok(result.stdout.includes("dep-report"));
		assert.ok(result.stdout.includes("analyze"));
		assert.ok(result.stdout.includes("open"));
	});

	test("analyze --help shows options", () => {
		const result = spawnSync("node", [cliBinary, "analyze", "--help"], {
			cwd: __dirname,
			encoding: "utf-8",
		});

		assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);
		assert.ok(result.stdout.includes("--input"));
		assert.ok(result.stdout.includes("--output"));
	});

	test("open --help shows options", () => {
		const result = spawnSync("node", [cliBinary, "open", "--help"], {
			cwd: __dirname,
			encoding: "utf-8",
		});

		assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);
		assert.ok(result.stdout.includes("--file"));
		assert.ok(result.stdout.includes("--port"));
	});

	test("analyze requires --input", () => {
		const result = spawnSync("node", [cliBinary, "analyze"], {
			cwd: __dirname,
			encoding: "utf-8",
		});

		assert.notStrictEqual(result.status, 0);
	});

	test("analyze fails with missing input file", () => {
		const result = spawnSync(
			"node",
			[cliBinary, "analyze", "--input", "nonexistent.json"],
			{
				cwd: __dirname,
				encoding: "utf-8",
			}
		);

		assert.notStrictEqual(result.status, 0);
	});
});

describe("Rust Binary Tests", () => {
	test("dcr-aggregate processes sample input", () => {
		const outputPath = resolve(outputDir, "test-graph.json");

		// Check if rust binary exists (use absolute paths from monorepo root)
		const ext = process.platform === "win32" ? ".exe" : "";
		const releaseBinary = resolve(monorepoRoot, `rust/target/release/dcr-aggregate${ext}`);
		const debugBinary = resolve(monorepoRoot, `rust/target/debug/dcr-aggregate${ext}`);

		const binary = existsSync(releaseBinary)
			? releaseBinary
			: existsSync(debugBinary)
				? debugBinary
				: null;

		if (!binary) {
			console.log("Skipping: Rust binary not found (run 'cargo build --release' first)");
			return;
		}

		// Clean up previous output
		if (existsSync(outputPath)) {
			rmSync(outputPath);
		}

		const result = spawnSync(binary, ["--input", sampleCruise, "--output", outputPath], {
			encoding: "utf-8",
		});

		assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);
		assert.ok(existsSync(outputPath), "Output file should exist");

		// Verify output structure
		const content = readFileSync(outputPath, "utf-8");
		const graph = JSON.parse(content);

		assert.ok(graph.nodes, "Should have nodes");
		assert.ok(graph.edges, "Should have edges");
		assert.ok(graph.meta, "Should have meta");
		assert.ok(graph.meta.aggregation_level, "Should have aggregation level");
	});
});

describe("Aggregation Tests", () => {
		const ext = process.platform === "win32" ? ".exe" : "";
		const releaseBinary = resolve(monorepoRoot, `rust/target/release/dcr-aggregate${ext}`);
		const debugBinary = resolve(monorepoRoot, `rust/target/debug/dcr-aggregate${ext}`);
		const rustBinary = existsSync(releaseBinary)
			? releaseBinary
			: existsSync(debugBinary)
				? debugBinary
				: null;

	test("Rust binary: small input stays at file level", () => {
		if (!rustBinary) {
			console.log("Skipping: Rust binary not found");
			return;
		}

		const outputPath = resolve(outputDir, "small-graph.json");
		if (existsSync(outputPath)) rmSync(outputPath);

		const result = spawnSync(rustBinary, ["--input", sampleCruise, "--output", outputPath], {
			encoding: "utf-8",
		});

		assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);
		const graph = JSON.parse(readFileSync(outputPath, "utf-8"));

		assert.strictEqual(graph.meta.aggregation_level, "file");
		assert.strictEqual(graph.meta.original_node_count, graph.meta.aggregated_node_count);
	});

	test("Rust binary: --level directory forces directory aggregation", () => {
		if (!rustBinary) {
			console.log("Skipping: Rust binary not found");
			return;
		}

		const outputPath = resolve(outputDir, "dir-graph.json");
		if (existsSync(outputPath)) rmSync(outputPath);

		const result = spawnSync(rustBinary, [
			"--input", sampleCruise,
			"--output", outputPath,
			"--level", "directory",
		], { encoding: "utf-8" });

		assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);
		const graph = JSON.parse(readFileSync(outputPath, "utf-8"));

		assert.strictEqual(graph.meta.aggregation_level, "directory");
		assert.ok(
			graph.meta.aggregated_node_count <= graph.meta.original_node_count,
			"Aggregated count should be <= original"
		);
		// Directory-level nodes should have node_type "directory"
		assert.ok(
			graph.nodes.some((n) => n.node_type === "directory"),
			"Should have directory-type nodes"
		);
	});

	test("Node.js reAggregateProcessedGraph: directory level reduces node count", async () => {
		// Create a large ProcessedGraph fixture (more than 500 nodes)
		const { reAggregateProcessedGraph } = await import("../cli/dist/commands/convert.js");

		const nodes = [];
		const edges = [];
		// Generate 600 file nodes across 50 directories
		for (let d = 0; d < 50; d++) {
			for (let f = 0; f < 12; f++) {
				const id = `src/dir${d}/file${f}.ts`;
				nodes.push({ id, label: `file${f}.ts`, node_type: "file", path: id, violation_count: 0 });
				// Add cross-directory edges
				if (d > 0 && f === 0) {
					edges.push({ source: id, target: `src/dir0/file0.ts`, edge_type: "local", weight: 1 });
				}
			}
		}

		const graph = {
			nodes,
			edges,
			meta: {
				original_node_count: 600,
				aggregated_node_count: 600,
				aggregation_level: "file",
				total_violations: 0,
			},
			violations: [],
		};

		const result = reAggregateProcessedGraph(graph, 500);

		assert.ok(result.nodes.length < 600, "Should have fewer nodes after aggregation");
		assert.strictEqual(result.meta.aggregation_level, "directory");
		assert.ok(result.nodes.every((n) => n.node_type === "directory"), "All nodes should be directory type");
		// Cross-directory edges should be preserved
		assert.ok(result.edges.length > 0, "Should have cross-directory edges");
	});

	test("Node.js reAggregateProcessedGraph: small graph not aggregated", async () => {
		const { reAggregateProcessedGraph } = await import("../cli/dist/commands/convert.js");

		const graph = {
			nodes: [
				{ id: "src/a.ts", label: "a.ts", node_type: "file", path: "src/a.ts", violation_count: 0 },
				{ id: "src/b.ts", label: "b.ts", node_type: "file", path: "src/b.ts", violation_count: 0 },
			],
			edges: [
				{ source: "src/a.ts", target: "src/b.ts", edge_type: "local", weight: 1 },
			],
			meta: { original_node_count: 2, aggregated_node_count: 2, aggregation_level: "file", total_violations: 0 },
			violations: [],
		};

		const result = reAggregateProcessedGraph(graph, 500);
		assert.strictEqual(result.nodes.length, 2, "Small graph should not be aggregated");
		assert.strictEqual(result.meta.aggregation_level, "file");
	});
});

describe("Open Command Tests", () => {
	test("open command converts raw DC JSON to ProcessedGraph", async () => {
		const port = 3001 + Math.floor(Math.random() * 1000);
		const proc = spawn("node", [cliBinary, "open", "-f", sampleCruise, "-p", String(port)], {
			cwd: __dirname,
			stdio: ["ignore", "pipe", "pipe"],
		});

		// Wait for server start
		await new Promise(resolve => setTimeout(resolve, 2000));

		try {
			const res = await fetch(`http://localhost:${port}/api/graph`, { method: 'POST' });
			const graph = await res.json();

			assert.ok(graph.nodes, "should have nodes array");
			assert.ok(graph.edges, "should have edges array");
			assert.ok(graph.meta, "should have meta object");
			assert.ok(graph.meta.aggregation_level, "should have aggregation_level");
		} finally {
			proc.kill();
		}
	});
});

console.log("Run with: node --test packages/e2e/cli.test.js");