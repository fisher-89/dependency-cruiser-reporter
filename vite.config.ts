import { writeFileSync } from 'node:fs';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {},
  lint: { "options": { "typeAware": true, "typeCheck": true } },
  pack: {
    target: 'esnext',
    entry: ['./packages/cli/bin/cli.js'],
    deps: {
      neverBundle: ['@dcr-reporter/wasm'],
      alwaysBundle: [/.+/],
    },
    outputOptions: {
      dir: './bin',
      entryFileNames: 'cli.js',
      codeSplitting: false,
      paths: {
        '@dcr-reporter/wasm': './wasm/wasm.js',
      },
    },
    copy: [
      { from: './packages/rust/pkg/*.*', to: './bin/wasm' },
      { from: './packages/frontend/dist', to: './bin', rename: 'frontend' },
    ],
    hooks: {
      'build:done': async (ctx) => {
        const pkg = await import('./package.json');
        writeFileSync('./bin/package.json', JSON.stringify({
          name: pkg.name,
          version: pkg.version,
          bin: { 'dep-reporter': './cli.js' },
        }, null, 2));
      }
    },
    format: 'es',
    dts: false,
    minify: true,
    sourcemap: false,
    clean: ['./bin'],
  },
});
