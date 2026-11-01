import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { createRolloutEvidence } from './cove-rollout-evidence';
import { startSunsetPilot, driveSunset } from './sunset-browser-pilot';
import { FIRST_CLIMB, walk, jump, drop } from './sunset-pilot';
import { siteSteelDockInit, siteSteelSupports } from './site-steel-observer';

for (const width of [426, 320]) test(`Sunset steel preview uses ordinary ground, underpass and dock input at ${width}px`, async ({ page, browser }, info) => {
  test.setTimeout(90_000);
  const evidence = createRolloutEvidence(info);
  const hash = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
  const sourceFiles = ['src', 'public/assets/site'].flatMap(root => readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name))).sort();
  const source = Object.fromEntries(sourceFiles.map(path => [path, hash(readFileSync(path))]));
  const responses: object[] = [], responseErrors: string[] = [], pending: Promise<void>[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin !== new URL(info.project.use.baseURL!).origin) return;
    pending.push((async () => {
      try {
        const bytes = await response.body(), path = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
        const build = readFileSync(resolve('dist', path));
        responses.push({ path, status: response.status(), bytes: bytes.length, servedSha256: hash(bytes), buildSha256: hash(build) });
        expect(hash(bytes), path).toBe(hash(build));
      } catch (error) { responseErrors.push(String(error)); }
    })());
  });
  const capture = async (name: string): Promise<void> => {
    const metadata = await page.locator('#game').evaluate(canvas => {
      const game = canvas as HTMLCanvasElement, rect = game.getBoundingClientRect();
      return { logical: { width: game.width, height: game.height }, css: { width: rect.width, height: rect.height },
        viewport: { width: innerWidth, height: innerHeight }, status: document.querySelector('#status')!.textContent,
        png: game.toDataURL('image/png') };
    });
    await evidence.observe(name, metadata);
    await evidence.attach(`${name}-css`, { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  };
  const routes: object[] = [];
  const drive = async (name: string, stages: Parameters<typeof driveSunset>[1]): Promise<void> => {
    routes.push({ name, result: await driveSunset(page, stages) });
  };
  await page.addInitScript(() => {
    const flight = { armed: false, held: false };
    Object.assign(window, { siteSteelFlight: flight });
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(time => {
      callback(time);
      const status = document.querySelector('#status')?.textContent ?? '';
      const y = Number(status.match(/Y (-?\d+)/)?.[1]);
      if (flight.armed && y < 500 && y > 480) {
        const pilot = (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot;
        pilot.frozen = true; flight.armed = false; flight.held = true;
      }
    });
  });
  try {
    await page.addInitScript(siteSteelDockInit, siteSteelSupports());
    await startSunsetPilot(page);
    await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
    await drive('ground-lip', [walk(880)]);
    await capture('ground-lip');
    await drive('return-to-entrance', [jump(800, 620), walk(60), jump(60, 560), walk(210)]);
    await page.evaluate(() => { (window as unknown as { siteSteelFlight: { armed: boolean } }).siteSteelFlight.armed = true; });
    const flight = drive('ordinary-first-jump', [jump(210, 500)]);
    // This only holds an input-reached pose for screenshot capture, not scene state.
    try {
      await page.waitForFunction(() => (window as unknown as { siteSteelFlight: { held: boolean } }).siteSteelFlight.held, undefined, { timeout: 8000 });
      await capture('first-jump');
    } finally {
      await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = false; });
      await flight;
    }
    await capture('stacked-underpass');
    await drive('high-deck', FIRST_CLIMB.slice(2));
    await capture('high-deck');
    const dockDelta = (dock: 'near' | 'far') => page.locator('#game').evaluate((canvas, side) => {
      const sample = (canvas as HTMLCanvasElement).dataset;
      return Number(sample.craneScreenX) - Number(side === 'near' ? sample.nearDockScreenX : sample.farDockScreenX);
    }, dock);
    const playerX = async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]);
    await drive('approach-near-dock', [walk(440)]);
    await expect.poll(() => dockDelta('near'), { timeout: 8000, intervals: [16] }).toBeGreaterThan(4);
    await expect.poll(() => dockDelta('near'), { timeout: 8000, intervals: [16] }).toBeCloseTo(0, 0);
    await drive('board-outward', [walk(520)]);
    await capture('board-outward');
    await expect.poll(playerX, { timeout: 5000 }).toBeGreaterThanOrEqual(600);
    await capture('ride-outward');
    await drive('leave-at-far-dock', [walk(700), walk(760), walk(740)]);
    await capture('leave-at-far-dock');
    await expect.poll(() => dockDelta('far'), { timeout: 8000, intervals: [16] }).toBeLessThan(-4);
    await expect.poll(() => dockDelta('far'), { timeout: 8000, intervals: [16] }).toBeCloseTo(0, 0);
    await drive('board-return', [walk(620)]);
    await capture('board-return');
    await expect.poll(playerX, { timeout: 5000 }).toBeLessThanOrEqual(540);
    await capture('ride-return');
    await drive('leave-at-near-dock', [walk(440)]);
    await capture('leave-at-near-dock');
    await expect.poll(() => dockDelta('far'), { timeout: 8000, intervals: [16] }).toBeCloseTo(0, 0);
    await drive('absent-ferry-fall', [drop(470, 1, 520, 380)]);
    await capture('absent-ferry-catch');
    await drive('recover-near-dock', [walk(440), jump(440, 320)]);
    await drive('below-ferry', [drop(260, -1, 220, 380), walk(570)]);
    await capture('below-ferry');
    await drive('far-dock', [walk(740), jump(740, 320), walk(740)]);
    await capture('far-dock');
    await drive('return-dock', [drop(800, 1, 850, 380), walk(440), jump(440, 320), walk(350)]);
    await capture('return-high-deck');
    await Promise.all(pending);
    expect(responseErrors).toEqual([]); expect(errors).toEqual([]);
    expect(responses.length).toBeGreaterThan(50);
    for (const [path, digest] of Object.entries(source)) expect(hash(readFileSync(path)), path).toBe(digest);
  } finally {
    await Promise.all(pending);
    await evidence.observe('source-build-input-provenance', {
      sourceRevision: process.env.BROWSER_REPORT_SOURCE_SHA ?? null,
      workingBase: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(), source,
      browser: browser.browserType().name(), version: browser.version(), routes, responses, responseErrors, errors,
      scope: 'Actual input and production canvas. First-jump screenshot holds the existing pilot clock at an input-reached pose. Not owner acceptance.',
    });
    await evidence.assertIntegrity();
  }
});

const kit = JSON.parse(readFileSync(new URL('../public/assets/site/steel-v1/manifest.json', import.meta.url), 'utf8')) as { runs: { image: string }[] };
for (const name of ['site-declaration', 'manifest.json', ...kit.runs.map(run => run.image), 'ferry.png', 'ground-full.png']) {
  test(`Sunset required steel resource ${name} recovers through ordinary Retry`, async ({ page }, info) => {
    const path = name === 'site-declaration' ? '**/assets/site/manifest.json' : `**/assets/site/steel-v1/${name}`;
    const missingDeclaration = JSON.parse(readFileSync('public/assets/site/manifest.json', 'utf8'));
    delete missingDeclaration.siteTerrain;
    await page.route(path, route => route.fulfill(name === 'site-declaration'
      ? { status: 200, contentType: 'application/json', body: JSON.stringify(missingDeclaration) }
      : { status: 404, body: 'intentional missing steel resource' }));
    await page.goto('/?scene=adventure&debug=1');
    await expect(page.getByRole('button', { name: 'Retry loading', exact: true })).toBeVisible();
    await page.unroute(path);
    await page.getByRole('button', { name: 'Retry loading', exact: true }).click();
    await page.getByRole('button', { name: 'SUNSET SITE', exact: true }).click();
    await page.getByRole('button', { name: 'Play SUNSET SITE', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Playing');
    await createRolloutEvidence(info).attach('recovered-game', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  });
}
