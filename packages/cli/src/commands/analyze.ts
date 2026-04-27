import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface AnalyzeOptions {
	input: string;
	output?: string;
	level?: "file" | "directory" | "package" | "root";
	maxNodes?: number;
}

/**
 * Find the dcr-aggregate binary
 */
function findDcrAggregateBinary(): string | null {
	const isWin = process.platform === "win32";
	const ext = isWin ? ".exe" : "";

	// Try to find in relative path from CLI dist directory
	// This file is at packages/cli/dist/commands/analyze.js
	const thisDir = dirname(fileURLToPath(import.meta.url));
	const relativeBinary = resolve(
		thisDir,
		`../../../rust/target/release/dcr-aggregate${ext}`
	);
	if (existsSync(relativeBinary)) {
		return relativeBinary;
	}

	// Try debug build
	const debugBinary = resolve(
		thisDir,
		`../../../rust/target/debug/dcr-aggregate${ext}`
	);
	if (existsSync(debugBinary)) {
		return debugBinary;
	}

	// Try system PATH
	return isWin ? "dcr-aggregate.exe" : "dcr-aggregate";
}

/**
 * Analyze dependency-cruiser JSON output
 */
export async function analyze(options: AnalyzeOptions): Promise<void> {
	const { input, output = "graph.json", level, maxNodes = 5000 } = options;

	// Validate input file exists
	if (!existsSync(input)) {
		console.error(`Error: Input file not found: ${input}`);
		process.exit(1);
	}

	// Find the binary
	const binary = findDcrAggregateBinary();

	// Build arguments
	const args = ["--input", input, "--output", output, "--max-nodes", String(maxNodes)];

	if (level) {
		args.push("--level", level);
	}

	console.log(`Running: ${binary} ${args.join(" ")}`);

	// Execute the binary (use absolute path to avoid PATH issues on Windows)
	const result = spawnSync(binary!, args, {
		stdio: "inherit",
	});

	if (result.error) {
		console.error(`Error executing dcr-aggregate: ${result.error.message}`);
		process.exit(1);
	}

	if (result.status !== 0) {
		console.error(`dcr-aggregate exited with code ${result.status}`);
		process.exit(result.status ?? 1);
	}

	console.log(`Output written to: ${output}`);
}

export default analyze;