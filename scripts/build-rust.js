#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rustDir = path.join(__dirname, '..', 'packages', 'rust');

function findWasmPack() {
  const candidates = [
    process.env.WASM_PACK_PATH,
    path.join(process.env.HOME || process.env.USERPROFILE, '.cargo', 'bin', 'wasm-pack'),
    path.join(process.env.HOME || process.env.USERPROFILE, '.cargo', 'bin', 'wasm-pack.exe'),
    'wasm-pack',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const result = spawnSync(candidate, ['--version'], {
        encoding: 'utf-8',
        shell: process.platform === 'win32'
      });
      if (result.status === 0) {
        return candidate;
      }
    } catch {
      // Continue to next candidate
    }
  }
  return null;
}

const wasmPack = findWasmPack();

if (!wasmPack) {
  console.warn('WARN: WASM build skipped - wasm-pack not found');
  console.warn('Install with: cargo install wasm-pack');
  process.exit(0);
}

console.log(`Using wasm-pack: ${wasmPack}`);
const result = spawnSync(wasmPack, [
  'build',
  '--target', 'nodejs',
  '--out-dir', 'pkg',
  '--out-name', 'dcr_reporter',
], {
  cwd: rustDir,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (result.status === 0) {
  // Fix package name to match workspace import
  const pkgJsonPath = path.join(rustDir, 'pkg', 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  pkgJson.name = '@dcr-reporter/rust-wasm';
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
  console.log('Fixed package name to @dcr-reporter/rust-wasm');
}

process.exit(result.status || 0);