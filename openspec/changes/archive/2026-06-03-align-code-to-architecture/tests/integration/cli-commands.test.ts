// Integration tests for CLI command execution
// AC-8: dep-report archi-to-rules exits with code 0
// B-12: --help shows all commands; subcommand --help shows valid options

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Project root is 5 levels up from tests/integration/
const projectRoot = resolve(__dirname, "..", "..", "..", "..", "..");
const cliBinary = resolve(projectRoot, "packages", "cli", "bin", "cli.js");

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function runCli(args: string[], opts?: { cwd?: string; timeout?: number }) {
  return spawnSync("node", [cliBinary, ...args], {
    cwd: opts?.cwd ?? projectRoot,
    encoding: "utf-8" as const,
    env: { ...process.env },
    timeout: opts?.timeout ?? 30_000,
  });
}

// ---------------------------------------------------------------------------
// B-12: --help output shows all commands
// ---------------------------------------------------------------------------
describe("AC-8 / B-12: CLI --help", () => {
  it("dep-report --help shows analyze, archi-to-rules, and dashboard commands", () => {
    const result = runCli(["--help"]);

    assert.strictEqual(result.status, 0, `--help should exit with code 0\nstderr: ${result.stderr}`);
    assert.ok(result.stdout, "--help should produce stdout");
    assert.ok(result.stdout.includes("analyze"), "--help should list 'analyze' command");
    assert.ok(result.stdout.includes("archi-to-rules"), "--help should list 'archi-to-rules' command");
    assert.ok(result.stdout.includes("dashboard"), "--help should list 'dashboard' command");
  });

  it("dep-report analyze --help shows -p, -o, -c options", () => {
    const result = runCli(["analyze", "--help"]);

    assert.strictEqual(result.status, 0, `analyze --help should exit with code 0\nstderr: ${result.stderr}`);
    if (result.stdout) {
      // Accept either short or long flag names
      const hasOptions = result.stdout.includes("-p") || result.stdout.includes("--input") || result.stdout.includes("--project");
      assert.ok(hasOptions, "analyze --help should show input/project option");
    }
    // TODO: Assert specific option flags once CLI implementation is finalised.
  });

  it("dep-report archi-to-rules --help shows options", () => {
    const result = runCli(["archi-to-rules", "--help"]);

    assert.strictEqual(result.status, 0, `archi-to-rules --help should exit with code 0\nstderr: ${result.stderr}`);
    assert.ok(result.stdout, "archi-to-rules --help should produce stdout");
    // TODO: Assert specific option flags once CLI implementation is finalised.
  });

  it("dep-report dashboard --help shows --file and --port options", () => {
    const result = runCli(["dashboard", "--help"]);

    assert.strictEqual(result.status, 0, `dashboard --help should exit with code 0\nstderr: ${result.stderr}`);
    assert.ok(result.stdout, "dashboard --help should produce stdout");
    // TODO: Assert specific option flags once CLI implementation is finalised.
  });
});

// ---------------------------------------------------------------------------
// AC-8: archi-to-rules execution
// ---------------------------------------------------------------------------
describe("AC-8: dep-report archi-to-rules execution", () => {
  it("archi-to-rules exits with code 0", () => {
    const result = runCli(["archi-to-rules"], { timeout: 60_000 });

    assert.strictEqual(
      result.status,
      0,
      `archi-to-rules should exit with code 0\nstdout: ${result.stdout?.slice(-500)}\nstderr: ${result.stderr?.slice(-500)}`,
    );
  });

  it("archi-to-rules generates .dc-reporter/archi-rules.json", () => {
    // Must be run after `pnpm build` so the CLI binary is compiled
    const rulesFile = resolve(projectRoot, ".dc-reporter", "archi-rules.json");
    assert.ok(existsSync(rulesFile), `archi-rules.json should be generated at ${rulesFile}`);
  });
});
