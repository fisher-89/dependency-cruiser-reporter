import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', '__tests__/**/*.test.{ts,tsx}'],
  },
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
});
