import { defineConfig } from 'vite-plus/test/config';
import { createRequire } from 'node:module';
import path from 'path';

const configDir = path.resolve(__dirname);
const projectRoot = path.resolve(configDir, '../../../../');
const frontendRoot = path.resolve(projectRoot, 'packages/frontend');
const frontendRequire = createRequire(path.resolve(frontendRoot, 'package.json'));
const react = frontendRequire('@vitejs/plugin-react');

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(frontendRoot, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'openspec/changes/graph-scan-loading-overlay/tests/**/*.test.{ts,tsx}',
    ],
    setupFiles: [path.resolve(frontendRoot, 'vitest.setup.ts')],
    server: {
      deps: {
        inline: ['@testing-library/jest-dom'],
      },
    },
  },
});
