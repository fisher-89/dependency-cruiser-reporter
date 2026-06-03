// Unit tests verifying C4 model file content
// AC-10: frontend.c4 contains types = module with 5 dependency edges
// AC-11: rust.c4 contains types = module and lib = module with 7 dependency edges
// B-5: types is defined as 'module' (not 'package' or 'component')
// B-6: Each dependency edge is individually asserted

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Project root is 6 levels up from tests/unit/archi/
const projectRoot = resolve(__dirname, "..", "..", "..", "..", "..", "..");
const archiDir = resolve(projectRoot, ".dc-reporter", "architecture");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readC4File(filename: string): string {
  const filePath = resolve(archiDir, filename);
  assert.ok(existsSync(filePath), `C4 file not found at ${filePath}`);
  return readFileSync(filePath, "utf-8");
}

/**
 * Extract lines inside extend ROOT.<scope> { ... } block (naive brace matching).
 */
function extractExtendBlock(source: string, scope: string): string[] {
  const lines = source.split("\n");
  const blockLines: string[] = [];
  let inBlock = false;
  let depth = 0;

  for (const line of lines) {
    if (!inBlock) {
      if (line.trim().startsWith(`extend ROOT.${scope} `) || line.trim().startsWith(`extend ROOT.${scope}  `) || line.trim().startsWith(`extend ROOT.${scope}{`)) {
        inBlock = true;
        depth = 1;
        // Include the opening brace on same line
        continue;
      }
    } else {
      // Count braces to track nesting
      for (const ch of line) {
        if (ch === "{") depth++;
        if (ch === "}") depth--;
      }
      if (depth <= 0) {
        break; // End of block
      }
      blockLines.push(line);
    }
  }
  return blockLines;
}

function hasModuleDefinition(blockLines: string[], moduleName: string): boolean {
  return blockLines.some(
    (line) =>
      line.trim().match(new RegExp(`^${moduleName}\\s*=\\s*module`)) ||
      line.trim().match(new RegExp(`^${moduleName}\\s*=\\s*module\\s*$`)),
  );
}

function hasDependencyEdge(blockLines: string[], from: string, to: string): boolean {
  // Check if the module's block (the lines inside `from = module { ... }`) contains
  // a dependency edge targeting `to`. Dependencies use LikeC4 `-[dependency]-> TARGET` syntax.
  let inModule = false;
  let moduleDepth = 0;
  for (const line of blockLines) {
    const trimmed = line.trim();
    // Enter module block: `from = module` or `from = module 'label' {`
    if (!inModule && trimmed.startsWith(`${from} = module`)) {
      // Check if the opening brace is on the same line
      if (trimmed.includes('{')) {
        inModule = true;
        moduleDepth = 1;
      }
      continue;
    }
    if (inModule) {
      // Track brace depth
      for (const ch of line) {
        if (ch === '{') moduleDepth++;
        if (ch === '}') moduleDepth--;
      }
      if (moduleDepth <= 0) break;
      // Check for dependency edge: `-[dependency]-> TARGET`
      if (trimmed.includes('-[dependency]->') && trimmed.includes(to)) {
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// AC-10: frontend.c4 — types module with 5 dependency edges
// ---------------------------------------------------------------------------
describe("AC-10: frontend.c4 model content", () => {
  let frontendBlock: string[];

  it("frontend.c4 file exists", () => {
    assert.ok(
      existsSync(resolve(archiDir, "frontend.c4")),
      "frontend.c4 should exist in .dc-reporter/architecture/",
    );
  });

  it("parses extend ROOT.frontend block", () => {
    const source = readC4File("frontend.c4");
    frontendBlock = extractExtendBlock(source, "frontend");
    assert.ok(frontendBlock.length > 0, "extend ROOT.frontend { ... } block should exist");
  });

  // B-5: types = module (not package or component)
  it("types is defined as module type", () => {
    assert.ok(
      hasModuleDefinition(frontendBlock, "types"),
      "extend ROOT.frontend should contain 'types = module' definition",
    );
  });

  // Dependency edges from actual frontend.c4 (B-6: each edge individually asserted)
  it("App declares dependency on ROOT.frontend.types", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "App", "ROOT.frontend.types"),
      "App should declare dependency on ROOT.frontend.types",
    );
  });

  it("components declares dependency on ROOT.frontend.types", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "components", "ROOT.frontend.types"),
      "components should declare dependency on ROOT.frontend.types",
    );
  });

  it("hooks declares dependency on ROOT.frontend.types", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "hooks", "ROOT.frontend.types"),
      "hooks should declare dependency on ROOT.frontend.types",
    );
  });

  it("main declares dependency on ROOT.frontend.App", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "main", "ROOT.frontend.App"),
      "main should declare dependency on ROOT.frontend.App",
    );
  });

  it("main declares dependency on ROOT.frontend.theme", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "main", "ROOT.frontend.theme"),
      "main should declare dependency on ROOT.frontend.theme",
    );
  });

  it("main declares dependency on ROOT.frontend.i18n", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "main", "ROOT.frontend.i18n"),
      "main should declare dependency on ROOT.frontend.i18n",
    );
  });

  it("App declares dependency on ROOT.frontend.i18n", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "App", "ROOT.frontend.i18n"),
      "App should declare dependency on ROOT.frontend.i18n",
    );
  });

  it("App declares dependency on ROOT.frontend.styles", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "App", "ROOT.frontend.styles"),
      "App should declare dependency on ROOT.frontend.styles",
    );
  });

  it("App declares dependency on ROOT.frontend.components", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "App", "ROOT.frontend.components"),
      "App should declare dependency on ROOT.frontend.components",
    );
  });

  it("components declares dependency on ROOT.frontend.i18n", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "components", "ROOT.frontend.i18n"),
      "components should declare dependency on ROOT.frontend.i18n",
    );
  });

  it("components declares dependency on ROOT.frontend.styles", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "components", "ROOT.frontend.styles"),
      "components should declare dependency on ROOT.frontend.styles",
    );
  });

  it("components declares dependency on ROOT.frontend.hooks", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "components", "ROOT.frontend.hooks"),
      "components should declare dependency on ROOT.frontend.hooks",
    );
  });

  it("styles declares dependency on ROOT.frontend.theme", () => {
    assert.ok(
      hasDependencyEdge(frontendBlock, "styles", "ROOT.frontend.theme"),
      "styles should declare dependency on ROOT.frontend.theme",
    );
  });
});

// ---------------------------------------------------------------------------
// AC-11: rust.c4 — types, lib modules with 7 dependency edges
// ---------------------------------------------------------------------------
describe("AC-11: rust.c4 model content", () => {
  let rustBlock: string[];

  it("rust.c4 file exists", () => {
    assert.ok(
      existsSync(resolve(archiDir, "rust.c4")),
      "rust.c4 should exist in .dc-reporter/architecture/",
    );
  });

  it("parses extend ROOT.rust block", () => {
    const source = readC4File("rust.c4");
    rustBlock = extractExtendBlock(source, "rust");
    assert.ok(rustBlock.length > 0, "extend ROOT.rust { ... } block should exist");
  });

  // Module definitions
  it("types is defined as module in rust.c4", () => {
    assert.ok(
      hasModuleDefinition(rustBlock, "types"),
      "extend ROOT.rust should contain 'types = module' definition",
    );
  });

  it("lib is defined as module in rust.c4", () => {
    assert.ok(
      hasModuleDefinition(rustBlock, "lib"),
      "extend ROOT.rust should contain 'lib = module' definition",
    );
  });

  // Dependency edges: aggregate, layout, violations -> types (3 edges)
  it("aggregate declares dependency on ROOT.rust.types", () => {
    assert.ok(
      hasDependencyEdge(rustBlock, "aggregate", "ROOT.rust.types"),
      "aggregate should declare -> ROOT.rust.types dependency",
    );
  });

  it("layout declares dependency on ROOT.rust.types", () => {
    assert.ok(
      hasDependencyEdge(rustBlock, "layout", "ROOT.rust.types"),
      "layout should declare -> ROOT.rust.types dependency",
    );
  });

  it("violations declares dependency on ROOT.rust.types", () => {
    assert.ok(
      hasDependencyEdge(rustBlock, "violations", "ROOT.rust.types"),
      "violations should declare -> ROOT.rust.types dependency",
    );
  });

  // Dependency edges: lib -> aggregate, layout, types, violations (4 edges)
  it("lib declares dependency on ROOT.rust.aggregate", () => {
    assert.ok(
      hasDependencyEdge(rustBlock, "lib", "ROOT.rust.aggregate"),
      "lib should declare -> ROOT.rust.aggregate dependency",
    );
  });

  it("lib declares dependency on ROOT.rust.layout", () => {
    assert.ok(
      hasDependencyEdge(rustBlock, "lib", "ROOT.rust.layout"),
      "lib should declare -> ROOT.rust.layout dependency",
    );
  });

  it("lib declares dependency on ROOT.rust.types", () => {
    assert.ok(
      hasDependencyEdge(rustBlock, "lib", "ROOT.rust.types"),
      "lib should declare -> ROOT.rust.types dependency",
    );
  });

  it("lib declares dependency on ROOT.rust.violations", () => {
    assert.ok(
      hasDependencyEdge(rustBlock, "lib", "ROOT.rust.violations"),
      "lib should declare -> ROOT.rust.violations dependency",
    );
  });
});
