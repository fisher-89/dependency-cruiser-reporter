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

// Check for Rust binary
const ext = process.platform === "win32" ? ".exe" : "";
const releaseBinary = resolve(monorepoRoot, `rust/target/release/dcr-aggregate${ext}`);
const debugBinary = resolve(monorepoRoot, `rust/target/debug/dcr-aggregate${ext}`);
const rustBinary = existsSync(releaseBinary)
	? releaseBinary
	: existsSync(debugBinary)
		? debugBinary
		: null;

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
		assert.ok(result.stdout.includes("-p"));
		assert.ok(result.stdout.includes("-o"));
		assert.ok(result.stdout.includes("-c"));
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

	test("analyze requires -p", () => {
		const result = spawnSync("node", [cliBinary, "analyze"], {
			cwd: __dirname,
			encoding: "utf-8",
		});

		assert.notStrictEqual(result.status, 0);
	});

	test("analyze fails with missing input file", () => {
		const result = spawnSync(
			"node",
			[cliBinary, "analyze", "-p", "nonexistent.json"],
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

		if (!rustBinary) {
			console.log("Skipping: Rust binary not found (run 'cargo build --release' first)");
			return;
		}

		// Clean up previous output
		if (existsSync(outputPath)) {
			rmSync(outputPath);
		}

		const result = spawnSync(rustBinary, ["--input", sampleCruise, "--output", outputPath], {
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
});

describe("Open Command Tests", () => {
	test("open command converts raw DC JSON to ProcessedGraph", async () => {
		if (!rustBinary) {
			console.log("Skipping: Rust binary not found");
			return;
		}

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