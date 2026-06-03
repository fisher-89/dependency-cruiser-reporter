// Unit tests for archi-rules.json content (part of C4 model content coverage)
// AC-11 (derived): archi-rules.json contains expected rule entries with correct paths
// Verifies at least: archi-cli-actions-analyze, archi-cli-actions-archi-to-rules,
//                    archi-frontend-types, archi-rust-types, archi-rust-lib

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Project root is 6 levels up from tests/unit/archi/
const projectRoot = resolve(__dirname, "..", "..", "..", "..", "..", "..");
const rulesFilePath = resolve(projectRoot, ".dc-reporter", "archi-rules.json");

interface ArchiRule {
  name?: string;
  from?: { path?: string; pathNot?: string[] };
  to?: { pathNot?: string[] };
  [key: string]: unknown;
}

interface ArchiRulesConfig {
  forbidden?: ArchiRule[];
  [key: string]: unknown;
}

function readRules(): ArchiRulesConfig {
  assert.ok(existsSync(rulesFilePath), `archi-rules.json not found at ${rulesFilePath}`);
  const content = readFileSync(rulesFilePath, "utf-8");
  const parsed = JSON.parse(content) as ArchiRulesConfig;
  assert.ok(Array.isArray(parsed.forbidden), "archi-rules.json must have a 'forbidden' array");
  return parsed;
}

function findRuleByName(rules: ArchiRule[], name: string): ArchiRule | undefined {
  return rules.find((r) => r.name === name);
}

describe("archi-rules.json content validation", () => {
  let rules: ArchiRule[];

  it("archi-rules.json exists and is parseable", () => {
    const config = readRules();
    rules = config.forbidden!;
  });

  it("contains archi-cli-actions-analyze rule", () => {
    const rule = findRuleByName(rules, "archi-cli-actions-analyze");
    assert.ok(rule, "Expected rule 'archi-cli-actions-analyze' not found");
    // TODO: Verify from.path points to packages/cli/src/actions/ (or actions/analyze.ts)
    // TODO: Verify to.pathNot restricts allowed dependencies appropriately
  });

  it("contains archi-cli-actions-archi-to-rules rule", () => {
    const rule = findRuleByName(rules, "archi-cli-actions-archi-to-rules");
    assert.ok(rule, "Expected rule 'archi-cli-actions-archi-to-rules' not found");
    // TODO: Verify from.path points to packages/cli/src/actions/ (or actions/archi-to-rules.ts)
  });

  it("contains archi-frontend-types rule", () => {
    const rule = findRuleByName(rules, "archi-frontend-types");
    assert.ok(rule, "Expected rule 'archi-frontend-types' not found");
    // TODO: Verify from.path points to packages/frontend/src/types or types.ts
    // TODO: Verify to.pathNot includes other frontend module paths
  });

  it("contains archi-rust-types rule", () => {
    const rule = findRuleByName(rules, "archi-rust-types");
    assert.ok(rule, "Expected rule 'archi-rust-types' not found");
    // TODO: Verify from.path points to packages/rust/src/types (or types.rs)
  });

  it("contains archi-rust-lib rule", () => {
    const rule = findRuleByName(rules, "archi-rust-lib");
    assert.ok(rule, "Expected rule 'archi-rust-lib' not found");
    // TODO: Verify from.path points to packages/rust/src/lib (or lib.rs)
  });

  it("does not contain rules pointing to old server/actions/ path", () => {
    for (const rule of rules) {
      const fromPath = rule.from?.path || "";
      if (fromPath.includes("server/actions")) {
        assert.fail(
          `Rule "${rule.name}" still references old path: ${fromPath}`,
        );
      }
    }
  });

  it("does not contain rules referencing flat commands/*.ts files", () => {
    for (const rule of rules) {
      const fromPath = rule.from?.path || "";
      // Old flat commands like commands/analyze.ts should no longer appear
      const match = fromPath.match(/commands\/\w+\.ts$/);
      if (match) {
        assert.fail(
          `Rule "${rule.name}" still references flat commands file: ${fromPath}`,
        );
      }
    }
  });
});
