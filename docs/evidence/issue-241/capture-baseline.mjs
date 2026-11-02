// Planning evidence only. Run with Node 22 after npm run build.
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const modules = await createServer({ root, configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const { installTimberKeyboardPilot, runTimberStages, TIMBER_ASCENT_RIGHT,
  TIMBER_TO_MIDDLE, TIMBER_SPRING_RETRY, TIMBER_DESCENT_ALL } = await modules.ssrLoadModule('/tests/timbers-browser-pilot.ts');
const { TREETOP_TIMBERS: level } = await modules.ssrLoadModule('/src/world/treetop-timbers.ts');
await modules.close();
const out = new URL('./baseline/', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(out, { recursive: true });
const files = {};
for (const directory of ['src', 'public', 'dist']) {
  for (const entry of await readdir(root + directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const absolute = `${entry.parentPath}/${entry.name}`;
    files[absolute.slice(root.length)] = hash(await readFile(absolute));
  }
}
const report = { sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  capturedAt: new Date().toISOString(), method: 'Production build; existing DOM keyboard pilot; no scene/player/camera mutation. Pilot freezes clock only while capturing settled states.',
  files, cases: [] };
const browser = await chromium.launch();
report.browser = { name: 'chromium', version: browser.version() };
let failure;
try {
  for (const width of [426, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 426 ? 300 : 240 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const entry = { width, errors: [], routes: [], captures: [], responses: [] };
    report.cases.push(entry);
    const pending = [];
    page.on('pageerror', error => entry.errors.push(String(error)));
    page.on('response', response => {
      if (!response.url().includes('127.0.0.1')) return;
      pending.push((async () => {
        try {
          const bytes = await response.body();
          const path = new URL(response.url()).pathname;
          const record = { path, status: response.status(), bytes: bytes.length, sha256: hash(bytes) };
          if (files[`dist${path}`]) record.matchesBuild = record.sha256 === files[`dist${path}`];
          entry.responses.push(record);
        } catch (error) { entry.responses.push({ url: response.url(), error: String(error) }); }
      })());
    });
    await installTimberKeyboardPilot(page);
    // Capture one native frame during an ordinary jump, from the actual painted canvas.
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.drawImage;
      window.timberPlanActor = null;
      CanvasRenderingContext2D.prototype.drawImage = function (source, ...args) {
        if (this.canvas.id === 'game' && source instanceof HTMLImageElement && source.src.includes('/henry/henry-celebration.png') && args.length === 8) {
          window.timberPlanActor = { source: source.src, args, transform: Array.from(['a', 'b', 'c', 'd', 'e', 'f'], key => this.getTransform()[key]) };
        }
        return original.call(this, source, ...args);
      };
      const watch = () => {
        const status = document.querySelector('#status')?.textContent ?? '';
        const match = status.match(/Y (-?\d+)/);
        if (window.timberPlanFlightArmed && match && Number(match[1]) < 610 && Number(match[1]) > 580) {
          window.timberPlanFlight = { status, actor: window.timberPlanActor, png: document.querySelector('#game').toDataURL('image/png') };
          window.timberPlanFlightArmed = false;
        }
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    });
    const capture = async (name, supportId) => {
      await page.evaluate(() => { window.timberKeyboardPilot.frozen = true; });
      const sample = await page.evaluate(() => {
        const canvas = document.querySelector('#game'), box = canvas.getBoundingClientRect();
        return { native: [canvas.width, canvas.height], css: { width: box.width, height: box.height },
          viewport: [innerWidth, innerHeight], status: document.querySelector('#status')?.textContent,
          actor: window.timberPlanActor, png: canvas.toDataURL('image/png') };
      });
      assert.deepEqual(sample.native, [426, 240]);
      assert.equal(sample.css.width, width);
      if (supportId) {
        const matches = level.platforms.filter(platform => platform.id === supportId);
        assert.equal(matches.length, 1);
        sample.expectedSupport = { id: supportId, top: matches[0].from.y };
        assert.equal(Number(sample.status.match(/Y (-?\d+)/)[1]) + 34, matches[0].from.y);
      }
      const native = Buffer.from(sample.png.split(',')[1], 'base64');
      delete sample.png;
      const css = await page.locator('#game').screenshot();
      const nativePath = `${width}-${name}-native.png`, cssPath = `${width}-${name}-css.png`;
      await writeFile(new URL(nativePath, out), native);
      await writeFile(new URL(cssPath, out), css);
      entry.captures.push({ name, ...sample, nativePath, nativeSha256: hash(native), cssPath, cssSha256: hash(css) });
      await page.evaluate(() => { window.timberKeyboardPilot.frozen = false; });
      console.log(width, name, sample.status);
    };
    const route = async (name, stages) => {
      const result = await runTimberStages(page, stages);
      entry.routes.push({ name, result });
      assert.equal(result.error, '', name);
      assert.equal(result.done, true, name);
    };
    const start = async () => {
      await page.goto(process.env.TIMBERS_BASE_URL ?? 'http://127.0.0.1:4179/?scene=adventure&debug=1');
      await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
      await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('X 100 Y 1046'));
    };
    await start();
    await capture('roots');
    await route('ascent-to-middle', TIMBER_TO_MIDDLE);
    await capture('middle', 'timber-middle');
    await route('under-spring', [{ kind: 'walk', x: 100 }]);
    await capture('under-spring', 'timber-middle');
    await page.evaluate(() => { window.timberPlanFlightArmed = true; });
    await route('spring-reward', TIMBER_SPRING_RETRY.slice(1, 2));
    await capture('spring-reward', 'timber-spring-reward');
    const flight = await page.evaluate(() => window.timberPlanFlight);
    assert.ok(flight, 'actual spring flight captured');
    const flightBytes = Buffer.from(flight.png.split(',')[1], 'base64');
    delete flight.png;
    flight.path = `${width}-spring-flight-native.png`; flight.sha256 = hash(flightBytes);
    await writeFile(new URL(flight.path, out), flightBytes); entry.flight = flight;
    await route('spring-clear-catch', TIMBER_SPRING_RETRY.slice(2, 4));
    await capture('spring-catch', 'timber-spring-catch');
    await route('spring-repeat', TIMBER_SPRING_RETRY.slice(4));
    await capture('spring-repeat', 'timber-spring-reward');
    await start();
    await route('full-ascent', TIMBER_ASCENT_RIGHT);
    await capture('finish');
    await page.getByRole('button', { name: 'Build your word', exact: true }).click();
    await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
    await route('return-to-middle', TIMBER_DESCENT_ALL.slice(0, 14));
    await capture('return-middle-edge', 'timber-middle');
    await route('return-720', TIMBER_DESCENT_ALL.slice(14, 15));
    await capture('return-720', 'timber-return-720');
    await route('return-780', TIMBER_DESCENT_ALL.slice(15, 16));
    await capture('return-780', 'timber-return-780');
    await route('return-to-roots', TIMBER_DESCENT_ALL.slice(16));
    await capture('returned-roots');
    await Promise.all(pending);
    assert.deepEqual(entry.errors, []);
    assert.ok(entry.responses.every(response => response.matchesBuild !== false));
    await context.close();
  }
} catch (error) {
  report.failure = String(error.stack ?? error); failure = error;
} finally {
  await browser.close();
  await writeFile(new URL('report.json', out), JSON.stringify(report, null, 2) + '\n');
}
if (failure) throw failure;
