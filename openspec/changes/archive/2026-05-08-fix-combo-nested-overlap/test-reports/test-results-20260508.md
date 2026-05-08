# Test Results - 2026-05-08

**Change**: fix-combo-nested-overlap
**Framework**: Node.js built-in test runner + pnpm
**Result**: PASSED

## Summary

- **Total tests**: 25
- **Passed**: 25
- **Failed**: 0
- **Duration**: ~10.3s

## Test Suites

### packages/e2e CLI Integration Tests (17 tests)
- ✔ --help shows usage
- ✔ analyze --help shows options
- ✔ open --help shows options
- ✔ analyze requires -p
- ✔ analyze fails with missing input file
- ✔ aggregate processes sample input
- ✔ WASM small input stays at file level
- ✔ WASM with expandedDirs parameter
- ✔ open command converts raw DC JSON to ProcessedGraph

### packages/e2e buildGraphData Tests (8 tests)
- ✔ root-level nodes have no combo
- ✔ nodes in same directory share a combo
- ✔ single-child combos are collapsed
- ✔ cascading collapse: parent and grandparent both single-child
- ✔ directory-type node in aggregated graph
- ✔ single directory-type node collapses correctly
- ✔ combo:demo/src survives when it has multiple children (demo-graph case)
- ✔ preserves edges correctly

## Command

```bash
pnpm test
```

## Output

```
packages/e2e test: ℹ tests 17
packages/e2e test: ℹ suites 4
packages/e2e test: ℹ pass 17
packages/e2e test: ℹ fail 0

packages/e2e test: ℹ tests 8
packages/e2e test: ℹ suites 1
packages/e2e test: ℹ pass 8
packages/e2e test: ℹ fail 0
```
