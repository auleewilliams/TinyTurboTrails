import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { createRolloutEvidence } from './cove-rollout-evidence';
import { startSunsetPilot, driveSunset } from './sunset-browser-pilot';
import { FIRST_CLIMB, CROSS_DESCENT, FINAL_CLIMB } from './sunset-pilot';

for (const width of [426, 320]) test(`Sunset whole steel rollout reaches the roof and finish at ${width}px with Pause`, async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const evidence = createRolloutEvidence(info), hash = (b: Buffer): string => createHash('sha256').update(b).digest('hex');
  const files = ['src', 'public/assets/site'].flatMap(root => readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name))).sort();
  const source = Object.fromEntries(files.map(path => [path, hash(readFileSync(path))]));
  const responses: object[] = [], errors: string[] = [], pending: Promise<void>[] = [], routes: object[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin !== new URL(info.project.use.baseURL!).origin) return;
    pending.push((async () => {
      try {
        const path = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
        const body = await response.body(), build = readFileSync(resolve('dist', path));
        responses.push({ path, status: response.status(), servedSha256: hash(body), buildSha256: hash(build) });
        expect(response.status()).toBe(200); expect(hash(body), path).toBe(hash(build));
      } catch (e) { errors.push(String(e)); }
    })());
  });
  const capture = async (name: string): Promise<void> => {
    await evidence.observe(name, await page.locator('#game').evaluate(canvas => {
      const game = canvas as HTMLCanvasElement, rect = game.getBoundingClientRect();
      return { logical: { width: game.width, height: game.height }, css: { width: rect.width, height: rect.height },
        viewport: { width: innerWidth, height: innerHeight }, status: document.querySelector('#status')!.textContent,
        png: game.toDataURL('image/png') };
    }));
    await evidence.attach(`${name}-css`, { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  };
  const drive = async (name: string, stages: Parameters<typeof driveSunset>[1]): Promise<void> => {
    routes.push({ name, result: await driveSunset(page, stages) }); await capture(name);
  };
  try {
    await page.emulateMedia({ reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
    await startSunsetPilot(page); await page.setViewportSize({ width, height: width === 320 ? 240 : 300 });
    await capture('entrance');
    await drive('stacked-underpass', FIRST_CLIMB.slice(0, 2));
    await drive('high-deck', FIRST_CLIMB.slice(2));
    await drive('descent', CROSS_DESCENT.slice(0, 5));
    await drive('yard', CROSS_DESCENT.slice(5));
    await drive('rest', FINAL_CLIMB.slice(0, 7));
    await page.keyboard.press('Escape');
    await expect(page.locator('#status')).toContainText('Paused');
    await capture('paused-rest');
    const frozen = await page.locator('#game').evaluate(c => (c as HTMLCanvasElement).toDataURL());
    await page.evaluate(() => new Promise<void>(resolve => {
      let frames = 0; const step = () => ++frames === 30 ? resolve() : requestAnimationFrame(step); requestAnimationFrame(step);
    }));
    expect(await page.locator('#game').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(frozen);
    await page.keyboard.press('Escape'); await expect(page.locator('#status')).toContainText('Playing');
    await drive('roof', FINAL_CLIMB.slice(7));
    await driveSunset(page, [{ kind: 'finish' }]);
    await page.getByRole('button', { name: 'Build your word', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Bag 0/4'); await capture('finish');
    await Promise.all(pending); expect(errors).toEqual([]); expect(responses.length).toBeGreaterThan(80);
    for (const [path, digest] of Object.entries(source)) expect(hash(readFileSync(path)), path).toBe(digest);
  } finally {
    await Promise.all(pending);
    await evidence.observe('source-build-input-provenance', { sourceRevision: process.env.BROWSER_REPORT_SOURCE_SHA ?? null,
      workingBase: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(), source, responses, errors, routes,
      browser: browser.browserType().name(), version: browser.version(), reducedMotion: width === 320,
      scope: 'Actual input-driven full main route and real Pause; no state injection. Separate from owner playtesting.' });
    await evidence.assertIntegrity();
  }
});
