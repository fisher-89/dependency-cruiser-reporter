import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync, readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { aggregate } from '@dcr-reporter/wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "fixtures");
const sampleCruise = resolve(fixturesDir, "sample-cruise.json");
const outputDir = resolve(__dirname, ".output");

// Resolve CLI binary with absolute path
const cliBinary = resolve(__dirname, "../cli/bin/cli.js");

// Check for WASM module
let wasmModule: { aggregate: typeof aggregate } | null = null;
let wasmAvailable = false;

async function tryLoadWasm(): Promise<boolean> {
	try {
		// Dynamic import for WASM module
		const wasm = await import("@dcr-reporter/wasm");
		wasmModule = wasm;
		return true;
	} catch {
		return false;
	}
}

describe("CLI Integration Tests", () => {
	before(async () => {
		// Create output directory
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}
		// Try to load WASM module
		wasmAvailable = await tryLoadWasm();
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

describe("WASM Module Tests", () => {
	test("aggregate processes sample input", () => {
		if (!wasmAvailable || !wasmModule) {
			console.log("Skipping: WASM module not found (run 'wasm-pack build' first)");
			return;
		}

		const content = readFileSync(sampleCruise, "utf-8");
		const graph = wasmModule.aggregate(content, 5000, null) as any;

		assert.ok(graph.nodes, "Should have nodes");
		assert.ok(graph.edges, "Should have edges");
		assert.ok(graph.meta, "Should have meta");
	});

	test("WASM small input stays at file level", () => {
		if (!wasmAvailable || !wasmModule) {
			console.log("Skipping: WASM module not found");
			return;
		}

		const content = readFileSync(sampleCruise, "utf-8");
		const graph = wasmModule.aggregate(content, 5000, null) as any;

		assert.strictEqual(graph.meta.original_node_count, graph.meta.aggregated_node_count);
	});

	test("WASM with expandedDirs parameter", () => {
		if (!wasmAvailable || !wasmModule) {
			console.log("Skipping: WASM module not found");
			return;
		}

		const content = readFileSync(sampleCruise, "utf-8");
		const graph = wasmModule.aggregate(content, 5000, ["src"]) as any;

		assert.ok(graph.meta.expanded_dirs, "Should have expanded_dirs in meta");
	});
});

describe("Open Command Tests", () => {
	test("open command converts raw DC JSON to ProcessedGraph", async () => {
		if (!wasmAvailable) {
			console.log("Skipping: Neither WASM nor Rust binary available");
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
			const graph = await res.json() as any;

			assert.ok(graph.nodes, "should have nodes array");
			assert.ok(graph.edges, "should have edges array");
			assert.ok(graph.meta, "should have meta object");
		} finally {
			proc.kill();
		}
	});
});

console.log("Run with: node --test packages/e2e/cli.test.js");