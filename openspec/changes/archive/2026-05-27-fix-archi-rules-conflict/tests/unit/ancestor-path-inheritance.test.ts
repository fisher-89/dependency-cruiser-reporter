import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildForbiddenRule, buildRulesFile } from '../../../../../packages/cli/src/commands/archi-to-rules.ts';

// =============================================================================
// buildRulesFile + buildForbiddenRule: child exclusion & cascade tests
// =============================================================================
//
// Tests the combined behavior of 方案 B (negative lookahead child exclusion)
// and 方案 C (ancestor dependency cascade inheritance) through the public API:
// buildForbiddenRule and buildRulesFile.
//
// Internal functions (escapeRegex, buildParentChildMap, collectAncestorDeps,
// ancestorFqns) are NOT exported — their behavior is verified indirectly.
// =============================================================================

describe('buildRulesFile -- child exclusion (方案 B)', () => {
  // ---------------------------------------------------------------------------
  // AC-1: Parent with children gets negative lookahead exclusion
  // ---------------------------------------------------------------------------

  test('parent rule gets negative lookahead for direct children (AC-1)', () => {
    const result = buildRulesFile([
      {
        elementFqn: 'ROOT.commands',
        resolvedPath: 'packages/cli/src/commands',
        dependencyPaths: [],
        childExclusionSuffixes: ['open', 'analyze'],
      },
      {
        elementFqn: 'ROOT.commands.open',
        resolvedPath: 'packages/cli/src/commands/open',
        dependencyPaths: ['packages/cli/src/server'],
      },
      {
        elementFqn: 'ROOT.commands.analyze',
        resolvedPath: 'packages/cli/src/commands/analyze',
        dependencyPaths: [],
      },
    ]);

    assert.strictEqual(result.forbidden.length, 3);

    const parentRule = result.forbidden.find((r) => r.name === 'archi-commands')!;
    assert.ok(parentRule);
    assert.strictEqual(
      parentRule.from.path,
      '^packages/cli/src/commands(?!/open(?=/|\\.))(?!/analyze(?=/|\\.))'
    );

    const childRule = result.forbidden.find((r) => r.name === 'archi-commands-open')!;
    assert.ok(childRule);
    assert.strictEqual(childRule.from.path, '^packages/cli/src/commands/open');
  });

  // ---------------------------------------------------------------------------
  // AC-2 / AC-3: Leaf without children has plain from.path
  // ---------------------------------------------------------------------------

  test('leaf elements without children have plain from.path (AC-2, AC-3)', () => {
    const result = buildRulesFile([
      {
        elementFqn: 'ROOT.utils',
        resolvedPath: 'src/utils',
        dependencyPaths: [],
      },
    ]);

    assert.strictEqual(result.forbidden.length, 1);
    assert.strictEqual(result.forbidden[0].from.path, '^src/utils');
  });

  // ---------------------------------------------------------------------------
  // Grandchild NOT excluded by grandparent (AC-7)
  // ---------------------------------------------------------------------------

  test('grandparent excludes direct child only, not grandchild (AC-7)', () => {
    const result = buildRulesFile([
      {
        elementFqn: 'ROOT.commands',
        resolvedPath: 'packages/cli/src/commands',
        dependencyPaths: [],
        childExclusionSuffixes: ['open'],
      },
      {
        elementFqn: 'ROOT.commands.open',
        resolvedPath: 'packages/cli/src/commands/open',
        dependencyPaths: [],
        childExclusionSuffixes: ['helper'],
      },
      {
        elementFqn: 'ROOT.commands.open.helper',
        resolvedPath: 'packages/cli/src/commands/open/helper',
        dependencyPaths: [],
      },
    ]);

    const grandparent = result.forbidden.find((r) => r.name === 'archi-commands')!;
    assert.ok(grandparent.from.path.includes('(?!/open(?=/|\\.))'));
    assert.ok(!grandparent.from.path.includes('helper'));
  });
});

describe('buildRulesFile -- cascade inheritance (方案 C)', () => {
  // ---------------------------------------------------------------------------
  // AC-10: Child inherits ancestor deps in pathNot
  // ---------------------------------------------------------------------------

  test('child pathNot includes inherited ancestor dependency paths (AC-10)', () => {
    const result = buildRulesFile([
      {
        elementFqn: 'ROOT.cli',
        resolvedPath: 'packages/cli',
        dependencyPaths: ['packages/shared'],
      },
      {
        elementFqn: 'ROOT.cli.commands',
        resolvedPath: 'packages/cli/src/commands',
        dependencyPaths: ['packages/cli/src/shared', 'packages/shared'],
      },
      {
        elementFqn: 'ROOT.cli.commands.open',
        resolvedPath: 'packages/cli/src/commands/open',
        dependencyPaths: ['packages/cli/src/server', 'packages/cli/src/shared', 'packages/shared'],
      },
    ]);

    const childRule = result.forbidden.find((r) => r.name === 'archi-cli-commands-open')!;
    assert.ok(childRule);
    assert.ok(childRule.to.pathNot.includes('packages/cli/src/commands/open'));
    assert.ok(childRule.to.pathNot.includes('packages/cli/src/server'));
    assert.ok(childRule.to.pathNot.includes('packages/shared'));
  });

  // ---------------------------------------------------------------------------
  // AC-11: Sibling isolation — one child's deps don't leak to another
  // ---------------------------------------------------------------------------

  test('sibling dependency paths do not cross-pollinate (AC-11)', () => {
    const result = buildRulesFile([
      {
        elementFqn: 'ROOT.cli.commands',
        resolvedPath: 'packages/cli/src/commands',
        dependencyPaths: [],
        childExclusionSuffixes: ['open', 'analyze'],
      },
      {
        elementFqn: 'ROOT.cli.commands.open',
        resolvedPath: 'packages/cli/src/commands/open',
        dependencyPaths: ['packages/cli/src/server'],
      },
      {
        elementFqn: 'ROOT.cli.commands.analyze',
        resolvedPath: 'packages/cli/src/commands/analyze',
        dependencyPaths: [],
      },
    ]);

    const openRule = result.forbidden.find((r) => r.name === 'archi-cli-commands-open')!;
    const analyzeRule = result.forbidden.find((r) => r.name === 'archi-cli-commands-analyze')!;

    assert.ok(openRule.to.pathNot.includes('packages/cli/src/server'));
    assert.ok(!analyzeRule.to.pathNot.includes('packages/cli/src/server'));
    assert.ok(analyzeRule.to.pathNot.includes('packages/cli/src/commands/analyze'));
  });

  // ---------------------------------------------------------------------------
  // B-7: Deduplication of paths in pathNot
  // ---------------------------------------------------------------------------

  test('deduplicates paths in pathNot (B-7)', () => {
    const rule = buildForbiddenRule(
      'ROOT.cli.commands.open',
      'packages/cli/src/commands/open',
      ['packages/cli/src/server', 'packages/cli/src/server', 'packages/shared']
    );

    const serverCount = rule.to.pathNot.filter(
      (p) => p === 'packages/cli/src/server'
    ).length;
    assert.strictEqual(serverCount, 1);
  });

  // ---------------------------------------------------------------------------
  // Root-level element has no inherited deps (B-8)
  // ---------------------------------------------------------------------------

  test('root-level element pathNot only contains self and own deps (B-8)', () => {
    const rule = buildForbiddenRule('ROOT.cli', 'packages/cli', [
      'packages/shared',
    ]);
    assert.deepEqual(rule.to.pathNot, ['packages/cli', 'packages/shared']);
  });
});

describe('buildForbiddenRule -- escaping via public API', () => {
  // ---------------------------------------------------------------------------
  // AC-5: Special characters in child suffix are escaped (tested via buildForbiddenRule)
  // ---------------------------------------------------------------------------

  test('escapes regex special characters in child suffix (AC-5)', () => {
    const rule = buildForbiddenRule('ROOT.core', 'packages/core', [], ['core+utils']);
    assert.strictEqual(rule.from.path, '^packages/core(?!/core\\+utils(?=/|\\.))');
  });

  // ---------------------------------------------------------------------------
  // B-10: Consecutive special characters are all escaped
  // ---------------------------------------------------------------------------

  test('escapes consecutive special characters (B-10)', () => {
    const rule = buildForbiddenRule('ROOT.x', 'packages/x', [], ['a++.b']);
    assert.ok(rule.from.path.includes('(?!/a\\+\\+\\.b(?=/|\\.))'));
  });

  // ---------------------------------------------------------------------------
  // B-11: Non-ASCII passes through unescaped
  // ---------------------------------------------------------------------------

  test('non-ASCII characters pass through unescaped in lookahead (B-11)', () => {
    const rule = buildForbiddenRule('ROOT.x', 'packages/x', [], ['über']);
    assert.ok(rule.from.path.includes('(?!/über(?=/|\\.))'));
  });
});
