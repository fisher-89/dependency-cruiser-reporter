import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['./src/bin/cli.ts'],
    loader: {
      '.template': 'text'
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
});
