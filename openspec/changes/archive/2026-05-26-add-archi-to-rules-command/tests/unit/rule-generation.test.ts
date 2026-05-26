import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  buildForbiddenRule,
  buildRulesFile,
} from '../../../../../packages/cli/src/commands/archi-to-rules.ts';

// ---------------------------------------------------------------------------
// Tests for forbidden-rule generation
// ---------------------------------------------------------------------------
// Covers: AC-2, AC-3, AC-4, AC-15, B-3, B-4, B-5

describe('buildForbiddenRule', () => {
  test('AC-2: generates correct rule name with archi- prefix from FQN', () => {
    const rule = buildForbiddenRule('core', 'packages/core', []);
    assert.strictEqual(rule.name, 'archi-core');

    const rule2 = buildForbiddenRule('core.utils', 'packages/core/src/utils', []);
    assert.strictEqual(rule2.name, 'archi-core-utils');
  });

  test('AC-2: rule name converts dots to hyphens', () => {
    const rule = buildForbiddenRule('deeply.nested.module', 'src/deeply/nested/module', []);
    assert.strictEqual(rule.name, 'archi-deeply-nested-module');
  });

  test('AC-3: pathNot includes self path plus all dependency target paths', () => {
    const rule = buildForbiddenRule('core', 'packages/core', [
      'packages/shared',
      'src/utils',
    ]);

    assert.strictEqual(rule.to.pathNot.length, 3, 'pathNot should contain self + 2 dependencies');
    assert.ok(rule.to.pathNot.includes('packages/core'), 'pathNot should include self path');
    assert.ok(rule.to.pathNot.includes('packages/shared'), 'pathNot should include dep path');
    assert.ok(rule.to.pathNot.includes('src/utils'), 'pathNot should include dep path');
  });

  test('AC-4: pathNot contains only self path when element has no dependencies', () => {
    const rule = buildForbiddenRule('app', 'packages/app', []);
    assert.strictEqual(rule.to.pathNot.length, 1, 'pathNot should only contain self path');
    assert.strictEqual(rule.to.pathNot[0], 'packages/app');
  });

  test('AC-15: every rule has dependencyTypes exactly ["local"]', () => {
    const rule = buildForbiddenRule('core', 'packages/core', ['packages/shared']);
    assert.deepStrictEqual(rule.to.dependencyTypes, ['local']);
  });

  test('B-3: hyphens in FQN segments are preserved in rule name', () => {
    const rule = buildForbiddenRule('my-module.sub', 'src/my-module/sub', []);
    // Only dots become hyphens; existing hyphens stay
    assert.strictEqual(rule.name, 'archi-my-module-sub');
  });

  test('B-4: duplicate dependency target paths are deduplicated in pathNot', () => {
    const rule = buildForbiddenRule('core', 'packages/core', [
      'packages/shared',
      'packages/shared', // duplicate
    ]);
    assert.strictEqual(rule.to.pathNot.length, 2, 'duplicate paths should be deduplicated');
  });

  test('B-5: self-referencing dependency does not duplicate self in pathNot', () => {
    const rule = buildForbiddenRule('core', 'packages/core', [
      'packages/core', // same as self
    ]);
    assert.strictEqual(rule.to.pathNot.length, 1, 'self path should appear only once');
    assert.strictEqual(rule.to.pathNot[0], 'packages/core');
  });

  test('rule severity is always error', () => {
    const rule = buildForbiddenRule('core', 'packages/core', []);
    assert.strictEqual(rule.severity, 'error');
  });

  test('rule has comment', () => {
    const rule = buildForbiddenRule('core', 'packages/core', []);
    assert.ok(rule.comment?.includes('Auto-generated from C4 architecture model'));
  });

  test('from.path uses ^ prefix with resolved path', () => {
    const rule = buildForbiddenRule('core', 'packages/core', []);
    assert.strictEqual(rule.from.path, '^packages/core');
  });
});

// ---------------------------------------------------------------------------
// buildRulesFile tests
// ---------------------------------------------------------------------------

describe('buildRulesFile', () => {
  test('generates N rules for N elements', () => {
    const result = buildRulesFile([
      { elementFqn: 'core', resolvedPath: 'packages/core', dependencyPaths: ['packages/shared'] },
      { elementFqn: 'app', resolvedPath: 'packages/app', dependencyPaths: [] },
      { elementFqn: 'utils', resolvedPath: 'src/utils', dependencyPaths: ['packages/core'] },
    ]);

    assert.strictEqual(result.forbidden.length, 3);
    assert.strictEqual(result.forbidden[0].name, 'archi-core');
    assert.strictEqual(result.forbidden[1].name, 'archi-app');
    assert.strictEqual(result.forbidden[2].name, 'archi-utils');
  });

  test('returns { forbidden: [] } for empty input', () => {
    const result = buildRulesFile([]);
    assert.deepStrictEqual(result, { forbidden: [] });
  });

  test('each rule has correct structure', () => {
    const result = buildRulesFile([
      { elementFqn: 'core', resolvedPath: 'packages/core', dependencyPaths: ['packages/shared'] },
    ]);

    const rule = result.forbidden[0];
    assert.ok(rule.name);
    assert.strictEqual(rule.severity, 'error');
    assert.ok(rule.from.path);
    assert.ok(Array.isArray(rule.to.pathNot));
    assert.deepStrictEqual(rule.to.dependencyTypes, ['local']);
  });
});
