import { test, expect } from "@playwright/test";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const sampleGraphData = {
  nodes: [
    { id: "src/index.ts", label: "index.ts", node_type: "file", path: "src/index.ts", violation_count: 0 },
    { id: "src/utils.ts", label: "utils.ts", node_type: "file", path: "src/utils.ts", violation_count: 1 },
    { id: "src/components", label: "components", node_type: "directory", path: "src/components", violation_count: 0, children: ["src/components/Button.tsx"] },
  ],
  edges: [
    { source: "src/index.ts", target: "src/utils.ts", edge_type: "local", weight: 1 },
    { source: "src/index.ts", target: "src/components", edge_type: "local", weight: 2 },
  ],
  meta: {
    original_node_count: 3,
    aggregated_node_count: 3,
    aggregation_level: "file",
    total_violations: 1,
  },
  violations: [
    { from: "src/utils.ts", to: "lodash", rule: "no-unlisted-dep", severity: "warn", message: "Unlisted dependency detected" },
  ],
};

test.describe("App", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows upload area on initial load", async ({ page }) => {
    await expect(page.locator("[data-testid='upload-area']")).toBeVisible();
    await expect(page.getByText("Drop JSON file here")).toBeVisible();
  });

  test("displays error for invalid JSON", async ({ page }) => {
    // Create a temp file with invalid JSON
    const tmpDir = join(process.cwd(), "e2e");
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }
    const tempFile = join(tmpDir, "invalid.json");
    writeFileSync(tempFile, "invalid json content");

    await page.setInputFiles("[data-testid='file-input']", tempFile);
    await expect(page.locator("[data-testid='error-message']")).toBeVisible();

    unlinkSync(tempFile);
  });

  test("shows graph view with nodes and edges", async ({ page }) => {
    // Create a temp file with test data
    const tmpDir = join(process.cwd(), "e2e");
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }
    const tempFile = join(tmpDir, "test-graph.json");
    writeFileSync(tempFile, JSON.stringify(sampleGraphData));

    await page.setInputFiles("[data-testid='file-input']", tempFile);
    await page.waitForSelector("[data-testid='graph-view']");
    await expect(page.locator("[data-testid='node-count']")).toContainText("3 nodes");
    await expect(page.locator("[data-testid='edge-count']")).toContainText("2 edges");

    unlinkSync(tempFile);
  });

  test("can switch between views", async ({ page }) => {
    // Upload file
    const tmpDir = join(process.cwd(), "e2e");
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }
    const tempFile = join(tmpDir, "test-switch.json");
    writeFileSync(tempFile, JSON.stringify(sampleGraphData));

    await page.setInputFiles("[data-testid='file-input']", tempFile);
    await page.waitForSelector("[data-testid='graph-view']");

    // Navigate to Report
    await page.click("[data-testid='nav-report']");
    await expect(page.locator("[data-testid='report-view']")).toBeVisible();

    // Navigate to Metrics
    await page.click("[data-testid='nav-metrics']");
    await expect(page.locator("[data-testid='metrics-view']")).toBeVisible();

    // Navigate back to Graph
    await page.click("[data-testid='nav-graph']");
    await expect(page.locator("[data-testid='graph-view']")).toBeVisible();

    unlinkSync(tempFile);
  });

  test("shows report view with violations", async ({ page }) => {
    const tmpDir = join(process.cwd(), "e2e");
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }
    const tempFile = join(tmpDir, "test-report.json");
    writeFileSync(tempFile, JSON.stringify(sampleGraphData));

    await page.setInputFiles("[data-testid='file-input']", tempFile);
    await page.waitForSelector("[data-testid='graph-view']");
    await page.click("[data-testid='nav-report']");
    await expect(page.locator("[data-testid='violation-list']")).toBeVisible();

    unlinkSync(tempFile);
  });

  test("shows metrics view with statistics", async ({ page }) => {
    const tmpDir = join(process.cwd(), "e2e");
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }
    const tempFile = join(tmpDir, "test-metrics.json");
    writeFileSync(tempFile, JSON.stringify(sampleGraphData));

    await page.setInputFiles("[data-testid='file-input']", tempFile);
    await page.waitForSelector("[data-testid='graph-view']");
    await page.click("[data-testid='nav-metrics']");
    await expect(page.locator("[data-testid='metrics-view']")).toBeVisible();
    await expect(page.locator("[data-testid='edge-type-local']")).toContainText("2");

    unlinkSync(tempFile);
  });
});