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
  console.error('ERROR: wasm-pack not found. Install with: cargo install wasm-pack');
  process.exit(1);
}

console.log(`Using wasm-pack: ${wasmPack}`);
const result = spawnSync(wasmPack, [
  'build',
  '--target', 'nodejs',
  '--scope', 'dcr-reporter',
  '--out-dir', 'pkg',
], {
  cwd: rustDir,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

process.exit(result.status || 0);