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

console.log("Run with: node --test packages/e2e/cli.test.js");