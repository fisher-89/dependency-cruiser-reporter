import { writeFileSync } from 'node:fs';

import { defineConfig, mergeConfig } from 'vite-plus';

import checkConfig from './vite-check.config.ts';

export default defineConfig(
  mergeConfig(checkConfig, {
    pack: {
      target: 'esnext',
      entry: ['./packages/cli/bin/cli.js'],
      deps: {
        neverBundle: ['@dcr-reporter/wasm', 'dependency-cruiser'],
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
        'build:done': async () => {
          const pkg = await import('./package.json');
          const cliPkg = await import('./packages/cli/package.json');
          writeFileSync(
            './bin/package.json',
            JSON.stringify(
              {
                name: pkg.name,
                version: pkg.version,
                bin: { 'dep-report': './cli.js' },
                dependencies: {
                  'dependency-cruiser':cliPkg.dependencies['dependency-cruiser'],
                }
              },
              null,
              2,
            ),
          );
        },
      },
      format: 'es',
      dts: false,
      // minify: true,
      sourcemap: false,
      clean: ['./bin'],
    },
  }),
);
