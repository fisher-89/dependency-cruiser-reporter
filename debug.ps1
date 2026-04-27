# Debug script for building and testing all packages (Windows PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "=== Building and Testing Dependency-Cruiser Reporter ===" -ForegroundColor Green

$SCRIPT_DIR = $PSScriptRoot
Set-Location $SCRIPT_DIR

Write-Host ""
Write-Host "=== Step 1: Install Dependencies ===" -ForegroundColor Yellow
pnpm install

Write-Host ""
Write-Host "=== Step 2: Build Rust Binary ===" -ForegroundColor Yellow
Set-Location packages/rust
cargo build --release
Set-Location ../..

Write-Host ""
Write-Host "=== Step 3: Build CLI Package ===" -ForegroundColor Yellow
Set-Location packages/cli
pnpm build
Set-Location ../..

Write-Host ""
Write-Host "=== Step 4: Build Frontend Package ===" -ForegroundColor Yellow
Set-Location packages/frontend
pnpm build
Set-Location ../..

Write-Host ""
Write-Host "=== Step 5: Link CLI Globally ===" -ForegroundColor Yellow
Set-Location packages/cli
pnpm link --global
Set-Location ../..

Write-Host ""
Write-Host "=== Step 6: Test CLI --help ===" -ForegroundColor Yellow
node packages/cli/bin/cli.js --help

Write-Host ""
Write-Host "=== Step 7: Test Rust Binary Directly ===" -ForegroundColor Yellow
& packages/rust/target/release/dcr-aggregate.exe --help

Write-Host ""
Write-Host "=== Step 8: Run Analyze Command ===" -ForegroundColor Yellow
& packages/rust/target/release/dcr-aggregate.exe --input packages/e2e/fixtures/sample-cruise.json --output test-output.json
Get-Content test-output.json | Select-Object -First 20

Write-Host ""
Write-Host "=== Step 9: Test CLI Analyze ===" -ForegroundColor Yellow
node packages/cli/bin/cli.js analyze --input packages/e2e/fixtures/sample-cruise.json --output test-cli-output.json

Write-Host ""
Write-Host "=== Step 10: Run E2E Tests ===" -ForegroundColor Yellow
Set-Location packages/e2e
node --test cli.test.js
Set-Location ../..

Write-Host ""
Write-Host "=== Cleanup ===" -ForegroundColor Yellow
Remove-Item -Path test-output.json, test-cli-output.json -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Green