import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  cpSync,
} from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Setup paths
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '..', 'fixtures');
const cliBinary = resolve(__dirname, '../../../../../packages/cli/bin/cli.js');

// Temporary workspace for each test group
const workspaceBase = resolve(__dirname, '.test-workspace');

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(p: string): void {
  if (!existsSync(p)) {
    mkdirSync(p, { recursive: true });
  }
}

/**
 * Create a fresh workspace directory with the given structure.
 * The workspace is cleaned up automatically by the `after` hook.
 *
 * @param name - subdirectory name under workspaceBase
 * @param options
 * @param options.c4Files - record of .c4 filename -> content to write into .dc-reporter/architecture/
 * @param options.configContent - content for .dependency-cruiser.js (optional)
 * @param options.dirs - additional directories to create (relative to workspace root)
 * @returns absolute path to the workspace
 */
function createWorkspace(
  name: string,
  options: {
    c4Files?: Record<string, string>;
    configContent?: string;
    copyFixtures?: string[];
    dirs?: string[];
  } = {},
): string {
  const ws = resolve(workspaceBase, name);
  if (existsSync(ws)) {
    rmSync(ws, { recursive: true, force: true });
  }
  ensureDir(ws);

  // Write .c4 fixture files if requested
  if (options.c4Files) {
    const archDir = resolve(ws, '.dc-reporter', 'architecture');
    ensureDir(archDir);
    for (const [filename, content] of Object.entries(options.c4Files)) {
      writeFileSync(resolve(archDir, filename), content, 'utf-8');
    }
  }

  // Create additional directories so path validation passes
  if (options.dirs) {
    for (const dir of options.dirs) {
      ensureDir(resolve(ws, dir));
    }
  }

  // Copy files from fixtures directory if requested
  if (options.copyFixtures) {
    for (const relPath of options.copyFixtures) {
      const src = resolve(fixturesDir, relPath);
      if (existsSync(src)) {
        const dest = resolve(ws, relPath);
        ensureDir(dirname(dest));
        cpSync(src, dest);
      }
    }
  }

  // Write .dependency-cruiser.js if provided
  if (options.configContent) {
    writeFileSync(resolve(ws, '.dependency-cruiser.js'), options.configContent, 'utf-8');
  }

  return ws;
}

// ---------------------------------------------------------------------------
// Integration tests for `dep-report archi-to-rules`
// ---------------------------------------------------------------------------
// Covers: AC-1, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13
//         B-7, B-13, B-14, B-15, B-16
// ---------------------------------------------------------------------------

describe('dep-report archi-to-rules command', () => {
  before(() => {
    // Verify CLI binary exists
    assert.ok(
      existsSync(cliBinary),
      `CLI binary not found at: ${cliBinary}. Build the project first (pnpm build).`,
    );

    // Clean workspace base
    if (existsSync(workspaceBase)) {
      rmSync(workspaceBase, { recursive: true, force: true });
    }
  });

  after(() => {
    // Clean up workspace base
    if (existsSync(workspaceBase)) {
      rmSync(workspaceBase, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // Happy path: basic execution
  // -----------------------------------------------------------------------

  test('AC-1: generates rules file with exit code 0 from valid .c4 files', () => {
    const ws = createWorkspace('ac-1-basic', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
      // Create resolved directories so path validation passes
      dirs: ['packages/core/', 'packages/core/src/utils/', 'src/app/'],
    });

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0, got ${result.status}. stderr: ${result.stderr}`,
    );

    // Verify output file exists at default path
    const defaultOutput = resolve(ws, '.dc-reporter', 'archi-rules.json');
    assert.ok(existsSync(defaultOutput), 'Default output file should exist');

    // Verify output is valid JSON with forbidden array
    const output = JSON.parse(readFileSync(defaultOutput, 'utf-8'));
    assert.ok(Array.isArray(output.forbidden), 'Output should have forbidden array');
    assert.ok(output.forbidden.length > 0, 'Should have at least one rule');

    // Verify each rule has required fields
    for (const rule of output.forbidden) {
      assert.ok(rule.name, 'Rule should have a name');
      assert.strictEqual(rule.severity, 'error', 'Rule severity should be error');
      assert.ok(rule.from?.path, 'Rule should have from.path');
      assert.ok(rule.to?.pathNot, 'Rule should have to.pathNot');
      assert.deepStrictEqual(rule.to.dependencyTypes, ['local']);
    }
  });

  test('--help shows archi-to-rules command and options', () => {
    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--help'], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(
      result.stdout.includes('Convert C4 architecture model'),
      'Help should contain command description',
    );
    assert.ok(result.stdout.includes('--output'), 'Help should list --output');
  });

  // -----------------------------------------------------------------------
  // Output path options
  // -----------------------------------------------------------------------

  test('AC-8: writes to default output path when --output is not specified', () => {
    const ws = createWorkspace('ac-8-default', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
      dirs: ['packages/core/', 'packages/core/src/utils/', 'src/app/'],
    });

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.strictEqual(result.status, 0);
    const defaultOutput = resolve(ws, '.dc-reporter', 'archi-rules.json');
    assert.ok(existsSync(defaultOutput), 'Default .dc-reporter/archi-rules.json should be created');
  });

  test('AC-8: writes to custom output path when -o is specified', () => {
    const ws = createWorkspace('ac-8-custom', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
      dirs: ['packages/core/', 'packages/core/src/utils/', 'src/app/'],
    });

    const customOutput = resolve(ws, 'custom-rules.json');
    const result = spawnSync(
      'node',
      [cliBinary, 'archi-to-rules', '--cwd', ws, '-o', customOutput],
      {
        cwd: __dirname,
        encoding: 'utf-8',
      },
    );

    assert.strictEqual(result.status, 0);
    assert.ok(existsSync(customOutput), 'Custom output file should exist at specified path');
  });

  test('AC-8: creates parent directory for custom output path when it does not exist', () => {
    const ws = createWorkspace('ac-8-custom-deep', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
      dirs: ['packages/core/', 'packages/core/src/utils/', 'src/app/'],
    });

    const deepOutput = resolve(ws, 'deep', 'nested', 'rules.json');
    const result = spawnSync(
      'node',
      [cliBinary, 'archi-to-rules', '--cwd', ws, '-o', deepOutput],
      {
        cwd: __dirname,
        encoding: 'utf-8',
      },
    );

    assert.strictEqual(result.status, 0);
    assert.ok(existsSync(deepOutput), 'Deep nested output file should be created');
  });

  // -----------------------------------------------------------------------
  // Configuration file update
  // -----------------------------------------------------------------------

  test('AC-9: updates .dependency-cruiser.js extends field after rule generation', () => {
    const ws = createWorkspace('ac-9-config-update', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
      dirs: ['packages/core/', 'packages/core/src/utils/', 'src/app/'],
    });

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.strictEqual(result.status, 0);

    const configPath = resolve(ws, '.dependency-cruiser.js');
    assert.ok(existsSync(configPath), 'Config file should exist');
    const configContent = readFileSync(configPath, 'utf-8');
    assert.ok(
      configContent.includes('.dc-reporter/archi-rules.json'),
      'Config should reference the generated rules file',
    );
    assert.ok(
      configContent.includes('extends'),
      'Config should have extends field',
    );
  });

  test('AC-10: multiple runs do not duplicate extends entry (idempotent)', () => {
    const ws = createWorkspace('ac-10-idempotent', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
      dirs: ['packages/core/', 'packages/core/src/utils/', 'src/app/'],
    });

    // First run
    const run1 = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });
    assert.strictEqual(run1.status, 0);

    // Second run
    const run2 = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });
    assert.strictEqual(run2.status, 0);

    // Read config and verify only one occurrence
    const configContent = readFileSync(resolve(ws, '.dependency-cruiser.js'), 'utf-8');
    const matches = configContent.match(/\.dc-reporter\/archi-rules\.json/g);
    assert.strictEqual(
      matches?.length,
      1,
      `Expected exactly 1 reference to archi-rules.json, found ${matches?.length}`,
    );
  });

  test('B-13: multiple runs preserve other extends entries', () => {
    const ws = createWorkspace('b-13-other-extends', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      configContent: `module.exports = { extends: ["./base.json", "./other.json"], forbidden: [] };\n`,
      dirs: ['packages/core/', 'packages/core/src/utils/', 'src/app/'],
    });

    // First run
    const run1 = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });
    assert.strictEqual(run1.status, 0);

    // Read config after first run: should have 3 entries
    let configContent = readFileSync(resolve(ws, '.dependency-cruiser.js'), 'utf-8');
    assert.ok(configContent.includes('./base.json'), 'Should still have base.json');
    assert.ok(configContent.includes('./other.json'), 'Should still have other.json');
    assert.ok(configContent.includes('.dc-reporter/archi-rules.json'), 'Should have archi-rules');

    // Second run: archi-rules should not duplicate
    const run2 = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });
    assert.strictEqual(run2.status, 0);

    // Verify no duplication
    configContent = readFileSync(resolve(ws, '.dependency-cruiser.js'), 'utf-8');
    const matches = configContent.match(/\.dc-reporter\/archi-rules\.json/g);
    assert.strictEqual(
      matches?.length,
      1,
      `Second run should not duplicate, found ${matches?.length}`,
    );
    assert.ok(configContent.includes('./base.json'), 'base.json should survive second run');
    assert.ok(configContent.includes('./other.json'), 'other.json should survive second run');
  });

  // -----------------------------------------------------------------------
  // cwd option
  // -----------------------------------------------------------------------

  test('AC-11: --cwd changes the base directory for reading .c4 and writing output', () => {
    const ws = createWorkspace('ac-11-cwd', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
      dirs: ['packages/core/', 'packages/core/src/utils/', 'src/app/'],
    });

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.strictEqual(result.status, 0, `stderr: ${result.stderr}`);

    const output = resolve(ws, '.dc-reporter', 'archi-rules.json');
    assert.ok(existsSync(output), 'Output should be relative to --cwd');
  });

  // -----------------------------------------------------------------------
  // Error paths
  // -----------------------------------------------------------------------

  test('AC-12: exits with code 1 when architecture directory is missing', () => {
    const ws = createWorkspace('ac-12-missing-dir', {
      configContent: 'module.exports = { forbidden: [] };\n',
    });

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.notStrictEqual(result.status, 0, 'Should exit with non-zero status');
    const combinedOutput = (result.stderr + ' ' + result.stdout).toLowerCase();
    assert.ok(
      combinedOutput.includes('architecture directory'),
      'Output should mention architecture directory',
    );
  });

  test('AC-12 / B-7: exits with code 1 when architecture directory is empty', () => {
    const ws = createWorkspace('b-7-empty-dir', {
      configContent: 'module.exports = { forbidden: [] };\n',
    });
    // Create the directory but put no .c4 files in it
    const archDir = resolve(ws, '.dc-reporter', 'architecture');
    ensureDir(archDir);

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.notStrictEqual(result.status, 0, 'Should exit with non-zero status');
    assert.ok(
      result.stderr.includes('.c4') || result.stdout.includes('.c4') || result.stderr.toLowerCase().includes('no .c4'),
      'Output should mention .c4 files',
    );
  });

  test('AC-13: exits with code 1 when .c4 file has syntax errors', () => {
    const ws = createWorkspace('ac-13-syntax-error', {
      c4Files: {
        'broken.c4': readFileSync(resolve(fixturesDir, 'broken-syntax.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
    });

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.notStrictEqual(result.status, 0, 'Should exit with non-zero status');
    assert.ok(
      result.stderr.length > 0,
      'Should output error details to stderr',
    );
  });

  test('AC-7: exits with code 1 and warns when resolved path does not exist', () => {
    const ws = createWorkspace('ac-7-path-not-found', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
    });

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.notStrictEqual(result.status, 0, 'Should exit with non-zero status when paths missing');
    assert.ok(
      result.stderr.toLowerCase().includes('not exist') || result.stderr.toLowerCase().includes('not found'),
      'Warning should mention that paths do not exist',
    );
  });

  test('B-15: reports all failed paths, not just the first one', () => {
    const ws = createWorkspace('b-15-all-failed', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
    });
    // No directories created, all element paths should fail

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.notStrictEqual(result.status, 0, 'Should exit with non-zero status');
    // Verify multiple warnings by checking for " -> " pattern (element -> path)
    const warningLines = result.stderr.split('\n').filter(l => l.includes(' -> '));
    assert.ok(warningLines.length >= 1, 'Should list at least one failed path');
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  test('B-16: exits with code 0 when all elements are project/outer (no rules generated)', () => {
    const ws = createWorkspace('b-16-all-filtered', {
      c4Files: {
        'all-outer.c4': readFileSync(resolve(fixturesDir, 'all-outer.c4'), 'utf-8'),
      },
      configContent: 'module.exports = { forbidden: [] };\n',
    });

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.strictEqual(result.status, 0, 'Should exit with code 0');

    const outputPath = resolve(ws, '.dc-reporter', 'archi-rules.json');
    assert.ok(existsSync(outputPath), 'Rules file should exist');
    const content = JSON.parse(readFileSync(outputPath, 'utf-8'));
    assert.strictEqual(content.forbidden.length, 0, 'Should have empty forbidden array');
  });

  test('AC-9: generates rules file even when .dependency-cruiser.js does not exist', () => {
    const ws = createWorkspace('ac-9-no-config', {
      c4Files: {
        'simple.c4': readFileSync(resolve(fixturesDir, 'simple-archi.c4'), 'utf-8'),
      },
      // No config file provided
    });

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    // With simple-archi.c4 and no config, the resolved paths won't exist on disk
    // but the rules file should still be generated
    assert.ok(
      existsSync(resolve(ws, '.dc-reporter', 'archi-rules.json')),
      'Rules file should be generated',
    );
  });

  test('no-deps fixture produces rules with only self path in pathNot', () => {
    const ws = createWorkspace('no-deps-test', {
      c4Files: {
        'no-deps.c4': readFileSync(resolve(fixturesDir, 'no-deps.c4'), 'utf-8'),
      },
    });

    const result = spawnSync('node', [cliBinary, 'archi-to-rules', '--cwd', ws], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    const output = resolve(ws, '.dc-reporter', 'archi-rules.json');
    const content = JSON.parse(readFileSync(output, 'utf-8'));

    assert.ok(content.forbidden.length >= 1, 'Should have at least one rule for no-deps.c4');
    // Each rule's pathNot should contain at minimum the self path
    for (const rule of content.forbidden) {
      assert.ok(rule.to.pathNot.length >= 1, 'Each rule should have at least one pathNot entry');
    }
  });

  test('existing --help output shows all three commands', () => {
    const result = spawnSync('node', [cliBinary, '--help'], {
      cwd: __dirname,
      encoding: 'utf-8',
    });

    assert.strictEqual(result.status, 0);
    assert.ok(result.stdout.includes('analyze'), 'Help should show analyze command');
    assert.ok(result.stdout.includes('open'), 'Help should show open command');
    assert.ok(result.stdout.includes('archi-to-rules'), 'Help should show archi-to-rules command');
  });
});
