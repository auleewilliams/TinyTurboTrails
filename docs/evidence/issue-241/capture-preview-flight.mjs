// Supplemental real-input flight and ground-end evidence, against the current production preview server.
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const modules = await createServer({ root, configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const { installTimberKeyboardPilot, runTimberStages, TIMBER_TO_MIDDLE, TIMBER_SPRING_RETRY } = await modules.ssrLoadModule('/tests/timbers-browser-pilot.ts');
await modules.close();
const out = new URL('./preview-flight/', import.meta.url); await mkdir(out, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const browser = await chromium.launch();
const report = { sourceRevision: null, method: 'Existing DOM keyboard pilot, unmodified player/camera. Frame observer freezes only the pilot clock at the capture point.', browser: browser.version(), files: {}, cases: [] };
for (const file of ['src/world/renderer.ts', 'src/world/timbers-terrain.ts', 'src/world/treetop-timbers.ts', 'dist/index.html']) report.files[file] = hash(await readFile(root + file));
let failure;
try {
  for (const width of [426, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 426 ? 300 : 240 }, deviceScaleFactor: 1 });
    const page = await context.newPage(), entry = { width, errors: [], routes: [], captures: [] }; report.cases.push(entry);
    page.on('pageerror', error => entry.errors.push(String(error)));
    await installTimberKeyboardPilot(page);
    await page.addInitScript(() => {
      window.previewFlight = { armed: false, phase: 0, captured: false };
      const watch = () => {
        const s = window.previewFlight, status = document.querySelector('#status')?.textContent ?? '';
        const y = Number(status.match(/Y (-?\d+)/)?.[1]);
        if (s.armed && !s.captured && ((s.phase === 0 && y < 610 && y > 590) || (s.phase === 1 && y < 580 && y > 555))) {
          s.captured = true; window.timberKeyboardPilot.frozen = true;
        }
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    });
    const start = async () => {
      await page.goto(process.env.TIMBERS_BASE_URL ?? 'http://127.0.0.1:4173/?scene=adventure&debug=1');
      await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
      await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('X 100 Y 1046'));
    };
    const route = async (name, stages) => {
      const result = await runTimberStages(page, stages); entry.routes.push({ name, result });
      assert.equal(result.error, ''); assert.equal(result.done, true);
    };
    const capture = async name => {
      await page.evaluate(() => { window.timberKeyboardPilot.frozen = true; });
      const result = await page.evaluate(() => {
        const canvas = document.querySelector('#game'), box = canvas.getBoundingClientRect();
        return { status: document.querySelector('#status').textContent, native: [canvas.width, canvas.height],
          css: { width: box.width, height: box.height }, png: canvas.toDataURL('image/png') };
      });
      const png = Buffer.from(result.png.split(',')[1], 'base64'); delete result.png;
      result.nativePath = `${width}-${name}-native.png`; result.cssPath = `${width}-${name}-css.png`;
      await writeFile(new URL(result.nativePath, out), png);
      const css = await page.locator('#game').screenshot(); await writeFile(new URL(result.cssPath, out), css);
      result.nativeSha256 = hash(png); result.cssSha256 = hash(css); entry.captures.push({ name, ...result });
      assert.deepEqual(result.native, [426, 240]); assert.equal(result.css.width, width);
      console.log(width, name, result.status);
    };
    await start();
    await route('ground-right', [{ kind: 'walk', x: 400 }, { kind: 'walk', x: 780 }]); await capture('ground-right');
    await page.evaluate(() => { window.timberKeyboardPilot.frozen = false; });
    await route('ground-left', [{ kind: 'walk', x: 400 }, { kind: 'walk', x: 60 }]); await capture('ground-left');
    await page.evaluate(() => { window.timberKeyboardPilot.frozen = false; });
    await start(); await route('middle', TIMBER_TO_MIDDLE);
    await route('under-spring', [{ kind: 'walk', x: 100 }]);
    await page.evaluate(() => { window.previewFlight.armed = true; });
    const flight = route('spring-flight', TIMBER_SPRING_RETRY.slice(1, 2));
    for (const name of ['spring-ascent', 'spring-crossing']) {
      await page.waitForFunction(() => window.previewFlight.captured, undefined, { timeout: 15000 });
      await capture(name);
      await page.evaluate(() => { window.previewFlight.phase++; window.previewFlight.captured = false;
        window.previewFlight.armed = window.previewFlight.phase < 2; window.timberKeyboardPilot.frozen = false; });
    }
    await flight; assert.deepEqual(entry.errors, []); await context.close();
  }
} catch (error) { report.failure = String(error.stack ?? error); failure = error; }
finally { await browser.close(); await writeFile(new URL('report.json', out), JSON.stringify(report, null, 2) + '\n'); }
if (failure) throw failure;
