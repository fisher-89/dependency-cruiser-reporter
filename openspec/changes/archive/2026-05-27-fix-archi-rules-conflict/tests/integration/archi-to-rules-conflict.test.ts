import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

// =============================================================================
// Integration tests: dep-report archi-to-rules
// =============================================================================
//
// These tests verify the full command execution pipeline with real C4 model
// fixtures and a compiled CLI binary. Tests are destructive — they create
// temporary directories that are cleaned up after each run.
//
// Prerequisites:
//   1. Run `pnpm build` to compile the CLI binary
//   2. C4 fixture files exist in tests/fixtures/
//
// Coverage: AC-1 through AC-11
// =============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve CLI binary path (from the cli package's compiled output)
const cliBinary = resolve(__dirname, '../../../../../packages/cli/dist/bin/cli.js');

// Fixtures directory
const fixturesDir = resolve(__dirname, '../fixtures');

interface RulesData {
  forbidden: Array<{
    name: string;
    severity: string;
    from: { path: string };
    to: { pathNot: string[]; dependencyTypes: string[] };
  }>;
}

/**
 * Create a temporary workspace with a .c4 fixture and optional dependency
 * declarations, then run `archi-to-rules` and return the result.
 */
function runArchiToRules(
  fixtureName: string,
  extraOpts: string[] = []
): {
  status: number | null;
  stdout: string;
  stderr: string;
  rulesPath: string;
  rules: RulesData | null;
  workspaceRoot: string;
} {
  const workspaceRoot = join(tmpdir(), `archi-test-${fixtureName}-${Date.now()}`);
  const archDir = join(workspaceRoot, '.dc-reporter', 'architecture');

  mkdirSync(archDir, { recursive: true });

  const fixturePath = join(fixturesDir, `${fixtureName}.c4`);
  if (!existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}`);
  }
  copyFileSync(fixturePath, join(archDir, `${fixtureName}.c4`));

  const result = spawnSync(
    'node',
    [cliBinary, 'archi-to-rules', '--cwd', workspaceRoot, ...extraOpts],
    {
      cwd: __dirname,
      encoding: 'utf-8',
    }
  );

  const rulesPath = join(workspaceRoot, '.dc-reporter', 'archi-rules.json');
  let rules: RulesData | null = null;
  if (existsSync(rulesPath)) {
    try {
      const content = readFileSync(rulesPath, 'utf-8');
      rules = JSON.parse(content);
    } catch {
      // Parsing failed — rules stays null
    }
  }

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    rulesPath,
    rules,
    workspaceRoot,
  };
}

function cleanupWorkspace(workspaceRoot: string): void {
  if (existsSync(workspaceRoot)) {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('archi-to-rules conflict resolution integration', () => {
  const workspaces: string[] = [];

  after(() => {
    for (const ws of workspaces) {
      cleanupWorkspace(ws);
    }
  });

  // =========================================================================
  // AC-1: Parent with two children generates negative lookahead
  // =========================================================================

  test('AC-1: parent with two children gets negative lookahead in from.path', () => {
    const result = runArchiToRules('parent-two-children');
    workspaces.push(result.workspaceRoot);

    assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(result.rules !== null, 'Rules file was generated');
    const rules = result.rules;
    assert.ok(rules.forbidden.length > 0, 'Rules array is not empty');

    const parentRule = rules.forbidden.find((r) => r.name === 'archi-commands');
    assert.ok(parentRule !== undefined, 'Parent rule "archi-commands" exists');

    assert.ok(
      parentRule.from.path.includes('(?!/open(?=/|\\.))'),
      'Parent rule excludes "open" child'
    );
    assert.ok(
      parentRule.from.path.includes('(?!/analyze(?=/|\\.))'),
      'Parent rule excludes "analyze" child'
    );

    const openRule = rules.forbidden.find((r) => r.name === 'archi-commands-open');
    const analyzeRule = rules.forbidden.find((r) => r.name === 'archi-commands-analyze');
    assert.ok(openRule !== undefined, 'Child rule "archi-commands-open" exists');
    assert.ok(analyzeRule !== undefined, 'Child rule "archi-commands-analyze" exists');
    assert.ok(!openRule.from.path.includes('(?!/'), 'Child rule has no lookahead');
    assert.ok(!analyzeRule.from.path.includes('(?!/'), 'Child rule has no lookahead');
  });

  // =========================================================================
  // AC-4: Parent rule does not match child files
  // =========================================================================

  test('AC-4: parent rule regex excludes child file paths', () => {
    const result = runArchiToRules('parent-two-children');
    workspaces.push(result.workspaceRoot);

    assert.ok(result.rules !== null);
    const rules = result.rules;
    const parentRule = rules.forbidden.find((r) => r.name === 'archi-commands');
    assert.ok(parentRule !== undefined);

    const parentRegex = new RegExp(parentRule.from.path);

    assert.strictEqual(
      parentRegex.test('packages/cli/src/commands/open.ts'),
      false,
      'open.ts is excluded by parent rule'
    );
    assert.strictEqual(
      parentRegex.test('packages/cli/src/commands/analyze.ts'),
      false,
      'analyze.ts is excluded by parent rule'
    );
    assert.strictEqual(
      parentRegex.test('packages/cli/src/commands/openers.ts'),
      true,
      'openers.ts still matches parent rule'
    );
    assert.strictEqual(
      parentRegex.test('packages/cli/src/commands/index.ts'),
      true,
      'index.ts still matches parent rule'
    );
  });

  // =========================================================================
  // AC-5: Special characters in child module name are escaped
  // =========================================================================

  test('AC-5: special characters in child module name are regex-escaped', () => {
    const result = runArchiToRules('special-chars-child');
    workspaces.push(result.workspaceRoot);

    assert.ok(result.rules !== null);
    const rules = result.rules;
    const parentRule = rules.forbidden.find((r) => r.name === 'archi-core');
    assert.ok(parentRule !== undefined, 'Parent rule "archi-core" exists');

    assert.ok(
      parentRule.from.path.includes('core_plus_utils'),
      'Parent rule excludes core_plus_utils child'
    );
  });

  // =========================================================================
  // AC-3 + AC-8 + AC-9: Flat model backward compatibility
  // =========================================================================

  test('AC-3/AC-8/AC-9: flat model produces rules without negative lookahead', () => {
    const result = runArchiToRules('flatten-no-children');
    workspaces.push(result.workspaceRoot);

    assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(result.rules !== null);
    const rules = result.rules;

    for (const rule of rules.forbidden) {
      assert.ok(!rule.from.path.includes('(?!/'), `Rule "${rule.name}" has no negative lookahead`);
      assert.ok(rule.name, 'Rule has a name');
      assert.strictEqual(rule.severity, 'error');
      assert.ok(rule.from.path.startsWith('^'), 'from.path starts with ^');
      assert.ok(Array.isArray(rule.to.pathNot), 'to.pathNot is an array');
      assert.deepEqual(rule.to.dependencyTypes, ['local']);
    }

    assert.ok(Array.isArray(rules.forbidden));
    assert.ok(rules.forbidden.length > 0);
  });

  // =========================================================================
  // AC-6: Boundary assertion
  // =========================================================================

  test('AC-6: boundary assertion does not exclude openers when child is open', () => {
    const result = runArchiToRules('parent-two-children');
    workspaces.push(result.workspaceRoot);

    assert.ok(result.rules !== null);
    const rules = result.rules;
    const parentRule = rules.forbidden.find((r) => r.name === 'archi-commands');
    assert.ok(parentRule !== undefined);

    const regex = new RegExp(parentRule.from.path);

    assert.strictEqual(regex.test('packages/cli/src/commands/open.ts'), false);
    assert.strictEqual(regex.test('packages/cli/src/commands/openers.ts'), true);
  });

  // =========================================================================
  // AC-7: Three-level nesting — parent only excludes direct children
  // =========================================================================

  test('AC-7: three-level nesting — parent excludes direct child only', () => {
    const result = runArchiToRules('three-level-nested');
    workspaces.push(result.workspaceRoot);

    assert.ok(result.rules !== null);
    const rules = result.rules;

    const cliRule = rules.forbidden.find((r) => r.name === 'archi-cli');
    assert.ok(cliRule !== undefined, 'Top-level rule "archi-cli" exists');

    assert.ok(cliRule.from.path.includes('commands'), 'cli rule excludes commands child');

    const commandsRule = rules.forbidden.find((r) => r.name === 'archi-cli-commands');
    assert.ok(commandsRule !== undefined, 'Commands rule exists');

    assert.ok(
      commandsRule.from.path.includes('open') || commandsRule.from.path.includes('analyze'),
      'commands rule excludes its direct children'
    );

    const openRule = rules.forbidden.find((r) => r.name === 'archi-cli-commands-open');
    const analyzeRule = rules.forbidden.find((r) => r.name === 'archi-cli-commands-analyze');
    if (openRule) {
      assert.ok(!openRule.from.path.includes('(?!/'), 'Leaf rule has no lookahead');
    }
    if (analyzeRule) {
      assert.ok(!analyzeRule.from.path.includes('(?!/'), 'Leaf rule has no lookahead');
    }
  });

  // =========================================================================
  // AC-8: CLI options unchanged
  // =========================================================================

  test('AC-8: --output option works correctly', () => {
    const result = runArchiToRules('flatten-no-children', ['--output', 'custom-rules.json']);
    workspaces.push(result.workspaceRoot);

    const customPath = join(result.workspaceRoot, 'custom-rules.json');
    assert.ok(existsSync(customPath), 'Custom output file exists');
    const content = readFileSync(customPath, 'utf-8');
    const parsed = JSON.parse(content);
    assert.ok(Array.isArray(parsed.forbidden));
  });

  test('AC-8: --help still lists archi-to-rules command', () => {
    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--help'], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(result.stdout.includes('archi-to-rules'));
    assert.ok(result.stdout.includes('--cwd'));
    assert.ok(result.stdout.includes('--output'));
  });

  // =========================================================================
  // B-13: Mixed model
  // =========================================================================

  test('B-13: mixed parent-child and leaf elements in same model', () => {
    const result = runArchiToRules('parent-two-children');
    workspaces.push(result.workspaceRoot);

    assert.ok(result.rules !== null);
    const rules = result.rules;

    const parentRule = rules.forbidden.find((r) => r.name === 'archi-commands');
    const leafRule = rules.forbidden.find((r) => r.name === 'archi-utils');

    assert.ok(parentRule !== undefined);
    assert.ok(leafRule !== undefined, 'Leaf rule "archi-utils" exists');

    assert.ok(parentRule.from.path.includes('(?!/'), 'Parent rule has lookahead');
    assert.ok(!leafRule.from.path.includes('(?!/'), 'Leaf rule has no lookahead');
  });

  // =========================================================================
  // B-12: Multi-layer nesting
  // =========================================================================

  test('B-12: intermediate layer with no direct children is skipped', () => {
    const result = runArchiToRules('three-level-nested');
    workspaces.push(result.workspaceRoot);

    assert.ok(result.rules !== null);
    const rules = result.rules;

    const cliRule = rules.forbidden.find((r) => r.name === 'archi-cli');
    assert.ok(cliRule !== undefined);

    assert.ok(
      cliRule.from.path.includes('commands') || cliRule.from.path.includes('server'),
      'cli rule excludes direct children'
    );
    // cli should not exclude grandchildren through dedicated lookahead
    const openExclusion = cliRule.from.path.match(/open/g);
    assert.ok(
      !cliRule.from.path.includes('open') || (openExclusion !== null && openExclusion.length <= 1),
      'cli rule does NOT exclude grandchildren'
    );
  });

  // =========================================================================
  // Idempotency
  // =========================================================================

  test('idempotent: same C4 model produces same rules on second run', () => {
    const result1 = runArchiToRules('flatten-no-children');
    workspaces.push(result1.workspaceRoot);

    const result2 = runArchiToRules('flatten-no-children');
    workspaces.push(result2.workspaceRoot);

    assert.strictEqual(result1.status, 0);
    assert.strictEqual(result2.status, 0);

    const json1 = JSON.stringify(result1.rules, null, 2);
    const json2 = JSON.stringify(result2.rules, null, 2);

    assert.strictEqual(json1, json2, 'Same model produces identical rules');
  });
});
