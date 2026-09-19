import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  // Keep fingerprinted output separate from stable URLs copied from public/assets.
  build: { assetsDir: 'build-assets', target: ['chrome107', 'firefox104', 'safari16'] },
  test: { include: ['tests/**/*.test.ts'] },
});
