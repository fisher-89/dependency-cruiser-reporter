/**
 * Unit tests: archiToRules() process.exit replacement
 *
 * Verifies that `archiToRules()` throws Error instead of calling
 * `process.exit(1)` for all error conditions that previously used
 * process.exit. This ensures the function can be reused by both the CLI
 * layer (which catches and calls process.exit) and the HTTP server layer
 * (which catches and returns HTTP 500).
 *
 * Coverage targets (from test-design.md):
 *   - B-10: archiToRules() throws when architecture directory not found
 *   - B-11: archiToRules() throws when no .c4 files found
 *   - B-12: archiToRules() throws when C4 parse errors occur
 *   - B-13: archiToRules() throws when paths do not exist on disk
 *   - AC-7: all 4 process.exit(1) replacement points verified
 *
 * Note: mock.module() for @likec4/language-services/node does NOT intercept
 * dynamic import() when tsx's ESM loader is active.  Instead, we control the
 * real LikeC4 parser via fs mock content (valid C4 for success, invalid C4
 * for parse errors).
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

// ---------------------------------------------------------------------------
// Valid C4 DSL for positive path
// ---------------------------------------------------------------------------
const validC4 = `specification {
  element package
  element module
}
model {
  core = package 'ROOT.core' {
    utils = module 'ROOT.core.utils'
  }
  app = module 'ROOT.app'
}
views {
  view index {
    include *
  }
}
`;

const invalidC4 = 'this is not valid c4 syntax {{{';

// ---------------------------------------------------------------------------
// node:fs mock — registered ONCE at top level
// ---------------------------------------------------------------------------

interface FsMocks {
  existsSync: (path: string) => boolean;
  readdirSync: (path: string) => string[];
  readFileSync: (path: string, encoding?: string) => string;
  writeFileSync: (path: string, data: string, encoding?: string) => void;
  mkdirSync: (path: string, options?: object) => void;
}

const defaultFsMocks: FsMocks = {
  existsSync: () => true,
  readdirSync: () => ['main.c4'],
  readFileSync: () => validC4,
  writeFileSync: () => undefined,
  mkdirSync: () => undefined,
};

let currentFsMocks: FsMocks = { ...defaultFsMocks };

mock.module('node:fs', {
  exports: {
    existsSync: (path: string) => currentFsMocks.existsSync(path),
    readdirSync: (path: string) => currentFsMocks.readdirSync(path),
    readFileSync: (path: string, encoding?: string) =>
      currentFsMocks.readFileSync(path, encoding),
    writeFileSync: (path: string, data: string, encoding?: string) =>
      currentFsMocks.writeFileSync(path, data, encoding),
    mkdirSync: (path: string, options?: object) =>
      currentFsMocks.mkdirSync(path, options),
  },
});

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('archiToRules() process.exit replacement', () => {
  afterEach(() => {
    mock.restoreAll();
    currentFsMocks = { ...defaultFsMocks };
  });

  // Cross-platform path check: on Windows join() uses backslashes
  function isArchDir(path: string): boolean {
    return path.includes('.dc-reporter') && path.includes('architecture');
  }

  // =========================================================================
  // B-10: Architecture directory not found
  // =========================================================================
  it('B-10: archiToRules() throws Error when architecture directory not found', async () => {
    currentFsMocks = {
      ...defaultFsMocks,
      existsSync: (path: string) => !isArchDir(path),
    };

    const { archiToRules } = await import(
      '../../../../../../packages/cli/src/commands/archi-to-rules'
    );

    await assert.rejects(
      async () => archiToRules({ cwd: '/test/project' }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(
          (err as Error).message.includes('Architecture directory not found'),
          `Expected "Architecture directory not found", got: ${(err as Error).message}`,
        );
        return true;
      },
    );
  });

  // =========================================================================
  // B-11: No .c4 files found
  // =========================================================================
  it('B-11: archiToRules() throws Error when no .c4 files found', async () => {
    currentFsMocks = {
      ...defaultFsMocks,
      readdirSync: () => ['some-file.txt', 'README.md'],
    };

    const { archiToRules } = await import(
      '../../../../../../packages/cli/src/commands/archi-to-rules'
    );

    await assert.rejects(
      async () => archiToRules({ cwd: '/test/project' }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(
          (err as Error).message.includes('No .c4 files found'),
          `Expected "No .c4 files found", got: ${(err as Error).message}`,
        );
        return true;
      },
    );
  });

  // =========================================================================
  // B-12: C4 parse errors
  // =========================================================================
  it('B-12: archiToRules() throws Error when C4 parse errors occur', async () => {
    // Provide invalid C4 content — the real LikeC4 parser will flag errors
    currentFsMocks = {
      ...defaultFsMocks,
      readFileSync: () => invalidC4,
    };

    const { archiToRules } = await import(
      '../../../../../../packages/cli/src/commands/archi-to-rules'
    );

    await assert.rejects(
      async () => archiToRules({ cwd: '/test/project' }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(
          (err as Error).message.includes('C4 parse errors'),
          `Expected "C4 parse errors", got: ${(err as Error).message}`,
        );
        return true;
      },
    );
  });

  // =========================================================================
  // B-13: Paths do not exist on disk (validation failure)
  // =========================================================================
  it('B-13: archiToRules() throws Error when resolved paths do not exist on disk', async () => {
    // Valid C4 is parsed by the real LikeC4 parser (producing elements).
    // Then we make those element paths not exist on disk.
    currentFsMocks = {
      ...defaultFsMocks,
      existsSync: (path: string) => {
        if (isArchDir(path)) return true;
        // All resolved element paths return false (not found)
        return false;
      },
      readdirSync: (path: string) => {
        if (isArchDir(path)) return ['main.c4'];
        return [];
      },
    };

    const { archiToRules } = await import(
      '../../../../../../packages/cli/src/commands/archi-to-rules'
    );

    await assert.rejects(
      async () => archiToRules({ cwd: '/test/project' }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(
          (err as Error).message.includes('paths do not exist on disk'),
          `Expected "paths do not exist on disk", got: ${(err as Error).message}`,
        );
        return true;
      },
    );
  });

  // =========================================================================
  // Positive path: archiToRules() resolves when everything is valid
  // =========================================================================
  it('archiToRules() resolves without throwing when everything is valid', async () => {
    // Default mocks: arch dir exists, .c4 files found, valid C4 content
    // The real LikeC4 parser processes the valid C4 and produces a valid model.
    const { archiToRules } = await import(
      '../../../../../../packages/cli/src/commands/archi-to-rules'
    );

    await assert.doesNotReject(async () => {
      await archiToRules({ cwd: '/test/project' });
    });
  });

  // =========================================================================
  // Regression: process.exit(1) is NOT called directly by archiToRules()
  // =========================================================================
  it('regression: archiToRules() does not call process.exit(1) when error occurs', async () => {
    currentFsMocks = {
      ...defaultFsMocks,
      existsSync: (path: string) => !isArchDir(path),
    };

    const exitSpy = mock.method(process, 'exit', () => {
      throw new Error('process.exit was called unexpectedly');
    });

    const { archiToRules } = await import(
      '../../../../../../packages/cli/src/commands/archi-to-rules'
    );

    await assert.rejects(async () => archiToRules({ cwd: '/test/project' }));

    assert.strictEqual(exitSpy.mock.callCount(), 0);
  });
});
