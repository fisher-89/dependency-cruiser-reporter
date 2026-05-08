import { test, describe } from "node:test";
import assert from "node:assert";
import { buildGraphData } from "../frontend/src/components/buildGraphData.ts";
import type { ProcessedGraph } from "../frontend/src/types.ts";

const COMBO_PREFIX = "combo:";

/** Validate that all node->combo and combo->parent references are consistent */
function validateGraphData(result: ReturnType<typeof buildGraphData>) {
  const comboIds = new Set(result.combos.map((c) => c.id));

  // Every node's combo must exist (if set)
  for (const n of result.nodes) {
    if (n.combo) {
      assert.ok(comboIds.has(n.combo), `node ${n.id} references missing combo ${n.combo}`);
    }
  }

  // Every combo's parent must exist (if set)
  for (const c of result.combos) {
    if (c.combo) {
      assert.ok(comboIds.has(c.combo), `combo ${c.id} references missing parent ${c.combo}`);
    }
  }

  // Combos must be sorted: parents before children (G6 requirement)
  const seenCombos = new Set<string>();
  for (const c of result.combos) {
    if (c.combo) {
      assert.ok(seenCombos.has(c.combo), `combo ${c.id} appears before its parent ${c.combo}`);
    }
    seenCombos.add(c.id);
  }

  // No single-child combos
  for (const c of result.combos) {
    const childNodes = result.nodes.filter((n) => n.combo === c.id).length;
    const childCombos = result.combos.filter((cc) => cc.combo === c.id).length;
    assert.ok(
      childNodes + childCombos > 1,
      `combo ${c.id} has only ${childNodes + childCombos} child(ren), should have been collapsed`,
    );
  }
}

function makeGraph(overrides: Partial<ProcessedGraph> = {}): ProcessedGraph {
  return {
    nodes: [],
    edges: [],
    combos: [],
    meta: { original_node_count: 0, aggregated_node_count: 0, total_violations: 0 },
    violations: [],
    ...overrides,
  };
}

describe("buildGraphData", () => {
  test("root-level nodes have no combo", () => {
    const data = makeGraph({
      nodes: [
        { id: "index.ts", label: "index.ts", node_type: "file", path: "index.ts", violation_count: 0, combo: undefined },
        { id: "app.ts", label: "app.ts", node_type: "file", path: "app.ts", violation_count: 0, combo: undefined },
      ],
      combos: [],
    });
    const result = buildGraphData(data);
    validateGraphData(result);
    assert.strictEqual(result.combos.length, 0);
    for (const n of result.nodes) {
      assert.strictEqual(n.combo, undefined);
    }
  });

  test("nodes in same directory share a combo", () => {
    const data = makeGraph({
      nodes: [
        { id: "src/a.ts", label: "a.ts", node_type: "file", path: "src/a.ts", violation_count: 0, combo: "combo:src" },
        { id: "src/b.ts", label: "b.ts", node_type: "file", path: "src/b.ts", violation_count: 0, combo: "combo:src" },
      ],
      combos: [
        { id: "combo:src", label: "src", combo: undefined },
      ],
    });
    const result = buildGraphData(data);
    validateGraphData(result);
    const srcCombo = result.combos.find((c) => c.id === "combo:src");
    assert.ok(srcCombo, "combo:src should exist");
    for (const n of result.nodes) {
      assert.strictEqual(n.combo, "combo:src");
    }
  });

  test("single-child combos are collapsed", () => {
    // Single file in demo/src/ — all intermediate combos collapse to top-level
    const data = makeGraph({
      nodes: [
        { id: "demo/src/main.ts", label: "main.ts", node_type: "file", path: "demo/src/main.ts", violation_count: 0, combo: undefined },
      ],
      combos: [],
    });
    const result = buildGraphData(data);
    validateGraphData(result);
    assert.strictEqual(result.combos.length, 0);
    assert.strictEqual(result.nodes[0].combo, undefined);
  });

  test("cascading collapse: parent and grandparent both single-child", () => {
    // combo:demo/src/deep collapses (1 node) -> into combo:demo/src
    // combo:demo/src has 2 nodes now, stays
    // combo:demo has 1 child (combo:demo/src) -> collapses to top-level
    const data = makeGraph({
      nodes: [
        { id: "demo/src/a.ts", label: "a.ts", node_type: "file", path: "demo/src/a.ts", violation_count: 0, combo: "combo:demo/src" },
        { id: "demo/src/deep/solo.ts", label: "solo.ts", node_type: "file", path: "demo/src/deep/solo.ts", violation_count: 0, combo: "combo:demo/src" },
      ],
      combos: [
        { id: "combo:demo/src", label: "src", combo: undefined },
      ],
    });
    const result = buildGraphData(data);
    validateGraphData(result);
    const comboIds = result.combos.map((c) => c.id);
    assert.ok(!comboIds.includes("combo:demo"), "combo:demo should be collapsed");
    assert.ok(!comboIds.includes("combo:demo/src/deep"), "combo:demo/src/deep should be collapsed");
    assert.ok(comboIds.includes("combo:demo/src"), "combo:demo/src should survive");
  });

  test("directory-type node in aggregated graph", () => {
    // combo:demo has 2 nodes -> stays
    const data = makeGraph({
      nodes: [
        { id: "demo/src", label: "src", node_type: "directory", path: "demo/src", violation_count: 0, combo: "combo:demo" },
        { id: "demo/lib", label: "lib", node_type: "directory", path: "demo/lib", violation_count: 0, combo: "combo:demo" },
      ],
      edges: [{ source: "demo/src", target: "demo/lib", edge_type: "local", weight: 1 }],
      combos: [
        { id: "combo:demo", label: "demo", combo: undefined },
      ],
    });
    const result = buildGraphData(data);
    validateGraphData(result);
    assert.ok(result.combos.some((c) => c.id === "combo:demo"), "combo:demo should exist");
  });

  test("single directory-type node collapses correctly", () => {
    const data = makeGraph({
      nodes: [
        { id: "demo/src", label: "src", node_type: "directory", path: "demo/src", violation_count: 0, combo: undefined },
      ],
      combos: [],
    });
    const result = buildGraphData(data);
    validateGraphData(result);
    assert.strictEqual(result.combos.length, 0);
    assert.strictEqual(result.nodes[0].combo, undefined);
  });

  test("combo:demo/src survives when it has multiple children (demo-graph case)", () => {
    // combo:demo has 1 child (combo:demo/src) -> collapsed
    // combo:demo/src has 3 nodes -> survives
    // combo:demo/src/components has 1 node -> collapsed into combo:demo/src
    // combo:demo/src/services has 2 nodes -> survives
    const data = makeGraph({
      nodes: [
        { id: "demo/src/index.js", label: "index.js", node_type: "file", path: "demo/src/index.js", violation_count: 0, combo: "combo:demo/src" },
        { id: "demo/src/components/app.js", label: "app.js", node_type: "file", path: "demo/src/components/app.js", violation_count: 0, combo: "combo:demo/src" },
        { id: "demo/src/services/auth.js", label: "auth.js", node_type: "file", path: "demo/src/services/auth.js", violation_count: 0, combo: "combo:demo/src/services" },
        { id: "demo/src/services/user.js", label: "user.js", node_type: "file", path: "demo/src/services/user.js", violation_count: 0, combo: "combo:demo/src/services" },
      ],
      edges: [
        { source: "demo/src/index.js", target: "demo/src/components/app.js", edge_type: "local", weight: 1 },
        { source: "demo/src/index.js", target: "demo/src/services/auth.js", edge_type: "local", weight: 1 },
      ],
      combos: [
        { id: "combo:demo/src", label: "src", combo: undefined },
        { id: "combo:demo/src/services", label: "services", combo: "combo:demo/src" },
      ],
    });
    const result = buildGraphData(data);
    validateGraphData(result);
    assert.ok(result.combos.some((c) => c.id === "combo:demo/src"), "combo:demo/src should survive");
    assert.ok(!result.combos.some((c) => c.id === "combo:demo"), "combo:demo should be collapsed");
    assert.ok(!result.combos.some((c) => c.id === "combo:demo/src/components"), "combo:demo/src/components should be collapsed");
  });

  test("preserves edges correctly", () => {
    const data = makeGraph({
      nodes: [
        { id: "src/a.ts", label: "a.ts", node_type: "file", path: "src/a.ts", violation_count: 0, combo: "combo:src" },
        { id: "src/b.ts", label: "b.ts", node_type: "file", path: "src/b.ts", violation_count: 0, combo: "combo:src" },
      ],
      edges: [
        { source: "src/a.ts", target: "src/b.ts", edge_type: "local", weight: 1 },
        { source: "src/b.ts", target: "src/a.ts", edge_type: "local", weight: 2 },
      ],
      combos: [
        { id: "combo:src", label: "src", combo: undefined },
      ],
    });
    const result = buildGraphData(data);
    assert.strictEqual(result.edges.length, 2);
    assert.strictEqual(result.edges[0].source, "src/a.ts");
    assert.strictEqual(result.edges[0].target, "src/b.ts");
    assert.strictEqual(result.edges[1].source, "src/b.ts");
    assert.strictEqual(result.edges[1].target, "src/a.ts");
  });
});
