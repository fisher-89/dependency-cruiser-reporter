import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vite-plus';

import checkConfig from '../../vite-check.config.ts';

export default defineConfig(
  mergeConfig(checkConfig, {
    plugins: [react()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
    },
  }),
);
