import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const url = process.argv[2] ?? 'http://127.0.0.1:4179/?scene=adventure';
const outputPath = process.argv[3];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const seen = new Map();
  page.on('response', async (response) => {
    try { seen.set(new URL(response.url()).pathname, (await response.body()).length); } catch { /* non-body response */ }
  });
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('Adventure'));
  await page.waitForTimeout(1500);
  const assets = [...seen].sort((left, right) => right[1] - left[1]);
  const bytes = assets.reduce((total, [, size]) => total + size, 0);
  const result = {
    url,
    bytes,
    mebibytes: Number((bytes / 1024 / 1024).toFixed(2)),
    responses: assets.length,
    requestedHenryReference: seen.has('/assets/henry/reference.png'),
    assets: assets.filter(([, size]) => size > 20_000).map(([path, size]) => ({ path, bytes: size })),
  };
  const json = `${JSON.stringify(result, null, 2)}\n`;
  console.log(json.trimEnd());
  if (outputPath) await writeFile(outputPath, json);
} finally {
  await browser.close();
}
