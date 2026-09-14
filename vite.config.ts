import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: ['chrome107', 'firefox104', 'safari16'] },
  test: { include: ['tests/**/*.test.ts'] },
});
