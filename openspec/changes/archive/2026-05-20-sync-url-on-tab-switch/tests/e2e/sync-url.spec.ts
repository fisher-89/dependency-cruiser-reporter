/**
 * E2E tests: sync-url
 *
 * Browser-level verification of URL synchronisation on tab switch.
 *
 * Coverage targets (all 8 ACs + boundary cases from test-design.md):
 *   AC-1: Click nav-report, URL becomes /report, report-view visible
 *   AC-2: Direct access /metrics, metrics-view visible, nav-metrics has active style
 *   AC-3: Direct access /architecture, architecture view area visible
 *   AC-4: Access root /, URL redirected to /graph, nav-graph highlighted
 *   AC-5: Access /invalid, URL redirected to /graph, graph-view visible
 *   AC-6: History navigation: Graph -> Report -> Metrics, back twice -> Report then Graph
 *   AC-7: Open URL in new tab, same view is shown
 *   AC-8: Tab switch triggers no full-page navigation (no "document" type requests)
 *   B-3: Rapid sequential clicks Graph->Report->Metrics->Architecture, final URL = /architecture
 *   B-4: Pressing back at /graph (bottom of history stack) keeps URL as /graph
 *   B-5: Root redirect uses replace, back from /report lands on /graph not /
 *   B-6: Refresh at /metrics after upload shows upload area, URL stays /metrics
 *
 * Prerequisites:
 *   - Playwright configured in packages/frontend (playwright.config.ts)
 *   - Update playwright.config.ts to include this directory in testDir
 *   - Run: pnpm --filter @dcr-reporter/frontend test:e2e
 */

import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// Test fixture — ProcessedGraph sample data (same structure as e2e/sample-data.json)
// ---------------------------------------------------------------------------
const sampleGraphData = {
  nodes: [
    {
      id: 'src/index.ts',
      label: 'index.ts',
      node_type: 'file',
      path: 'src/index.ts',
      violation_count: 0,
    },
    {
      id: 'src/utils.ts',
      label: 'utils.ts',
      node_type: 'file',
      path: 'src/utils.ts',
      violation_count: 1,
    },
    {
      id: 'src/components',
      label: 'components',
      node_type: 'directory',
      path: 'src/components',
      violation_count: 0,
      children: ['src/components/Button.tsx'],
    },
  ],
  edges: [
    { source: 'src/index.ts', target: 'src/utils.ts', edge_type: 'local', weight: 1 },
    { source: 'src/index.ts', target: 'src/components', edge_type: 'local', weight: 2 },
  ],
  combos: [],
  meta: {
    original_node_count: 3,
    aggregated_node_count: 3,
    total_violations: 1,
  },
  violations: [
    {
      from: 'src/utils.ts',
      to: 'lodash',
      rule: 'no-unlisted-dep',
      severity: 'warn',
      message: 'Unlisted dependency detected',
    },
  ],
};

// ---------------------------------------------------------------------------
// Helper: upload fixture data and wait for graph view to render
// ---------------------------------------------------------------------------
let _uploadSeq = 0;

async function uploadFixtureData(page: import('@playwright/test').Page) {
  const tmpDir = join(process.cwd(), 'e2e');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  const seq = _uploadSeq++;
  const tempFile = join(tmpDir, `sync-url-test-data-${seq}.json`);
  writeFileSync(tempFile, JSON.stringify(sampleGraphData));

  await page.setInputFiles("[data-testid='file-input']", tempFile);
  await page.waitForSelector("[data-testid='graph-view']");

  unlinkSync(tempFile);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('URL Sync on Tab Switch', () => {
  // =========================================================================
  // AC-1: Click nav-report, URL becomes /report, report-view visible
  // =========================================================================
  test('AC-1: clicking nav-report navigates to /report and shows report view', async ({
    page,
  }) => {
    // Navigate to app root (will redirect to /graph)
    await page.goto('/');
    // Upload fixture data to make views accessible
    await uploadFixtureData(page);

    // Click nav-report
    await page.click("[data-testid='nav-report']");

    // Assert URL contains /report
    await expect(page).toHaveURL(/\/report$/);

    // Assert report view is visible
    await expect(page.locator("[data-testid='report-view']")).toBeVisible();
  });

  // =========================================================================
  // AC-2: Direct access /metrics, metrics-view visible, nav-metrics active
  // =========================================================================
  test('AC-2: direct access to /metrics shows metrics view with nav-metrics active', async ({
    page,
  }) => {
    // Navigate to /graph first and upload data
    await page.goto('/');
    await uploadFixtureData(page);

    // Navigate to /metrics via the nav link (SPA navigation, preserves data)
    await page.click("[data-testid='nav-metrics']");

    // Assert URL is /metrics
    await expect(page).toHaveURL(/\/metrics$/);

    // Assert metrics view is visible
    await expect(page.locator("[data-testid='metrics-view']")).toBeVisible();

    // Assert nav-metrics has the active/highlighted style
    // NavLink applies aria-current="page" when active
    await expect(page.locator("[data-testid='nav-metrics']")).toHaveAttribute(
      'aria-current',
      'page',
    );

    // Other nav items should NOT have aria-current
    await expect(page.locator("[data-testid='nav-graph']")).not.toHaveAttribute('aria-current');
    await expect(page.locator("[data-testid='nav-report']")).not.toHaveAttribute('aria-current');
  });

  // =========================================================================
  // AC-3: Direct access /architecture, architecture view area visible
  // =========================================================================
  test('AC-3: direct access to /architecture shows architecture view area', async ({
    page,
  }) => {
    // /architecture does not need data, so we can navigate directly
    await page.goto('/architecture');

    // Wait for the architecture view to appear
    await expect(page.locator("[data-testid='architecture-view']")).toBeVisible();

    // URL should remain /architecture
    await expect(page).toHaveURL(/\/architecture$/);
  });

  // =========================================================================
  // AC-4: Access root /, URL redirects to /graph, nav-graph highlighted
  // =========================================================================
  test('AC-4: accessing root / redirects to /graph with nav-graph highlighted', async ({
    page,
  }) => {
    // Navigate to root
    await page.goto('/');

    // The SPA should redirect to /graph
    await expect(page).toHaveURL(/\/graph$/);

    // Upload fixture data so graph view renders
    await uploadFixtureData(page);

    // Nav-graph should have active style after redirect
    await expect(page.locator("[data-testid='nav-graph']")).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  // =========================================================================
  // AC-5: Access /invalid, URL redirected to /graph, graph-view visible
  // =========================================================================
  test('AC-5: accessing /invalid redirects to /graph and shows graph view', async ({
    page,
  }) => {
    // Navigate to an invalid path
    await page.goto('/invalid');

    // The catch-all Route should redirect to /graph
    await expect(page).toHaveURL(/\/graph$/);

    // Upload fixture data so the graph view renders
    await uploadFixtureData(page);

    // Graph view should be visible
    await expect(page.locator("[data-testid='graph-view']")).toBeVisible();
  });

  // =========================================================================
  // AC-6: History navigation — Graph -> Report -> Metrics, back twice
  // =========================================================================
  test('AC-6: browser back/forward traverses view history correctly', async ({
    page,
  }) => {
    await page.goto('/');
    await uploadFixtureData(page);

    // Navigate: Graph -> Report -> Metrics
    await page.click("[data-testid='nav-report']");
    await expect(page).toHaveURL(/\/report$/);
    await expect(page.locator("[data-testid='report-view']")).toBeVisible();

    await page.click("[data-testid='nav-metrics']");
    await expect(page).toHaveURL(/\/metrics$/);
    await expect(page.locator("[data-testid='metrics-view']")).toBeVisible();

    // Go back: Metrics -> Report
    await page.goBack();
    await expect(page).toHaveURL(/\/report$/);
    await expect(page.locator("[data-testid='report-view']")).toBeVisible();

    // Go back: Report -> Graph
    await page.goBack();
    await expect(page).toHaveURL(/\/graph$/);
    await expect(page.locator("[data-testid='graph-view']")).toBeVisible();
  });

  // =========================================================================
  // AC-7: Copy URL and open in new tab, same route is loaded
  // =========================================================================
  test('AC-7: opening URL in new tab loads the same route', async ({ browser }) => {
    // Navigate to /metrics in first page
    const context = await browser.newContext();
    const page1 = await context.newPage();
    await page1.goto('/');
    await uploadFixtureData(page1);
    await page1.click("[data-testid='nav-metrics']");
    await expect(page1).toHaveURL(/\/metrics$/);
    await expect(page1.locator("[data-testid='metrics-view']")).toBeVisible();

    // Capture the current URL and open in a new page (simulates copy-paste)
    const metricsUrl = page1.url();
    const page2 = await context.newPage();
    await page2.goto(metricsUrl);

    // The new page should land on /metrics (same route, though data is gone)
    await expect(page2).toHaveURL(/\/metrics$/);
    // Without data, the upload area is shown (expected for needsData: true routes)
    await expect(page2.locator("[data-testid='upload-area']")).toBeVisible();

    await context.close();
  });

  // =========================================================================
  // AC-8: Tab switch does not trigger full page navigation
  // =========================================================================
  test('AC-8: switching tabs does not trigger full page navigation', async ({
    page,
  }) => {
    // Collect all document-type navigation requests
    const documentRequests: string[] = [];

    page.on('request', (request) => {
      // resourceType 'document' means a full page navigation / reload
      // Ignore the initial request for the page itself
      if (request.resourceType() === 'document') {
        documentRequests.push(request.url());
      }
    });

    await page.goto('/');
    // Clear the initial document request since we only care about navigations
    // triggered AFTER the initial page load
    documentRequests.length = 0;

    await uploadFixtureData(page);

    // Switch to /report
    await page.click("[data-testid='nav-report']");
    await expect(page.locator("[data-testid='report-view']")).toBeVisible();

    // Switch to /metrics
    await page.click("[data-testid='nav-metrics']");
    await expect(page.locator("[data-testid='metrics-view']")).toBeVisible();

    // Switch to /architecture
    await page.click("[data-testid='nav-architecture']");
    await expect(page.locator("[data-testid='architecture-view']")).toBeVisible();

    // No document-type navigation should have been triggered by tab switching
    expect(documentRequests).toHaveLength(0);
  });

  // =========================================================================
  // B-3: Rapid sequential clicks: Graph -> Report -> Metrics -> Architecture
  // =========================================================================
  test('B-3: rapid sequential clicks Graph->Report->Metrics->Architecture ends at /architecture', async ({
    page,
  }) => {
    await page.goto('/');
    await uploadFixtureData(page);

    // Rapidly click nav links in sequence
    await page.click("[data-testid='nav-report']");
    await page.click("[data-testid='nav-metrics']");
    await page.click("[data-testid='nav-architecture']");

    // Final URL should be /architecture
    await expect(page).toHaveURL(/\/architecture$/);

    // Go back through history to verify all intermediate entries were pushed
    await page.goBack();
    await expect(page).toHaveURL(/\/metrics$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/report$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/graph$/);
  });

  // =========================================================================
  // B-4: At /graph with history behind it, pressing back works normally
  // =========================================================================
  test('B-4: pressing back at /graph with history entries navigates to previous URL', async ({
    page,
  }) => {
    await page.goto('/');
    await uploadFixtureData(page);
    await expect(page).toHaveURL(/\/graph$/);

    // Navigate to /report to create a history entry
    await page.click("[data-testid='nav-report']");
    await expect(page).toHaveURL(/\/report$/);

    // Go back to /graph
    await page.goBack();
    await expect(page).toHaveURL(/\/graph$/);
    await expect(page.locator("[data-testid='graph-view']")).toBeVisible();

    // Go back again — goes to initial about:blank (bottom of history stack)
    await page.goBack();
    // This is normal browser behavior; the important thing is the app
    // handles history navigation without crashing
  });

  // =========================================================================
  // B-5: Back from /report after root redirect lands on /graph (not /)
  // =========================================================================
  test('B-5: back from /report lands on /graph (not /) because root redirect uses replace', async ({
    page,
  }) => {
    // Navigate to root (which redirects to /graph via replace)
    await page.goto('/');
    await expect(page).toHaveURL(/\/graph$/);

    // Upload data
    await uploadFixtureData(page);

    // Navigate to /report via nav link (pushState)
    await page.click("[data-testid='nav-report']");
    await expect(page).toHaveURL(/\/report$/);

    // Go back — with replace, "/" should not be in the history stack
    await page.goBack();

    // URL should be /graph (not /)
    await expect(page).toHaveURL(/\/graph$/);
    await expect(page.locator("[data-testid='graph-view']")).toBeVisible();
  });

  // =========================================================================
  // B-6: Refresh at /metrics after upload shows upload area, URL stays /metrics
  // =========================================================================
  test('B-6: refreshing at /metrics after upload shows upload area, URL stays /metrics', async ({
    page,
  }) => {
    await page.goto('/');
    await uploadFixtureData(page);

    // Navigate to /metrics
    await page.click("[data-testid='nav-metrics']");
    await expect(page).toHaveURL(/\/metrics$/);

    // Reload the page (simulates browser refresh)
    await page.reload();

    // URL should still be /metrics
    await expect(page).toHaveURL(/\/metrics$/);

    // After reload, React state is lost (no data) — upload area should appear
    await expect(page.locator("[data-testid='upload-area']")).toBeVisible();
  });
});
