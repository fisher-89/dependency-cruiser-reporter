# Testing Guide

## Test Overview

| Package | Framework | Location |
|---------|-----------|----------|
| Rust | cargo test | `packages/rust/src/lib.rs` |
| CLI/E2E | Node.js test runner | `packages/e2e/cli.test.js` |

---

## Rust Tests

Unit tests are written inline in `packages/rust/src/lib.rs` using `#[cfg(test)]` modules.

### Running Tests

```bash
cd packages/rust

# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_name
```

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

Integration tests for the CLI binary and Rust binary using Node.js built-in test runner.

### Running Tests

```bash
cd packages/e2e

# Run all tests
pnpm test

# Run with verbose output
node --test cli.test.js
```

### Test Structure

```
packages/e2e/
├── package.json
├── cli.test.js         # CLI integration tests
└── fixtures/
    └── sample-cruise.json
```

### Test Cases

#### CLI Command Tests

| Test | Description |
|------|-------------|
| `--help shows usage` | Verify help output includes command names |
| `analyze --help shows options` | Verify analyze options listed |
| `open --help shows options` | Verify open options listed |
| `analyze requires --input` | Verify missing input exits with error |
| `analyze fails with missing input file` | Verify nonexistent file exits with error |

#### Rust Binary Tests

| Test | Description |
|------|-------------|
| `dcr-aggregate processes sample input` | Run Rust binary on fixture data, verify output structure |

The Rust binary test is skipped if `dcr-aggregate` is not found (needs `cargo build --release` first).

### Writing Tests

```javascript
import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { spawnSync } from "node:child_process";

test("my test", async () => {
  const result = spawnSync("node", [cliBinary, "analyze", "--input", "fixtures/data.json"], {
    encoding: "utf-8",
  });

  assert.strictEqual(result.status, 0);
});
```

---

## Test Coverage

### Rust

Unit tests cover core logic in `lib.rs`. No separate test files.

### CLI

Integration tests cover CLI commands and Rust binary output validation.

| Command | Coverage |
|---------|----------|
| `analyze` | Help output, missing input, missing file |
| `open` | Help output |
| `--help` | Help output |
| Rust binary | Process sample input, output structure |

---

## CI Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test-rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions-rust-lang/setup-rust-toolchain@v1
      - run: cargo test
        working-directory: packages/rust

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
      - run: pnpm build:ts
      - run: pnpm test --filter e2e
```

---

## Debugging Tests

### Rust

```bash
# Print debug output
cargo test -- --nocapture

# Run specific test
cargo test test_name
```

### CLI

```bash
# Debug with verbose output
node --test cli.test.js

# Run single test by name
node --test --test-name-pattern "analyze" cli.test.js
```
