#!/bin/bash
# Debug script for building and testing all packages

set -e

echo "=== Building and Testing Dependency-Cruiser Reporter ==="

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "=== Step 1: Install Dependencies ==="
pnpm install

echo ""
echo "=== Step 2: Build Rust Binary ==="
cd packages/rust
cargo build --release
cd ../..

echo ""
echo "=== Step 3: Build CLI Package ==="
cd packages/cli
pnpm build
cd ../..

echo ""
echo "=== Step 4: Build Frontend Package ==="
cd packages/frontend
pnpm build
cd ../..

echo ""
echo "=== Step 5: Link CLI Globally ==="
cd packages/cli
pnpm link --global || true
cd ../..

echo ""
echo "=== Step 6: Test CLI --help ==="
node packages/cli/bin/cli.js --help

echo ""
echo "=== Step 7: Test Rust Binary Directly ==="
./packages/rust/target/release/dcr-aggregate --help || true

echo ""
echo "=== Step 8: Run Analyze Command ==="
./packages/rust/target/release/dcr-aggregate --input packages/e2e/fixtures/sample-cruise.json --output test-output.json

echo ""
echo "=== Step 9: Verify Output ==="
cat test-output.json | head -20

echo ""
echo "=== Step 10: Test CLI Analyze ==="
node packages/cli/bin/cli.js analyze --input packages/e2e/fixtures/sample-cruise.json --output test-cli-output.json || echo "Note: CLI analyze may need compiled dcr-aggregate binary"

echo ""
echo "=== Cleanup ==="
rm -f test-output.json test-cli-output.json

echo ""
echo "=== Build Complete ==="