// Supplemental production-build audit. Run from the repository root after
// npm run build and npm run preview -- --port 4173 --strictPort.
// This records observations, including defects; it is not a pass/fail test suite.
import { chromium, firefox, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] ?? 'docs/evidence/2026-09-16-macos');
await mkdir(output, { recursive: true });
const report = {
  startedAt: new Date().toISOString(),
  candidateCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  os: execFileSync('sw_vers', [], { encoding: 'utf8' }).trim(),
  input: 'Playwright keyboard events; no physical input',
  method: 'Unmodified production build. Canvas wrappers only observe HUD text and draw calls. Gamepad polling returns no devices to isolate scripted keyboard input from concurrent physical playtesting.',
  browsers: [],
};

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const context = await browser.newContext({ viewport: { width: 1278, height: 780 } });
  const result = { name, version: browser.version(), errors: [], failedRequests: [], requests: [], routes: [] };
  const urls = new Set();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] });
    const probe = { hud: '', texts: [], draws: [], frames: [] };
    window.releaseProbe = probe;
    const prototype = CanvasRenderingContext2D.prototype;
    const fillRect = prototype.fillRect;
    prototype.fillRect = function (...args) {
      if (args[0] === 0 && args[1] === 0 && args[2] === 426 && args[3] === 240) {
        probe.texts = [];
        probe.draws = [];
      }
      return fillRect.apply(this, args);
    };
    const fillText = prototype.fillText;
    prototype.fillText = function (...args) {
      const text = String(args[0]);
      if (text.startsWith('GEMS ')) probe.hud = text;
      probe.texts.push({ text, x: args[1], y: args[2], width: this.measureText(text).width });
      return fillText.apply(this, args);
    };
    const drawImage = prototype.drawImage;
    prototype.drawImage = function (image, ...args) {
      const source = image.src ?? '';
      const matrix = this.getTransform();
      const draw = { source: source.split('/').pop(), args, scaleX: matrix.a, scaleY: matrix.d };
      probe.draws.push(draw);
      if (source.endsWith('/henry/starter.png') && !probe.frames.includes(`${args[0]},${args[1]}`)) {
        probe.frames.push(`${args[0]},${args[1]}`);
      }
      return drawImage.call(this, image, ...args);
    };
  });
  context.on('page', (page) => {
    page.on('pageerror', (error) => result.errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') result.errors.push(message.text()); });
    page.on('requestfailed', (request) => result.failedRequests.push({ url: request.url(), error: request.failure() }));
    page.on('response', (response) => { if (response.status() >= 400) result.errors.push(`${response.status()} ${response.url()}`); });
    page.on('request', (request) => urls.add(request.url()));
  });
  let page = await context.newPage();
  const snapshot = () => page.evaluate(() => ({
    status: document.querySelector('#status').textContent,
    ...window.releaseProbe,
    localStorage: Object.keys(localStorage),
    sessionStorage: Object.keys(sessionStorage),
  }));
  const shot = (label) => page.screenshot({ path: resolve(output, `${name}-${label}.png`) });
  const start = async () => {
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Title'));
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Playing'));
  };
  const acquireProgress = async () => {
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => Number(document.querySelector('#status').textContent.match(/X (\d+)/)?.[1]) > 105);
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    await page.keyboard.up('Space');
    result.collectedGem = await snapshot();
    await shot('collected-gem');
    await page.waitForFunction(() => Number(document.querySelector('#status').textContent.match(/X (\d+)/)?.[1]) > 520);
    await page.keyboard.down('Space');
    await page.waitForTimeout(250);
    await page.keyboard.up('Space');
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(250);
    const state = await snapshot();
    if (!/GEMS [1-9]\d*   CHECKPOINT checkpoint-meadow/.test(state.hud)) {
      throw new Error(`Progress acquisition failed: ${state.hud}`);
    }
    return state;
  };
  try {
    await page.goto('http://127.0.0.1:4173/?scene=adventure&debug=1');
    await shot('title');
    await start();
    result.initial = await snapshot();
    for (const mode of ['no-jump', 'jump-route']) {
      const route = { mode, startedAt: new Date().toISOString(), samples: [], captures: [] };
      const started = Date.now();
      const captured = new Set();
      await page.keyboard.down('ArrowRight');
      for (let step = 0; step < 350 && Date.now() - started < 45000; step++) {
        const state = await snapshot();
        route.samples.push({ ms: Date.now() - started, status: state.status, hud: state.hud });
        if (state.status.includes('Finish')) break;
        const x = Number(state.status.match(/X (\d+)/)?.[1] ?? 0);
        for (const checkpoint of [570, 1220, 1780]) {
          if (x >= checkpoint + 20 && !captured.has(checkpoint)) {
            captured.add(checkpoint);
            route.captures.push({ checkpointX: checkpoint, ...state });
            await shot(`${mode}-checkpoint-${checkpoint}`);
          }
        }
        if (mode === 'jump-route' && [430, 550, 920, 1040, 1200, 1760, 1880].some((obstacle) => Math.abs(obstacle - x) < 65)) {
          await page.keyboard.down('Space');
          await page.waitForTimeout(240);
          await page.keyboard.up('Space');
        }
        await page.waitForTimeout(75);
      }
      await page.keyboard.up('ArrowRight');
      route.elapsedMs = Date.now() - started;
      route.finish = await snapshot();
      await shot(`${mode}-finish`);
      result.routes.push(route);
      if (!route.finish.status.includes('Finish')) throw new Error(`${mode} failed to finish within audit budget`);
      await page.keyboard.press('Space');
      await start();
      route.afterReplay = await snapshot();
    }
    // Acquire real gem + checkpoint state without mutating game objects.
    result.beforeReload = await acquireProgress();
    await shot('before-reload');
    await page.reload();
    await start();
    result.afterReload = await snapshot();
    result.beforeClose = await acquireProgress();
    await page.close();
    page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/?scene=adventure&debug=1');
    await start();
    result.afterReopen = await snapshot();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    result.facingRight = await snapshot();
    await shot('facing-right');
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(450);
    result.facingLeft = await snapshot();
    await shot('facing-left');
    await page.keyboard.up('ArrowLeft');
    await page.setViewportSize({ width: 320, height: 200 });
    result.smallViewport = await page.locator('canvas').boundingBox();
    await shot('small-viewport');
    await page.setViewportSize({ width: 1278, height: 780 });
    await page.goto('http://127.0.0.1:4173/?scene=art');
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Art preview'));
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(90);
      await shot(`art-${i}`);
    }
    result.art = await snapshot();
  } catch (error) {
    result.auditError = String(error);
  } finally {
    result.requests = [...urls];
    report.browsers.push(result);
    await browser.close();
    await writeFile(resolve(output, 'audit.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ name, version: result.version, routes: result.routes.map((route) => ({ mode: route.mode, elapsedMs: route.elapsedMs, finish: route.finish.status })), auditError: result.auditError, errors: result.errors }));
  }
}
