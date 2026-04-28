#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rustDir = path.join(__dirname, '..', 'packages', 'rust');
const cargoPaths = [
  process.env.CARGO_PATH,
  path.join(process.env.HOME || process.env.USERPROFILE, '.cargo', 'bin', 'cargo'),
  path.join(process.env.HOME || process.env.USERPROFILE, '.cargo', 'bin', 'cargo.exe'),
  'cargo',
].filter(Boolean);

function findCargo() {
  for (const cargoPath of cargoPaths) {
    try {
      const result = spawnSync(cargoPath, ['--version'], {
        encoding: 'utf-8',
        shell: process.platform === 'win32'
      });
      if (result.status === 0) {
        return cargoPath;
      }
    } catch {
      // Continue to next path
    }
  }
  return null;
}

const cargo = findCargo();

if (!cargo) {
  console.warn('WARN: Rust build skipped - cargo not found');
  process.exit(0);
}

console.log(`Using cargo: ${cargo}`);
const result = spawnSync(cargo, ['build', '--release'], {
  cwd: rustDir,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

process.exit(result.status || 0);