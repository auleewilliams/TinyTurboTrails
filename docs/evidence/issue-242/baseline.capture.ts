import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startSunsetPilot, driveSunset } from '../../../tests/sunset-browser-pilot';
import { FIRST_CLIMB, CROSS_DESCENT, FINAL_CLIMB, walk, jump } from '../../../tests/sunset-pilot';

const hash = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

test('Sunset unchanged planning baseline with source, served bodies and paired views', async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const directory = resolve('docs/evidence/issue-242/baseline');
  await mkdir(directory, { recursive: true });
  const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
  const sourceFiles = execFileSync('git', ['ls-files', '-z', 'src', 'public']).toString().split('\0').filter(Boolean);
  const inventory = JSON.parse(await readFile('docs/evidence/issue-242/inventory.json', 'utf8'));
  expect(sourceRevision).toBe(inventory.sourceRevision);
  for (const file of sourceFiles) expect(hash(await readFile(file)), file).toBe(inventory.sourceHashes[file]);
  const responses: object[] = [], responseErrors: string[] = [], pending: Promise<void>[] = [], pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin !== new URL(info.project.use.baseURL!).origin) return;
    pending.push((async () => {
      try {
        const body = await response.body();
        const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
        const built = await readFile(resolve('dist', relative));
        responses.push({ path: relative, status: response.status(), bytes: body.length,
          servedSha256: hash(body), buildSha256: hash(built) });
        expect(hash(body), relative).toBe(hash(built));
        expect(response.status(), relative).toBe(200);
      } catch (error) { responseErrors.push(String(error)); }
    })());
  });
  const captures: object[] = [], routes: object[] = [];
  const capture = async (name: string): Promise<void> => {
    // Existing keyboard pilot clock holds a reached pose only while capturing.
    // It does not move Henry, set the camera, or inject scene/run state.
    await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = true; });
    for (const width of [426, 320]) {
      await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
      const metadata = await page.locator('#game').evaluate(canvas => {
        const game = canvas as HTMLCanvasElement, rect = game.getBoundingClientRect();
        return { native: { width: game.width, height: game.height }, css: { width: rect.width, height: rect.height },
          viewport: { width: innerWidth, height: innerHeight }, status: document.querySelector('#status')!.textContent,
          png: game.toDataURL('image/png') };
      });
      const native = Buffer.from(metadata.png.split(',')[1], 'base64');
      const css = await page.locator('#game').screenshot();
      const files = [];
      for (const [kind, bytes] of [['native', native], ['css', css]] as const) {
        const filename = `${name}-${width}-${kind}.png`;
        await writeFile(resolve(directory, filename), bytes, { flag: 'wx' });
        await info.attach(filename, { path: resolve(directory, filename), contentType: 'image/png' });
        files.push({ kind, path: filename, sha256: hash(bytes), bytes: bytes.length });
      }
      const { png: _png, ...dimensions } = metadata;
      captures.push({ name, ...dimensions, files });
    }
    await page.setViewportSize({ width: 426, height: 300 });
    await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = false; });
  };
  const drive = async (name: string, stages: Parameters<typeof driveSunset>[1]): Promise<void> => {
    routes.push({ name, result: await driveSunset(page, stages) });
  };
  try {
    await startSunsetPilot(page);
    await capture('entrance');
    await drive('first-step', FIRST_CLIMB.slice(0, 2)); await capture('stacked-underpass');
    await drive('high-deck', FIRST_CLIMB.slice(2)); await capture('high-deck');
    await drive('crane-catch', [...CROSS_DESCENT.slice(0, 1), walk(570)]); await capture('below-ferry');
    await drive('far-dock', [walk(740), jump(740, 320), walk(740)]); await capture('far-dock');
    await drive('return-high-deck', [walk(740), { kind: 'drop', edge: 800, direction: 1, x: 850, y: 380 }, walk(440), jump(440, 320), walk(350)]);
    await drive('descent', CROSS_DESCENT.slice(0, 5)); await capture('descent');
    await drive('yard', CROSS_DESCENT.slice(5)); await capture('yard');
    await drive('rest', FINAL_CLIMB.slice(0, 7)); await capture('rest');
    await drive('roof', FINAL_CLIMB.slice(7)); await capture('roof');
    expect(pageErrors).toEqual([]);
    await Promise.all(pending);
    expect(responseErrors).toEqual([]);
    expect(responses.length).toBeGreaterThan(30);
  } finally {
    await Promise.all(pending);
    await writeFile(resolve(directory, 'capture-manifest.json'), JSON.stringify({
      sourceRevision, productionSourceMatchesInventory: true, browser: browser.browserType().name(), version: browser.version(),
      scope: 'Unchanged production runtime; input-dispatched journey and paired captures. Screenshot poses hold the existing pilot clock. Not owner acceptance.',
      captures, routes, responses, responseErrors, pageErrors,
    }, null, 2) + '\n', { flag: 'wx' });
  }
});
