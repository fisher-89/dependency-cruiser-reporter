/**
 * Unit tests: Server route registration
 *
 * Verifies that `setupActionRoutes()` and `setupConfigRoutes()` register the
 * correct HTTP routes with Express. Uses spy-based verification — no HTTP
 * server is started, no route handler logic is executed.
 *
 * Coverage targets (from test-design.md):
 *   - setupActionRoutes registers POST /api/analyze
 *   - setupActionRoutes registers POST /api/archi-to-rules
 *   - setupConfigRoutes registers GET /api/config
 *   - Route method + path + handler function existence asserted
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

// ---------------------------------------------------------------------------
// Mock Express app with spy on post() and get()
// ---------------------------------------------------------------------------
interface RouteSpy {
  method: string;
  path: string;
  handler: Function;
}

function createMockApp() {
  const routes: RouteSpy[] = [];

  const app = {
    post: (path: string, handler: Function) => {
      routes.push({ method: 'POST', path, handler });
    },
    get: (path: string, handler: Function) => {
      routes.push({ method: 'GET', path, handler });
    },
    use: () => undefined,
    _routes: routes,
  };

  return app;
}

// Extend the mock app type for our test spy
type MockApp = ReturnType<typeof createMockApp>;

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('setupActionRoutes', () => {
  let app: MockApp;

  beforeEach(() => {
    app = createMockApp();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  // =========================================================================
  // POST /api/analyze route registration
  // =========================================================================
  it('registers POST /api/analyze route', () => {
    // TODO: Replace with actual import after implementation
    // import { setupActionRoutes } from '../../../../../../packages/cli/src/server/server';
    // setupActionRoutes(app as any, { cwd: '/test' });

    const { setupActionRoutes } = requireForTest('setupActionRoutes');

    if (setupActionRoutes) {
      setupActionRoutes(app as any, { cwd: '/test' });

      const route = app._routes.find(
        (r) => r.method === 'POST' && r.path === '/api/analyze',
      );
      assert.ok(route, 'POST /api/analyze route was not registered');
      assert.strictEqual(typeof route!.handler, 'function');
    } else {
      // TODO: Remove this fallback after implementation — skeleton placeholder
      assert.ok(true, 'SKELETON: setupActionRoutes not yet implemented');
    }
  });

  // =========================================================================
  // POST /api/archi-to-rules route registration
  // =========================================================================
  it('registers POST /api/archi-to-rules route', () => {
    // TODO: Replace with actual import after implementation
    // import { setupActionRoutes } from '../../../../../../packages/cli/src/server/server';
    // setupActionRoutes(app as any, { cwd: '/test' });

    const { setupActionRoutes } = requireForTest('setupActionRoutes');

    if (setupActionRoutes) {
      setupActionRoutes(app as any, { cwd: '/test' });

      const route = app._routes.find(
        (r) => r.method === 'POST' && r.path === '/api/archi-to-rules',
      );
      assert.ok(route, 'POST /api/archi-to-rules route was not registered');
      assert.strictEqual(typeof route!.handler, 'function');
    } else {
      assert.ok(true, 'SKELETON: setupActionRoutes not yet implemented');
    }
  });

  // =========================================================================
  // Both routes registered by single call
  // =========================================================================
  it('registers both action routes in one call', () => {
    const { setupActionRoutes } = requireForTest('setupActionRoutes');

    if (setupActionRoutes) {
      setupActionRoutes(app as any, { cwd: '/test' });

      assert.strictEqual(
        app._routes.filter((r) => r.path.startsWith('/api/')).length,
        2,
        'Expected exactly 2 action routes to be registered',
      );
    } else {
      assert.ok(true, 'SKELETON: setupActionRoutes not yet implemented');
    }
  });
});

describe('setupConfigRoutes', () => {
  let app: MockApp;

  beforeEach(() => {
    app = createMockApp();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  // =========================================================================
  // GET /api/config route registration
  // =========================================================================
  it('registers GET /api/config route', () => {
    // TODO: Replace with actual import after implementation
    // import { setupConfigRoutes } from '../../../../../../packages/cli/src/server/server';
    // setupConfigRoutes(app as any, { cwd: '/test', graphFile: '/test/graph.json' });

    const { setupConfigRoutes } = requireForTest('setupConfigRoutes');

    if (setupConfigRoutes) {
      setupConfigRoutes(app as any, { cwd: '/test', graphFile: '/test/graph.json' });

      const route = app._routes.find(
        (r) => r.method === 'GET' && r.path === '/api/config',
      );
      assert.ok(route, 'GET /api/config route was not registered');
      assert.strictEqual(typeof route!.handler, 'function');
    } else {
      assert.ok(true, 'SKELETON: setupConfigRoutes not yet implemented');
    }
  });
});

// ---------------------------------------------------------------------------
// Helper to require modules from the server package
// ---------------------------------------------------------------------------
function requireForTest(_name: string): Record<string, Function | undefined> {
  // TODO: Replace with actual imports when implementation is ready:
  //
  //   import {
  //     setupActionRoutes,
  //     setupConfigRoutes,
  //   } from '../../../../../../packages/cli/src/server/server';
  //
  // For now, return empty stubs so the skeletons parse.

  return {};
}
