// AC-7: pnpm test passes (no regressions in existing test suite)
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..", "..", "..", "..", "..");

describe("AC-7: pnpm test", () => {
  it("pnpm test exits with code 0", { timeout: 120_000 }, () => {
    const result = spawnSync("pnpm", ["test"], {
      cwd: projectRoot,
      encoding: "utf-8",
      env: { ...process.env },
      timeout: 120_000,
    });
    assert.equal(
      result.status,
      0,
      `pnpm test failed with exit code ${result.status}\nstderr: ${result.stderr?.slice(-1000)}`,
    );
  });
});
