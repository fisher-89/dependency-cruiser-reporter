import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolveElementPath } from '../../../../../packages/cli/src/commands/archi-to-rules.ts';

// ---------------------------------------------------------------------------
// Tests for element path resolution
// ---------------------------------------------------------------------------
// Covers: AC-5, AC-6, B-1, B-2, B-6, B-10, B-11, B-12

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeMap(elements: Array<{ id: string; kind: string; links?: Array<{ relative: string }> | null }>): any {
  return new Map(elements.map(e => [e.id, e]));
}

describe('resolveElementPath', () => {
  test('AC-5: uses own link when element has links[0].relative', () => {
    const elements = makeMap([
      { id: 'myapp', kind: 'package', links: [{ relative: 'virtual:packages/myapp' }] },
      { id: 'myapp.utils', kind: 'module' },
    ]);
    const path = resolveElementPath('myapp', [{ relative: 'virtual:packages/myapp' }] as any, elements);
    assert.strictEqual(path, 'packages/myapp');
  });

  test('AC-5: element with own link returns it directly', () => {
    const elements = makeMap([
      { id: 'myapp', kind: 'package' },
    ]);
    const path = resolveElementPath('myapp.utils', [{ relative: 'virtual:lib/utils' }] as any, elements);
    assert.strictEqual(path, 'lib/utils');
  });

  test('AC-6: drills down from package ancestor link when element has no own link', () => {
    // cli.utils.server has no own link
    // Ancestor cli (package) has link: packages/cli/
    // Package ancestor drill-down: packages/cli/src/utils/server/
    const elements = makeMap([
      { id: 'cli', kind: 'package', links: [{ relative: 'virtual:packages/cli/' }] },
      { id: 'cli.utils', kind: 'module' },
      { id: 'cli.utils.server', kind: 'module' },
    ]);

    const path = resolveElementPath('cli.utils.server', null, elements);
    assert.strictEqual(path, 'packages/cli/src/utils/server');
  });

  test('AC-6: drills down from module ancestor link when element has no own link', () => {
    // cli.commands.index with ancestor cli.commands (module) having link
    const elements = makeMap([
      { id: 'cli', kind: 'package' },
      { id: 'cli.commands', kind: 'module', links: [{ relative: 'virtual:packages/cli/src/commands/' }] },
      { id: 'cli.commands.index', kind: 'module' },
    ]);

    const path = resolveElementPath('cli.commands.index', null, elements);
    // Module ancestor drill-down: link_dir/<relative>/
    // relative = "index"
    assert.strictEqual(path, 'packages/cli/src/commands/index');
  });

  test('AC-6: uses default convention when no link found and first segment is package', () => {
    // frontend.App (no links, no ancestor links)
    // First segment frontend kind = package
    const elements = makeMap([
      { id: 'frontend', kind: 'package' },
      { id: 'frontend.App', kind: 'module' },
    ]);

    const path = resolveElementPath('frontend.App', null, elements);
    // Default convention for package-first: packages/frontend/src/App/
    assert.strictEqual(path, 'packages/frontend/src/App');
  });

  test('AC-6: uses default convention when no link found and first segment is non-package', () => {
    const elements = makeMap([
      { id: 'utils', kind: 'module' },
    ]);

    const path = resolveElementPath('utils', null, elements);
    assert.strictEqual(path, 'src/utils');
  });

  test('B-1: strips filename from link URL to produce directory path', () => {
    const path = resolveElementPath('app', [{ relative: 'virtual:src/utils/index.ts' }] as any, new Map() as any);
    assert.strictEqual(path, 'src/utils');
  });

  test('B-2: preserves relative path links without resolving to absolute', () => {
    const path = resolveElementPath('app', [{ relative: 'virtual:../../packages/cli' }] as any, new Map() as any);
    assert.strictEqual(path, '../../packages/cli');
  });

  test('B-6: own link takes precedence over ancestor links', () => {
    // Element has own link, ancestor also has link - own link should be used
    const elements = makeMap([
      { id: 'cli', kind: 'package', links: [{ relative: 'virtual:packages/cli/' }] },
      { id: 'cli.utils', kind: 'module', links: [{ relative: 'virtual:my-own/path' }] },
    ]);

    const path = resolveElementPath('cli.utils', [{ relative: 'virtual:my-own/path' }] as any, elements);
    assert.strictEqual(path, 'my-own/path');
  });

  test('B-10: falls back to default convention when ancestors() returns empty (no parent)', () => {
    // standalone has no own link and no parent (root-level element)
    const elements = makeMap([
      { id: 'standalone', kind: 'module' },
    ]);

    const path = resolveElementPath('standalone', null, elements);
    assert.strictEqual(path, 'src/standalone');
  });

  test('B-11: default convention for FQN depth 1 with package kind', () => {
    const elements = makeMap([
      { id: 'core', kind: 'package' },
    ]);

    const path = resolveElementPath('core', null, elements);
    assert.strictEqual(path, 'packages/core');
  });

  test('B-12: default convention for FQN depth 1 with non-package kind', () => {
    const elements = makeMap([
      { id: 'utils', kind: 'module' },
    ]);

    const path = resolveElementPath('utils', null, elements);
    assert.strictEqual(path, 'src/utils');
  });

  test('ancestor link: non-package/non-module ancestor uses link as prefix with convention path', () => {
    const elements = makeMap([
      { id: 'ROOT', kind: 'project', links: [{ relative: 'virtual:myproj/' }] },
      { id: 'ROOT.myservice', kind: 'package' },
      { id: 'ROOT.myservice.api', kind: 'module' },
    ]);

    const path = resolveElementPath('ROOT.myservice.api', null, elements);
    // ROOT has link myproj/ → prefix + convention
    // ROOT is skipped, myservice is package → myproj/packages/myservice/src/api/
    assert.strictEqual(path, 'myproj/packages/myservice/src/api');
  });

  test('ancestor chain: nearest linked ancestor wins (B-10b)', () => {
    // cli (package) has link, cli.utils should use its link
    const elements = makeMap([
      { id: 'cli', kind: 'package', links: [{ relative: 'virtual:packages/cli/' }] },
      { id: 'cli.utils', kind: 'module' },
    ]);

    const path = resolveElementPath('cli.utils', null, elements);
    // package ancestor link drill-down: packages/cli/src/utils/
    assert.strictEqual(path, 'packages/cli/src/utils');
  });

  test('ancestor chain: non-linked ancestor is skipped', () => {
    const elements = makeMap([
      { id: 'cli', kind: 'package' },
      { id: 'cli.middle', kind: 'module' },
      { id: 'cli.middle.deep', kind: 'module' },
    ]);
    // No links on any ancestor - should fall to default convention
    const path = resolveElementPath('cli.middle.deep', null, elements);
    // Since "cli" is package: packages/cli/src/middle/deep/
    assert.strictEqual(path, 'packages/cli/src/middle/deep');
  });
});
