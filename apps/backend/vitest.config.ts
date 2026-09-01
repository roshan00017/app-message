import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@messaging/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@messaging/shared/types': path.resolve(__dirname, '../../packages/shared/src/types/index.ts'),
      '@messaging/shared/constants': path.resolve(__dirname, '../../packages/shared/src/constants/index.ts'),
      '@messaging/shared/utils': path.resolve(__dirname, '../../packages/shared/src/utils/index.ts'),
    },
  },
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
