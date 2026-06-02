/**
 * Unit tests: analyze() process.exit replacement
 *
 * Verifies that `analyze()` throws Error instead of calling `process.exit(1)`
 * when dependency-cruiser produces no output. This ensures the function can be
 * reused by both the CLI layer (which catches and calls process.exit) and the
 * HTTP server layer (which catches and returns HTTP 500).
 *
 * Coverage targets (from test-design.md):
 *   - B-9:  analyze() throws Error when cruise returns no output
 *   - AC-7: process.exit(1) replacement point verified
 *
 * Node.js 24 compatibility:
 *   - All mock.module() calls at TOP LEVEL (before describe), registered ONCE
 *   - Mutable state variables captured by reference in mock closures
 *   - Tests only mutate state variables, never re-register mocks
 *   - afterEach: mock.restoreAll() + state reset
 *   - No mock.method() on ESM namespace objects (frozen)
 *   - No mock.module() with namedExports for subpath-import packages
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

// ---------------------------------------------------------------------------
// Dependency-cruiser mock — registered ONCE at top level
// ---------------------------------------------------------------------------
// dependency-cruiser exports `cruise` as its default export.  We use
// defaultExport with mock.fn() so that the import in analyze.ts resolves
// to our controllable function.  Subpath imports (config-utl/*) are NOT
// mocked and load the real module — their failures are handled by existing
// try-catch blocks in analyze().
//
// Mutable state: tests set this variable; the mock closure reads it.

let currentCruiseOutput: string | null = null;

// cruise is a NAMED export from 'dependency-cruiser'
mock.module('dependency-cruiser', {
  exports: {
    cruise: mock.fn(async () => ({ output: currentCruiseOutput })),
  },
});

// Subpath imports — mock these too so they don't resolve to real modules
// that may have side effects (e.g. reading config files)
mock.module('dependency-cruiser/config-utl/extract-depcruise-options', {
  exports: { default: mock.fn(() => ({})) },
});
mock.module('dependency-cruiser/config-utl/extract-ts-config', {
  exports: { default: mock.fn(() => ({})) },
});

// ---------------------------------------------------------------------------
// node:fs mock — registered ONCE at top level
// ---------------------------------------------------------------------------

interface FsMocks {
  existsSync: (path: string) => boolean;
  mkdirSync: (path: string, options?: object) => undefined;
  writeFileSync: (path: string, data: string, encoding?: string) => undefined;
  readFileSync: (path: string, encoding?: string) => string;
  readdirSync: (path: string) => string[];
}

const defaultFsMocks: FsMocks = {
  existsSync: () => true,
  mkdirSync: () => undefined,
  writeFileSync: () => undefined,
  readFileSync: () => '',
  readdirSync: () => [],
};

let currentFsMocks: FsMocks = { ...defaultFsMocks };

mock.module('node:fs', {
  exports: {
    existsSync: (path: string) => currentFsMocks.existsSync(path),
    mkdirSync: (path: string, options?: object) =>
      currentFsMocks.mkdirSync(path, options),
    writeFileSync: (path: string, data: string, encoding?: string) =>
      currentFsMocks.writeFileSync(path, data, encoding),
    readFileSync: (path: string, encoding?: string) =>
      currentFsMocks.readFileSync(path, encoding),
    readdirSync: (path: string) => currentFsMocks.readdirSync(path),
  },
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('analyze() process.exit replacement', () => {
  afterEach(() => {
    mock.restoreAll();
    currentCruiseOutput = null;
    currentFsMocks = { ...defaultFsMocks };
  });

  // =========================================================================
  // B-9: analyze() throws when cruise returns null output
  // =========================================================================
  it('B-9: analyze() throws Error when cruise returns null output', async () => {
    currentCruiseOutput = null;

    const { analyze } = await import(
      '../../../../../../packages/cli/src/commands/analyze'
    );

    await assert.rejects(
      async () => {
        await analyze({ path: '.' });
      },
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(
          (err as Error).message.includes(
            'dependency-cruiser did not produce output',
          ),
          `Expected message to include "dependency-cruiser did not produce output", got: ${(err as Error).message}`,
        );
        return true;
      },
    );
  });

  // =========================================================================
  // B-9: analyze() throws when cruise returns undefined output
  // =========================================================================
  it('B-9: analyze() throws Error when cruise returns undefined output', async () => {
    currentCruiseOutput = undefined as unknown as string | null;

    const { analyze } = await import(
      '../../../../../../packages/cli/src/commands/analyze'
    );

    await assert.rejects(
      async () => {
        await analyze({ path: '.' });
      },
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(
          (err as Error).message.includes(
            'dependency-cruiser did not produce output',
          ),
        );
        return true;
      },
    );
  });

  // =========================================================================
  // Positive path: analyze() does NOT throw when output is present
  // =========================================================================
  it('analyze() returns output path when cruise produces valid output', async () => {
    currentCruiseOutput = JSON.stringify({ modules: [], summary: {} });

    const { analyze } = await import(
      '../../../../../../packages/cli/src/commands/analyze'
    );

    // Should resolve without throwing
    const result = await analyze({ path: '.' });
    assert.ok(typeof result === 'string');
    assert.ok(result.endsWith('.json'));
  });

  // =========================================================================
  // Regression: process.exit(1) is NOT called directly by analyze()
  // =========================================================================
  it('regression: analyze() does not call process.exit(1) when error occurs', async () => {
    currentCruiseOutput = null;

    // Spy on process.exit — should NOT be called
    const exitSpy = mock.method(process, 'exit', () => {
      throw new Error('process.exit was called unexpectedly');
    });

    const { analyze } = await import(
      '../../../../../../packages/cli/src/commands/analyze'
    );

    // The function should throw an Error, not call process.exit
    await assert.rejects(async () => analyze({ path: '.' }));

    // Verify process.exit was never called
    assert.strictEqual(exitSpy.mock.callCount(), 0);
  });
});
