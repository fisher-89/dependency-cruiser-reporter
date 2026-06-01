import { defineConfig, mergeConfig } from 'vite-plus';

import checkConfig from '../../vite-check.config.ts';

export default defineConfig(
  mergeConfig(checkConfig, {
    pack: {
      entry: ['./src/bin/cli.ts'],
      loader: {
        '.template': 'text',
      },
      outputOptions: {
        dir: './bin',
        entryFileNames: 'cli.js',
      },
      format: 'es',
      dts: true,
      sourcemap: true,
      clean: ['./bin'],
    },
  }),
);
