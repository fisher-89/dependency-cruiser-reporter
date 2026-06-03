// Structural verification tests for directory and file layout
// AC-1: actions/ exists as sibling of commands/ and server/
// AC-2: server/actions/ does NOT exist
// AC-3: server/dep/ and server/dashboard/ exist
// AC-4: commands/*.ts flat files deleted, commands/*/index.ts directory modules exist
// B-1: Check actions/ directory exists AND contains specific files
// B-2: Check server/actions/ directory completely removed (not just .ts files)
// B-3: Assert both old files absent AND new files present (no transitional state)

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..", "..", "..", "..", "..");
const cliSrcDir = resolve(projectRoot, "packages", "cli", "src");

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function directoryExists(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function fileExists(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// AC-1: actions/ is a top-level directory
// ---------------------------------------------------------------------------
describe("AC-1: actions/ directory", () => {
  const actionsDir = resolve(cliSrcDir, "actions");

  it("actions/ exists as a directory", () => {
    assert.ok(directoryExists(actionsDir), `Expected actions/ directory at ${actionsDir}`);
  });

  // B-1: actions/ contains the expected files
  it("actions/ contains analyze.ts", () => {
    const file = resolve(actionsDir, "analyze.ts");
    assert.ok(fileExists(file), `Expected ${file}`);
  });

  it("actions/ contains archi-to-rules.ts", () => {
    const file = resolve(actionsDir, "archi-to-rules.ts");
    assert.ok(fileExists(file), `Expected ${file}`);
  });

  it("actions/ contains index.ts", () => {
    const file = resolve(actionsDir, "index.ts");
    assert.ok(fileExists(file), `Expected ${file}`);
  });
});

// ---------------------------------------------------------------------------
// AC-2: server/actions/ does NOT exist
// ---------------------------------------------------------------------------
describe("AC-2: server/actions/ directory removed", () => {
  const oldActionsDir = resolve(cliSrcDir, "server", "actions");

  // B-2: Check complete removal, not just file-level
  it("server/actions/ directory does not exist", () => {
    assert.ok(!existsSync(oldActionsDir), `server/actions/ should be completely removed: ${oldActionsDir}`);
  });
});

// ---------------------------------------------------------------------------
// AC-3: server/dep/ and server/dashboard/ exist
// ---------------------------------------------------------------------------
describe("AC-3: server sub-directories", () => {
  it("server/dep/ exists and is a directory", () => {
    const dir = resolve(cliSrcDir, "server", "dep");
    assert.ok(directoryExists(dir), `Expected server/dep/ directory at ${dir}`);
  });

  it("server/dashboard/ exists and is a directory", () => {
    const dir = resolve(cliSrcDir, "server", "dashboard");
    assert.ok(directoryExists(dir), `Expected server/dashboard/ directory at ${dir}`);
  });
});

// ---------------------------------------------------------------------------
// AC-4: commands/*.ts flat files deleted, commands/*/index.ts directory modules
// ---------------------------------------------------------------------------
describe("AC-4: commands directory modules", () => {
  const commandsDir = resolve(cliSrcDir, "commands");

  // B-3: Assert both old files absent AND new files present
  it("commands/analyze.ts flat file does NOT exist", () => {
    const oldFile = resolve(commandsDir, "analyze.ts");
    assert.ok(!existsSync(oldFile), `Flat file commands/analyze.ts should be removed: ${oldFile}`);
  });

  it("commands/archi-to-rules.ts flat file does NOT exist", () => {
    const oldFile = resolve(commandsDir, "archi-to-rules.ts");
    assert.ok(!existsSync(oldFile), `Flat file commands/archi-to-rules.ts should be removed: ${oldFile}`);
  });

  it("commands/dashboard.ts flat file does NOT exist", () => {
    const oldFile = resolve(commandsDir, "dashboard.ts");
    assert.ok(!existsSync(oldFile), `Flat file commands/dashboard.ts should be removed: ${oldFile}`);
  });

  it("commands/analyze/index.ts directory module exists", () => {
    const newFile = resolve(commandsDir, "analyze", "index.ts");
    assert.ok(fileExists(newFile), `Expected commands/analyze/index.ts at ${newFile}`);
  });

  it("commands/archi-to-rules/index.ts directory module exists", () => {
    const newFile = resolve(commandsDir, "archi-to-rules", "index.ts");
    assert.ok(fileExists(newFile), `Expected commands/archi-to-rules/index.ts at ${newFile}`);
  });

  it("commands/dashboard/index.ts directory module exists", () => {
    const newFile = resolve(commandsDir, "dashboard", "index.ts");
    assert.ok(fileExists(newFile), `Expected commands/dashboard/index.ts at ${newFile}`);
  });
});
