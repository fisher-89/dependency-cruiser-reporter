import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliBinary = resolve(__dirname, "../cli/dist/bin/cli.js");
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

  test("GET /api/config returns cwd and hasArchitectureDir", async () => {
    // Restore valid C4 for this test
    if (existsSync(archDir)) rmSync(archDir, { recursive: true, force: true });
    ensureDir(archDir);
    writeFileSync(resolve(archDir, "main.c4"), validC4);

    const configPort = 3050 + Math.floor(Math.random() * 1000);
    const proc = spawn("node", [cliBinary, "open", "--cwd", testWorkspace, "-p", String(configPort)], {
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
      const res = await fetch(`http://localhost:${configPort}/api/config`);
      assert.strictEqual(res.status, 200);
      const config = await res.json() as Record<string, unknown>;
      assert.strictEqual(typeof config.cwd, "string", "cwd should be a string");
      assert.strictEqual(config.hasArchitectureDir, true, "should detect architecture dir");
      assert.strictEqual(config.hasGraphFile, false, "no graph file provided");
    } finally {
      proc.kill();
    }
  });
});
