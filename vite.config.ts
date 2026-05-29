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
      file: './bin/cli.js',
      codeSplitting: false,
      paths: {
        '@dcr-reporter/wasm': './wasm/wasm.js',
      },
    },
    copy: [
      { from: './packages/rust/pkg', to: './bin', rename: 'wasm' },
      { from: './packages/frontend/dist', to: './bin', rename: 'frontend' },
    ],
    format: 'es',
    dts: false,
    minify: true,
    sourcemap: false,
    clean: ['./bin'],
  },
});
