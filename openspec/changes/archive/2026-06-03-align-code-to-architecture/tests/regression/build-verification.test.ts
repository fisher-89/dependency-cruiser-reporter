// AC-6: pnpm build passes (no compilation errors)
// AC-12: import paths resolve correctly (verified by TypeScript compilation)
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..", "..", "..", "..", "..");

describe("AC-6 / AC-12: pnpm build", () => {
  it("pnpm build exits with code 0", { timeout: 120_000 }, () => {
    const result = spawnSync("pnpm", ["build"], {
      cwd: projectRoot,
      encoding: "utf-8",
      env: { ...process.env },
      timeout: 120_000,
    });
    assert.equal(
      result.status,
      0,
      `pnpm build failed with exit code ${result.status}\nstderr: ${result.stderr?.slice(-1000)}`,
    );
  });

  it("pnpm build:ts exports resolve without errors", { timeout: 120_000 }, () => {
    const result = spawnSync("pnpm", ["build:ts"], {
      cwd: projectRoot,
      encoding: "utf-8",
      env: { ...process.env },
      timeout: 120_000,
    });
    assert.equal(
      result.status,
      0,
      `pnpm build:ts failed — import paths may not resolve\nstderr: ${result.stderr?.slice(-1000)}`,
    );
  });
});
