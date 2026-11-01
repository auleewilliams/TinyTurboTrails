import { defineConfig } from '@playwright/test';
import base from '../../../playwright.config';

// Separate planning capture; does not alter the configured regression suite.
export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: 'baseline.capture.ts',
  outputDir: '../../../test-results/issue-242/planning-capture/artifacts',
  reporter: [['dot'], ['json', { outputFile: 'test-results/issue-242/planning-capture/report.json' }]],
  workers: 1,
});
