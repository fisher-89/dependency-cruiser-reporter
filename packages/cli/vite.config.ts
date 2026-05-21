import { defineConfig } from 'vite-plus';

export default defineConfig({
  resolve: {
  },
  pack: {
    entry: ['./src/bin/cli.ts'],
    loader: {
      '.template': 'text'
    },
    outDir: 'bin',
    format: 'es',
    outExtensions: () => ({ js: '.js' }),
    dts: true,
    minify: true,
    sourcemap: true,
    clean: true,
  },
});
