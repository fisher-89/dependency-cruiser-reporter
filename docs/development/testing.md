# Testing Guide

## Test Overview

| Package | Framework | Location |
|---------|-----------|----------|
| Frontend | Playwright (E2E) | `packages/frontend/e2e/` |
| WASM | wasm-pack test | `packages/wasm/tests/` |
| CLI | Node.js test runner | `packages/e2e/` |

## Frontend E2E Tests

### Running Tests

```bash
cd packages/frontend

# Run all tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run with browser visible
pnpm test:e2e:headed
```

### Test Structure

```
packages/frontend/
├── e2e/
│   ├── app.spec.ts      # Main test suite
│   └── sample-data.json # Test data
└── playwright.config.ts # Playwright configuration
```

### Test Cases

| Test | Description |
|------|-------------|
| File upload | Upload JSON file via input |
| Drag and drop | Upload via drag-drop |
| View switching | Navigate between Graph/Report/Metrics |
| Data display | Verify stats are rendered correctly |

### Sample Data

`e2e/sample-data.json` contains a minimal valid `ProcessedGraph`:

```json
{
  "nodes": [
    { "id": "src", "label": "src", "node_type": "directory", "violation_count": 0 }
  ],
  "edges": [],
  "meta": {
    "original_node_count": 1,
    "aggregated_node_count": 1,
    "aggregation_level": "directory",
    "total_violations": 0
  },
  "violations": []
}
```

### Writing Tests

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/');

  // Upload file
  await page.setInputFiles('input[type="file"]', 'e2e/sample-data.json');

  // Verify
  await expect(page.getByTestId('graph-view')).toBeVisible();
});
```

### Test IDs

Use `data-testid` for selectors:

```tsx
<div data-testid="upload-area">...</div>
<span data-testid="node-count">...</span>
```

---

## WASM Tests

### Running Tests

```bash
cd packages/wasm

# Run all tests (headless)
wasm-pack test --headless --firefox

# Run with Chrome
wasm-pack test --headless --chrome

# Run specific test
wasm-pack test --headless --firefox -- test_aggregation
```

### Test Cases

| Test | Function |
|------|----------|
| `test_aggregation_level_selection` | Verify threshold logic |
| `test_edge_type_detection` | Verify edge type classification |
| `test_package_name_extraction` | Verify npm package parsing |

### Writing Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_my_feature() {
        // Arrange
        let input = ...;

        // Act
        let result = process(input);

        // Assert
        assert_eq!(result, expected);
    }
}
```

---

## CLI Integration Tests

### Running Tests

```bash
cd packages/e2e

# Run all tests
pnpm test

# Run with verbose output
pnpm test --verbose
```

### Test Structure

```
packages/e2e/
├── package.json        # Test runner config
├── cli.test.js         # CLI integration tests
└── fixtures/
    └── sample-cruise.json
```

### Test Cases

| Test | Description |
|------|-------------|
| `dep-report --help` | Show help message |
| `dep-report analyze` | Process JSON and output graph |
| `dep-report open` | Start HTTP server |

### Writing Tests

```javascript
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');

test('analyze command', async () => {
  const result = spawnSync('dep-report', [
    'analyze',
    '--input', 'fixtures/sample-cruise.json',
    '--output', '/tmp/output.json'
  ]);

  assert.strictEqual(result.status, 0);
});
```

---

## Test Coverage

### Frontend

Current coverage: Basic E2E tests

Future improvements:
- [ ] Component unit tests (Vitest)
- [ ] Visual regression tests
- [ ] Accessibility tests

### WASM

Current coverage: Core logic

| Function | Coverage |
|----------|----------|
| `select_aggregation_level` | ✅ Covered |
| `detect_edge_type` | ✅ Covered |
| `extract_package_name` | ✅ Covered |
| `parse_and_aggregate` | ✅ Covered |

### CLI

Current coverage: Basic integration

| Command | Coverage |
|---------|----------|
| `analyze` | ✅ Integration test |
| `open` | ✅ Server startup test |
| `--help` | ✅ Help output test |

---

## CI Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:e2e --filter frontend

  test-wasm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions-rust-lang/setup-rust-toolchain@v1
      - run: rustup target add wasm32-unknown-unknown
      - run: cargo install wasm-pack
      - run: wasm-pack test --headless --firefox
        working-directory: packages/wasm

  test-cli:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build --filter cli
      - run: pnpm test --filter e2e
```

---

## Debugging Tests

### Playwright

```bash
# Debug mode
pnpx playwright test --debug

# Generate trace on failure
# In playwright.config.ts:
trace: 'on-first-retry'
```

### WASM

```bash
# Print debug output
wasm-pack test --headless --firefox -- --nocapture

# Run specific test
wasm-pack test --headless --firefox -- test_name
```

### CLI

```bash
# Debug with verbose output
pnpm test --verbose

# Run single test file
node --test cli.test.js
```