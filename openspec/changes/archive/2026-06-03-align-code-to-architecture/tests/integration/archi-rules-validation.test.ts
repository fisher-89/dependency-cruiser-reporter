// Integration test: archi-rules path validation
// AC-9: Every from.path in archi-rules.json points to a real directory or file on disk
// B-9: No rule references old paths (server/actions/ or flat commands/*.ts)
// B-10: Each path is checked with existsSync + statSync for correct type

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync, statSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Project root is 5 levels up from tests/integration/
const projectRoot = resolve(__dirname, "..", "..", "..", "..", "..");
const cliBinary = resolve(projectRoot, "packages", "cli", "bin", "cli.js");
const rulesFilePath = resolve(projectRoot, ".dc-reporter", "archi-rules.json");

interface ArchiRule {
  name?: string;
  from?: { path?: string; pathNot?: string[] };
  to?: { pathNot?: string[] };
  [key: string]: unknown;
}

interface ArchiRulesConfig {
  forbidden?: ArchiRule[];
  rules?: ArchiRule[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
/**
 * Extract the underlying filesystem path from a dependency-cruiser from.path regex.
 *
 * dependency-cruiser from.path fields are regex patterns. The generated rules use:
 *   ^<base-path>(?!/exclusion(?=/|\.))*
 * We strip the regex anchors and lookaheads to recover the plain filesystem path.
 */
function resolveRulePath(rulePath: string): string {
  // Strip leading regex anchor
  let cleanPath = rulePath.replace(/^\^/, "");

  // Strip regex groups, handling nested parentheses (e.g. (?!/bin(?=/|\.)))
  // Repeatedly remove innermost (non-nested) groups until none remain
  let prev: string;
  do {
    prev = cleanPath;
    cleanPath = cleanPath.replace(/\([^()]+\)/g, "");
  } while (cleanPath !== prev);

  // Now resolve relative to project root
  if (cleanPath.startsWith("packages/") || cleanPath.startsWith("src/") || cleanPath.startsWith(".")) {
    return resolve(projectRoot, cleanPath);
  }
  // Otherwise assume absolute or already resolved
  return cleanPath;
}

function pathExistsAndIsExpectedType(path: string): { ok: boolean; detail: string } {
  // Direct exact match
  if (existsSync(path)) {
    try {
      const stat = statSync(path);
      return { ok: true, detail: `${path} (${stat.isDirectory() ? "directory" : "file"})` };
    } catch {
      // fall through to extension check
    }
  }

  // The path may be a source file without its extension (e.g. "analyze" -> "analyze.ts").
  // Check the parent directory for siblings with matching basename + any extension.
  const parentPath = resolve(path, "..");
  const base = basename(path);
  try {
    if (existsSync(parentPath)) {
      const siblings = readdirSync(parentPath);
      const match = siblings.find((f) => {
        const dotIndex = f.lastIndexOf(".");
        return dotIndex > 0 && f.substring(0, dotIndex) === base;
      });
      if (match) {
        const fullPath = resolve(parentPath, match);
        return { ok: true, detail: `${path} -> ${fullPath} (matched via extension)` };
      }
    }
  } catch {
    // ignore read errors
  }

  return { ok: false, detail: `Path does not exist: ${path}` };
}

function collectOldPathRefs(rulePath: string): string[] {
  const issues: string[] = [];
  // B-9: Check for old server/actions/ paths
  if (rulePath.includes("server/actions")) {
    issues.push(`Rule references old server/actions/ path: ${rulePath}`);
  }
  // B-9: Check for flat commands/*.ts paths
  if (/commands\/\w+\.ts$/.test(rulePath)) {
    issues.push(`Rule references flat commands file: ${rulePath}`);
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Step 1: Ensure archi-rules.json exists (run archi-to-rules if needed)
// ---------------------------------------------------------------------------
describe("AC-9: archi-rules path validation", () => {
  it("archi-rules.json exists (run dep-report archi-to-rules if missing)", () => {
    if (!existsSync(rulesFilePath)) {
      // Generate the rules file
      const result = spawnSync("node", [cliBinary, "archi-to-rules"], {
        cwd: projectRoot,
        encoding: "utf-8",
        env: { ...process.env },
        timeout: 60_000,
      });
      assert.strictEqual(
        result.status,
        0,
        `archi-to-rules must succeed to generate rules file\nstderr: ${result.stderr?.slice(-500)}`,
      );
    }
    assert.ok(existsSync(rulesFilePath), `archi-rules.json must exist at ${rulesFilePath}`);
  });

  // -----------------------------------------------------------------------
  // Step 2: Validate each rule's from.path
  // -----------------------------------------------------------------------
  it("every from.path in archi-rules.json points to an existing file or directory", () => {
    const content = readFileSync(rulesFilePath, "utf-8");
    const config = JSON.parse(content) as ArchiRulesConfig;

    // archi-rules.json uses 'forbidden' key for the rules array (dependency-cruiser format)
    const rules = config.forbidden ?? config.rules ?? [];
    assert.ok(Array.isArray(rules), "archi-rules.json should contain a rules array under 'forbidden' key");
    config.rules = rules;

    const failures: string[] = [];
    const oldPathIssues: string[] = [];
    const validPaths: string[] = [];

    for (const rule of config.rules) {
      const ruleName = rule.name ?? "(unnamed)";
      const fromPath = rule.from?.path;

      if (!fromPath) {
        // B-10: Rules without from.path are not expected for generated rules
        failures.push(`Rule "${ruleName}" has no from.path`);
        continue;
      }

      const resolvedPath = resolveRulePath(fromPath);
      const { ok, detail } = pathExistsAndIsExpectedType(resolvedPath);
      if (ok) {
        validPaths.push(`${ruleName}: ${detail}`);
      } else {
        failures.push(`Rule "${ruleName}": ${detail}`);
      }

      // B-9: Check for old path references
      const pathIssues = collectOldPathRefs(fromPath);
      oldPathIssues.push(...pathIssues);
    }

    // Report valid paths for diagnostic purposes
    if (validPaths.length > 0) {
      console.log(`Valid paths (${validPaths.length}):\n  ${validPaths.join("\n  ")}`);
    }

    // Combine failures
    const allIssues = [...failures, ...oldPathIssues];
    assert.ok(
      allIssues.length === 0,
      `Path validation issues found:\n${allIssues.join("\n")}`,
    );
  });
});
