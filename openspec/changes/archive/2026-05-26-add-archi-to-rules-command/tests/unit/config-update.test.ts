import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { updateDependencyCruiserConfig } from '../../../../../packages/cli/src/commands/archi-to-rules.ts';

// ---------------------------------------------------------------------------
// Tests for .dependency-cruiser.js extends field update logic
// ---------------------------------------------------------------------------
// Covers: AC-14, B-8, idempotent scenarios

describe('updateDependencyCruiserConfig', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'archi-config-test-'));
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeConfig(content: string): string {
    const configPath = resolve(tmpDir, '.dependency-cruiser.js');
    writeFileSync(configPath, content, 'utf-8');
    return configPath;
  }

  function readConfig(configPath: string): string {
    return readFileSync(configPath, 'utf-8');
  }

  test('AC-14: adds extends array when field does not exist in config', () => {
    const configPath = writeConfig(`module.exports = {\n  forbidden: []\n};`);

    const modified = updateDependencyCruiserConfig(configPath, '.dc-reporter/archi-rules.json');

    assert.strictEqual(modified, true, 'Should indicate file was modified');
    const content = readConfig(configPath);
    assert.ok(content.includes('extends'), 'Config should contain extends field');
    assert.ok(
      content.includes('.dc-reporter/archi-rules.json'),
      'Config should reference archi-rules.json',
    );
  });

  test('AC-14: converts string extends to array and appends target', () => {
    const configPath = writeConfig(
      `module.exports = {\n  extends: ".dependency-cruiser.base.json",\n  forbidden: []\n};`,
    );

    const modified = updateDependencyCruiserConfig(configPath, '.dc-reporter/archi-rules.json');

    assert.strictEqual(modified, true);
    const content = readConfig(configPath);
    assert.ok(content.includes('['), 'extends should now be an array');
    assert.ok(content.includes('.dependency-cruiser.base.json'), 'Should keep original value');
    assert.ok(content.includes('.dc-reporter/archi-rules.json'), 'Should append new value');
  });

  test('appends to extends array when target not already present', () => {
    const configPath = writeConfig(
      `module.exports = {\n  extends: ["./base.json"],\n  forbidden: []\n};`,
    );

    const modified = updateDependencyCruiserConfig(configPath, '.dc-reporter/archi-rules.json');

    assert.strictEqual(modified, true);
    const content = readConfig(configPath);
    assert.ok(content.includes('./base.json'), 'Should preserve existing entry');
    assert.ok(content.includes('.dc-reporter/archi-rules.json'), 'Should append new entry');
  });

  test('skips update when extends array already contains target (idempotent)', () => {
    const configPath = writeConfig(
      `module.exports = {\n  extends: [".dc-reporter/archi-rules.json", "./base.json"],\n  forbidden: []\n};`,
    );

    const modified = updateDependencyCruiserConfig(configPath, '.dc-reporter/archi-rules.json');

    assert.strictEqual(modified, false, 'Should indicate no modification');
    const content = readConfig(configPath);
    // Must only appear once
    const matches = content.match(/\.dc-reporter\/archi-rules\.json/g);
    assert.strictEqual(matches?.length, 1, 'Target should appear exactly once');
  });

  test('preserves existing config fields after extends update', () => {
    const configPath = writeConfig(
      `module.exports = {\n  forbidden: [],\n  allowed: ["test"],\n  options: {}\n};`,
    );

    updateDependencyCruiserConfig(configPath, '.dc-reporter/archi-rules.json');

    const content = readConfig(configPath);
    assert.ok(content.includes('forbidden: []'));
    assert.ok(content.includes('allowed: ["test"]'));
    assert.ok(content.includes('options: {}'));
    assert.ok(content.includes('extends'));
  });

  test('B-8: supports ESM format (export default)', () => {
    const configPath = writeConfig(`export default {\n  forbidden: []\n};`);

    const modified = updateDependencyCruiserConfig(configPath, '.dc-reporter/archi-rules.json');

    assert.strictEqual(modified, true);
    const content = readConfig(configPath);
    assert.ok(content.includes('extends'), 'Config should contain extends field');
  });

  test('handles empty extends array', () => {
    const configPath = writeConfig(
      `module.exports = {\n  extends: [],\n  forbidden: []\n};`,
    );

    const modified = updateDependencyCruiserConfig(configPath, '.dc-reporter/archi-rules.json');

    assert.strictEqual(modified, true);
    const content = readConfig(configPath);
    assert.ok(content.includes('.dc-reporter/archi-rules.json'), 'Should add to empty array');
  });

  test('handles null extends value', () => {
    const configPath = writeConfig(
      `module.exports = {\n  extends: null,\n  forbidden: []\n};`,
    );

    const modified = updateDependencyCruiserConfig(configPath, '.dc-reporter/archi-rules.json');

    assert.strictEqual(modified, true);
    const content = readConfig(configPath);
    assert.ok(
      content.includes('.dc-reporter/archi-rules.json'),
      'Should replace null with array containing target',
    );
  });

  test('returns false when config file does not exist', () => {
    const result = updateDependencyCruiserConfig(
      resolve(tmpDir, 'nonexistent.js'),
      '.dc-reporter/archi-rules.json',
    );
    assert.strictEqual(result, false);
  });

  test('handles unknown export format gracefully', () => {
    const configPath = writeConfig(`module.define({\n  forbidden: []\n});`);

    const modified = updateDependencyCruiserConfig(configPath, '.dc-reporter/archi-rules.json');

    assert.strictEqual(modified, false, 'Should not modify unknown format');
  });
});
