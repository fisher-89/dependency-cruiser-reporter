import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliBinary = resolve(__dirname, "../cli/bin/cli.js");
const testWorkspace = resolve(__dirname, ".test-workspace");
const archDir = resolve(testWorkspace, ".dc-reporter", "architecture");

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

const validC4 = `
specification {
  element person
  element system
}
model {
  user = person 'User'
  sys = system 'MySystem'
  user -> sys 'Uses'
}
views {
  view index {
    include *
  }
}
`;

const invalidC4 = `
specification {
  element person
}
model {
  user = person 'User'
  broken syntax here !!!
}
`;

describe("Architecture Model API", () => {
  let serverProc: ReturnType<typeof spawn> | null = null;
  let port: number;

  before(async () => {
    // Clean up from previous runs
    if (existsSync(testWorkspace)) {
      rmSync(testWorkspace, { recursive: true, force: true });
    }
  });

  after(() => {
    if (serverProc) {
      serverProc.kill();
      serverProc = null;
    }
    if (existsSync(testWorkspace)) {
      rmSync(testWorkspace, { recursive: true, force: true });
    }
  });

  async function startServer(extraC4Files?: Record<string, string>) {
    // Create workspace with architecture directory
    ensureDir(archDir);
    writeFileSync(resolve(archDir, "main.c4"), validC4);

    if (extraC4Files) {
      for (const [name, content] of Object.entries(extraC4Files)) {
        writeFileSync(resolve(archDir, name), content);
      }
    }

    port = 3020 + Math.floor(Math.random() * 1000);
    serverProc = spawn("node", [cliBinary, "open", "--cwd", testWorkspace, "-p", String(port)], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Wait for server to start
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Server start timeout")), 10000);
      serverProc?.stdout?.on("data", (data: Buffer) => {
        if (data.toString().includes("Server running")) {
          clearTimeout(timeout);
          resolve();
        }
      });
      serverProc?.stderr?.on("data", (data: Buffer) => {
        // Some stderr output is normal (port binding messages)
      });
    });
  }

  test("GET /api/architecture/model returns parsed model with valid .c4 files", async () => {
    await startServer();

    const res = await fetch(`http://localhost:${port}/api/architecture/model`);
    assert.strictEqual(res.status, 200);

    const data = await res.json() as Record<string, unknown>;
    assert.ok(data.elements, "should have elements");

    const elements = data.elements as Record<string, Record<string, unknown>>;
    const elementIds = Object.keys(elements);
    assert.ok(elementIds.length >= 2, `should have at least 2 elements, got ${elementIds.length}`);

    const elementNames = elementIds.map((id) => elements[id]?.title);
    assert.ok(elementNames.includes("User"), `should have User, got: ${elementNames.join(", ")}`);
    assert.ok(elementNames.includes("MySystem"), `should have MySystem, got: ${elementNames.join(", ")}`);
  });

  test("GET /api/architecture/model handles multiple .c4 files", async () => {
    const extraC4 = `
specification {
  element database
}
model {
  db = database 'Database'
  sys -> db 'Reads/Write'
}
`;
    await startServer({ "extra.c4": extraC4 });

    const res = await fetch(`http://localhost:${port}/api/architecture/model`);
    assert.strictEqual(res.status, 200);

    const data = await res.json() as Record<string, unknown>;
    const elements = data.elements as Record<string, Record<string, unknown>>;
    const elementNames = Object.keys(elements).map((id) => elements[id]?.title);
    assert.ok(elementNames.includes("Database"), `should have Database from second file, got: ${elementNames.join(", ")}`);
  });

  test("GET /api/architecture/model returns 404 when no architecture dir", async () => {
    // Start server with empty workspace (no .dc-reporter dir)
    const emptyWorkspace = resolve(__dirname, ".test-empty-workspace");
    ensureDir(emptyWorkspace);

    const emptyPort = 3030 + Math.floor(Math.random() * 1000);
    const proc = spawn("node", [cliBinary, "open", "--cwd", emptyWorkspace, "-p", String(emptyPort)], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Server start timeout")), 10000);
      proc.stdout?.on("data", (data: Buffer) => {
        if (data.toString().includes("Server running")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    try {
      const res = await fetch(`http://localhost:${emptyPort}/api/architecture/model`);
      assert.strictEqual(res.status, 404);
    } finally {
      proc.kill();
      if (existsSync(emptyWorkspace)) {
        rmSync(emptyWorkspace, { recursive: true, force: true });
      }
    }
  });

  test("GET /api/architecture/model returns 422 for invalid .c4 syntax", async () => {
    // Overwrite with invalid C4
    if (existsSync(archDir)) rmSync(archDir, { recursive: true, force: true });
    ensureDir(archDir);
    writeFileSync(resolve(archDir, "broken.c4"), invalidC4);

    const badPort = 3040 + Math.floor(Math.random() * 1000);
    const proc = spawn("node", [cliBinary, "open", "--cwd", testWorkspace, "-p", String(badPort)], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Server start timeout")), 10000);
      proc.stdout?.on("data", (data: Buffer) => {
        if (data.toString().includes("Server running")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    try {
      const res = await fetch(`http://localhost:${badPort}/api/architecture/model`);
      assert.strictEqual(res.status, 422, `expected 422, got ${res.status}`);
      const data = await res.json() as Record<string, unknown>;
      assert.ok(data.error, "should have error message");
    } finally {
      proc.kill();
    }
  });

  test("POST /api/architecture/generate creates directory and main.c4 with valid C4 content", async () => {
    // Start with a clean workspace (no .dc-reporter)
    const cleanWorkspace = resolve(__dirname, ".test-generate-workspace");
    if (existsSync(cleanWorkspace)) rmSync(cleanWorkspace, { recursive: true, force: true });
    ensureDir(cleanWorkspace);

    const genPort = 3060 + Math.floor(Math.random() * 1000);
    const proc = spawn("node", [cliBinary, "open", "--cwd", cleanWorkspace, "-p", String(genPort)], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Server start timeout")), 10000);
      proc.stdout?.on("data", (data: Buffer) => {
        if (data.toString().includes("Server running")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    try {
      const res = await fetch(`http://localhost:${genPort}/api/architecture/generate`, {
        method: "POST",
      });
      assert.strictEqual(res.status, 200, `expected 200, got ${res.status}`);
      const body = await res.json() as Record<string, unknown>;
      assert.strictEqual(body.success, true, "should return success");

      // Verify file was created
      const c4Path = resolve(cleanWorkspace, ".dc-reporter", "architecture", "main.c4");
      assert.ok(existsSync(c4Path), "main.c4 should exist");
      const content = readFileSync(c4Path, "utf-8");
      assert.ok(content.includes("specification {"), "should contain specification block");
      assert.ok(content.includes("element system"), "should contain system element");
      assert.ok(content.includes("view index"), "should contain a view");
    } finally {
      proc.kill();
      if (existsSync(cleanWorkspace)) rmSync(cleanWorkspace, { recursive: true, force: true });
    }
  });

  test("POST /api/architecture/generate enables subsequent GET /api/architecture/model", async () => {
    const modelWorkspace = resolve(__dirname, ".test-generate-model-workspace");
    if (existsSync(modelWorkspace)) rmSync(modelWorkspace, { recursive: true, force: true });
    ensureDir(modelWorkspace);

    const genPort2 = 3070 + Math.floor(Math.random() * 1000);
    const proc = spawn("node", [cliBinary, "open", "--cwd", modelWorkspace, "-p", String(genPort2)], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Server start timeout")), 10000);
      proc.stdout?.on("data", (data: Buffer) => {
        if (data.toString().includes("Server running")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    try {
      // Before generation: model should 404
      const before = await fetch(`http://localhost:${genPort2}/api/architecture/model`);
      assert.strictEqual(before.status, 404, "should 404 before generation");

      // Generate
      const genRes = await fetch(`http://localhost:${genPort2}/api/architecture/generate`, {
        method: "POST",
      });
      assert.strictEqual(genRes.status, 200);

      // After generation: model should parse successfully
      const after = await fetch(`http://localhost:${genPort2}/api/architecture/model`);
      assert.strictEqual(after.status, 200, `expected 200, got ${after.status}`);
      const data = await after.json() as Record<string, unknown>;
      assert.ok(data.elements, "should have elements");
    } finally {
      proc.kill();
      if (existsSync(modelWorkspace)) rmSync(modelWorkspace, { recursive: true, force: true });
    }
  });
});
