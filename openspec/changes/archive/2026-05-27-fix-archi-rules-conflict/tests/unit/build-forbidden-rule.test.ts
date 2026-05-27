import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildForbiddenRule } from '../../../../../packages/cli/src/commands/archi-to-rules.ts';

// =============================================================================
// buildForbiddenRule unit tests
// =============================================================================
//
// Tests the buildForbiddenRule() function with the new childExclusionSuffixes
// optional parameter for negative lookahead generation (方案 B).
//
// The 4th parameter childExclusionSuffixes is optional:
//   - Not passed  -> old behavior, no negative lookahead
//   - Empty array -> no negative lookahead
//   - Non-empty   -> appends (?!/<suffix>(?=/|\\.)) fragments to from.path
// =============================================================================

describe('buildForbiddenRule', () => {
  // ---------------------------------------------------------------------------
  // AC-1: Parent with multiple children gets negative lookahead exclusion
  // ---------------------------------------------------------------------------

  test('adds negative lookahead for multiple child exclusions (AC-1)', () => {
    const rule = buildForbiddenRule(
      'ROOT.commands',
      'packages/cli/src/commands',
      [],
      ['open', 'analyze']
    );
    assert.strictEqual(
      rule.from.path,
      '^packages/cli/src/commands(?!/open(?=/|\\.))(?!/analyze(?=/|\\.))'
    );
  });

  // ---------------------------------------------------------------------------
  // AC-2: Leaf element with no childExclusionSuffixes — no lookahead
  // ---------------------------------------------------------------------------

  test('omits negative lookahead when childExclusionSuffixes not passed (AC-2)', () => {
    const rule = buildForbiddenRule('ROOT.commands.open', 'packages/cli/src/commands/open', [
      'packages/cli/src/server',
    ]);
    assert.strictEqual(rule.from.path, '^packages/cli/src/commands/open');
  });

  // ---------------------------------------------------------------------------
  // AC-3: No dependencyPaths, no children — plain path only
  // ---------------------------------------------------------------------------

  test('produces plain from.path with no deps and no children (AC-3)', () => {
    const rule = buildForbiddenRule('ROOT.utils', 'src/utils', []);
    assert.strictEqual(rule.from.path, '^src/utils');
    assert.deepEqual(rule.to.pathNot, ['src/utils']);
  });

  // ---------------------------------------------------------------------------
  // Single child — one negative lookahead fragment
  // ---------------------------------------------------------------------------

  test('adds single negative lookahead for one child (B-2)', () => {
    const rule = buildForbiddenRule('ROOT.commands', 'packages/cli/src/commands', [], ['open']);
    assert.strictEqual(rule.from.path, '^packages/cli/src/commands(?!/open(?=/|\\.))');
  });

  // ---------------------------------------------------------------------------
  // Empty exclusion array — no negative lookahead (B-1)
  // ---------------------------------------------------------------------------

  test('omits negative lookahead when exclusion array is empty (B-1)', () => {
    const rule = buildForbiddenRule('ROOT.commands', 'packages/cli/src/commands', [], []);
    assert.strictEqual(rule.from.path, '^packages/cli/src/commands');
  });

  // ---------------------------------------------------------------------------
  // B-4: Child module name matches a directory name in the parent path
  // ---------------------------------------------------------------------------

  test('child suffix matching parent path segment works correctly (B-4)', () => {
    const rule = buildForbiddenRule('ROOT.cli', 'packages/cli/cli', [], ['cli']);

    assert.strictEqual(rule.from.path, '^packages/cli/cli(?!/cli(?=/|\\.))');

    const regex = new RegExp(rule.from.path);
    // Child file should be excluded
    assert.strictEqual(regex.test('packages/cli/cli/cli.ts'), false);
    // Parent-level files should still match
    assert.strictEqual(regex.test('packages/cli/cli.js'), true);
    // Other children should still match
    assert.strictEqual(regex.test('packages/cli/cli/core.ts'), true);
  });

  // ---------------------------------------------------------------------------
  // B-15: Empty string in exclusion array should be filtered
  // ---------------------------------------------------------------------------

  test('filters empty strings from exclusion suffixes (B-15)', () => {
    const rule = buildForbiddenRule('ROOT.x', 'src/x', [], ['valid', '']);
    assert.ok(!rule.from.path.includes('(?!/)'));
    assert.ok(rule.from.path.includes('(?!/valid(?=/|\\.))'));
  });

  // ---------------------------------------------------------------------------
  // AC-5: Special characters in child suffix are escaped
  // ---------------------------------------------------------------------------

  test('escapes regex special characters in child suffix (AC-5)', () => {
    const rule = buildForbiddenRule('ROOT.core', 'packages/core', [], ['core+utils']);
    assert.strictEqual(rule.from.path, '^packages/core(?!/core\\+utils(?=/|\\.))');
  });

  // ---------------------------------------------------------------------------
  // AC-6: Boundary assertion prevents false exclusion (open vs openers)
  // ---------------------------------------------------------------------------

  test('boundary assertion does not exclude prefix-matched files (AC-6)', () => {
    const rule = buildForbiddenRule('ROOT.commands', 'packages/cli/src/commands', [], ['open']);

    const regex = new RegExp(rule.from.path);
    assert.strictEqual(regex.test('packages/cli/src/commands/open.ts'), false);
    assert.strictEqual(regex.test('packages/cli/src/commands/openers.ts'), true);
    assert.strictEqual(regex.test('packages/cli/src/commands/analyze.ts'), true);
  });

  // ---------------------------------------------------------------------------
  // AC-7: Grandchild is excluded by parent (direct child), but the parent
  //       lookahead does NOT contain a separate exclusion for grandchild-only path
  // ---------------------------------------------------------------------------

  test('parent lookahead does not contain grandchild-specific exclusion (AC-7)', () => {
    const rule = buildForbiddenRule('ROOT.commands', 'packages/cli/src/commands', [], ['open']);
    assert.ok(rule.from.path.includes('(?!/open(?=/|\\.))'));
    assert.ok(!rule.from.path.includes('helper'));
  });

  // ---------------------------------------------------------------------------
  // Backward compatibility: old 3-arg signature behavior unchanged
  // ---------------------------------------------------------------------------

  test('3-arg call produces same result as before (backward compat)', () => {
    const rule = buildForbiddenRule('ROOT.utils', 'src/utils', ['src/shared', 'packages/core']);
    assert.strictEqual(rule.from.path, '^src/utils');
    assert.ok(rule.to.pathNot.includes('src/shared'));
    assert.ok(rule.to.pathNot.includes('packages/core'));
  });

  // ---------------------------------------------------------------------------
  // Rule structure validation
  // ---------------------------------------------------------------------------

  test('rule has correct structure (name, severity, from, to)', () => {
    const rule = buildForbiddenRule('ROOT.app', 'packages/app', ['packages/shared']);
    assert.strictEqual(rule.name, 'archi-app');
    assert.strictEqual(rule.severity, 'error');
    assert.ok(rule.from.path);
    assert.ok(Array.isArray(rule.to.pathNot));
    assert.deepEqual(rule.to.dependencyTypes, ['local']);
  });

  test('ROOT prefix is stripped from rule name', () => {
    const rule = buildForbiddenRule('ROOT.shared.utils.parser', 'src/utils/parser', []);
    assert.strictEqual(rule.name, 'archi-shared-utils-parser');
  });

  // ---------------------------------------------------------------------------
  // B-5: Child suffix containing path separator
  // ---------------------------------------------------------------------------

  test('negative lookahead handles child suffix with path separator (B-5)', () => {
    const rule = buildForbiddenRule('ROOT.core', 'packages/core', [], ['src/parser']);
    assert.ok(rule.from.path.includes('(?!/src/parser(?=/|\\.))'));
  });

  // ---------------------------------------------------------------------------
  // Regression: from.path is valid RegExp
  // ---------------------------------------------------------------------------

  test('from.path compiles to valid RegExp without throwing (regression)', () => {
    const rule = buildForbiddenRule(
      'ROOT.commands',
      'packages/cli/src/commands',
      [],
      ['open', 'analyze']
    );
    assert.doesNotThrow(() => new RegExp(rule.from.path));
    assert.ok(new RegExp(rule.from.path) instanceof RegExp);
  });
});
