import { expect, test } from '@playwright/test';
import { startSunsetPilot, driveSunset } from './sunset-browser-pilot';
import { MAIN_ROUTE, ALL_RETURN, REASCENT, FIRST_CLIMB, CROSS_DESCENT, FINAL_CLIMB, DOWN_FINAL, UP_DESCENT, walk, jump, drop } from './sunset-pilot';

for (const viewport of [{ width: 426, height: 300 }, { width: 320, height: 240 }, { width: 1366, height: 768 }]) {
  test(`Sunset fixed main route has zero BEAM letters at ${viewport.width}px`, async ({ page, browser }, info) => {
    test.setTimeout(90_000);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await startSunsetPilot(page); await page.setViewportSize(viewport);
    await info.attach('entrance', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    const first = await driveSunset(page, FIRST_CLIMB);
    await info.attach('first-high-deck-docks', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    const descent = await driveSunset(page, CROSS_DESCENT.slice(0, 5));
    await info.attach('frame-descent-CP2', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    const crossing = await driveSunset(page, CROSS_DESCENT.slice(5));
    await info.attach('lower-yard', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    const rest = await driveSunset(page, FINAL_CLIMB.slice(0, 7));
    await info.attach('broad-rest-CP4', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    const final = await driveSunset(page, FINAL_CLIMB.slice(7));
    await expect(page.locator('#status')).toContainText('Letter bag: 0/4');
    await info.attach('highest-roof', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    await driveSunset(page, [{ kind: 'finish' }]);
    await page.getByRole('button', { name: 'Build your word', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Bag 0/4');
    expect(errors).toEqual([]);
    await info.attach('input-provenance', { body: JSON.stringify({ source: process.env.BROWSER_REPORT_SOURCE_SHA,
      browser: browser.browserType().name(), version: browser.version(), viewport, nativeCanvas: { width: 426, height: 240 }, first, descent, crossing, rest, final }), contentType: 'application/json' });
  });
}

test('Sunset actual finish retrace recovers all missed BEAM, reactivates checkpoints and returns', async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await startSunsetPilot(page);
  const outward = await driveSunset(page, MAIN_ROUTE);
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 0/4');
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  await expect(page.locator('#status')).toContainText('X 2930 Y 106 V 0');
  const down = await driveSunset(page, DOWN_FINAL);
  await info.attach('return-yard', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  const up = await driveSunset(page, UP_DESCENT);
  await info.attach('fixed-A-dock', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  const remaining = await driveSunset(page, ALL_RETURN.slice(DOWN_FINAL.length + UP_DESCENT.length));
  await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
  await info.attach('B-return-landing', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  const back = await driveSunset(page, REASCENT);
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 4/4');
  for (const [slot, letter] of [...'BEAM'].entries()) {
    await page.getByRole('button', { name: `Letter ${letter}`, exact: true }).click();
    await page.getByRole('button', { name: `Space ${slot + 1}: empty`, exact: true }).click();
  }
  await expect(page.locator('#status')).toContainText('BEAM sticker earned!');
  await info.attach('all-missing-input-provenance', { body: JSON.stringify({ source: process.env.BROWSER_REPORT_SOURCE_SHA,
    browser: browser.browserType().name(), version: browser.version(), viewport: { width: 426, height: 300 }, outward, down, up, remaining, back }), contentType: 'application/json' });
});

const collectB = [...FIRST_CLIMB.slice(0, 4), walk(350), walk(275), ...FIRST_CLIMB.slice(4)];
const collectE = [...CROSS_DESCENT.slice(0, 4), walk(1840), ...CROSS_DESCENT.slice(4)];
const collectA = [walk(740), jump(740, 320), walk(740), drop(800, 1, 850, 380)];
const collectM = [...FINAL_CLIMB.slice(0, -1), walk(2720), walk(2820), FINAL_CLIMB.at(-1)!];
for (const only of ['M', 'A']) test(`Sunset only missed ${only} uses native retrace and returns to word flow`, async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await startSunsetPilot(page);
  const route = only === 'M'
    ? [...collectB, CROSS_DESCENT[0], ...collectA, ...collectE.slice(1), ...FINAL_CLIMB, { kind: 'finish' as const }]
    : [...collectB, ...collectE, ...collectM, { kind: 'finish' as const }];
  const outward = await driveSunset(page, route);
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 3/4');
  await info.attach(`${only}-only-before-retrace`, { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  const recovery = only === 'M'
    ? [DOWN_FINAL[0], walk(2720), walk(2820), jump(2850, 140), { kind: 'finish' as const }]
    : [...DOWN_FINAL, ...UP_DESCENT, drop(800, 1, 850, 380), walk(1720), ...CROSS_DESCENT.slice(2), ...FINAL_CLIMB, { kind: 'finish' as const }];
  const returned = await driveSunset(page, recovery);
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 4/4');
  await info.attach(`${only}-only-after-retrace`, { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  await info.attach(`${only}-only-input-provenance`, { body: JSON.stringify({ source: process.env.BROWSER_REPORT_SOURCE_SHA,
    browser: browser.browserType().name(), version: browser.version(), outward, returned }), contentType: 'application/json' });
});

test('Sunset optional crane boards, carries and disembarks by walking in both directions', async ({ page, browser }, info) => {
  test.setTimeout(60_000);
  // Observe the shipped carriage top, never scene state or a synthetic platform.
  await page.addInitScript(() => {
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (this.canvas.id === 'game' && height === 3) {
        if (width === 96) this.canvas.dataset.craneScreenX = String(x);
        if (width === 210) this.canvas.dataset.nearDockScreenX = String(x + width);
        if (width === 150) this.canvas.dataset.farDockScreenX = String(x - 96);
      }
      fill.call(this, x, y, width, height);
    };
  });
  await startSunsetPilot(page);
  await driveSunset(page, [...FIRST_CLIMB, walk(440)]);
  await info.attach('near-dock-and-lower-catch', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  const dockDelta = (dock: 'near' | 'far') => page.locator('#game').evaluate((canvas, side) => {
    const sample = (canvas as HTMLCanvasElement).dataset;
    return Number(sample.craneScreenX) - Number(side === 'near' ? sample.nearDockScreenX : sample.farDockScreenX);
  }, dock);
  await expect.poll(async () => dockDelta('near'), { timeout: 8000, intervals: [16] }).toBeGreaterThan(4);
  await expect.poll(async () => dockDelta('near'), { timeout: 8000, intervals: [16] }).toBeCloseTo(0, 0);
  await driveSunset(page, [walk(520)]);
  await expect(page.locator('#status')).toContainText('Y 286');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]), { timeout: 5000 }).toBeGreaterThanOrEqual(600);
  await driveSunset(page, [walk(700), walk(760), walk(740)]);
  await expect(page.locator('#status')).toContainText('Y 286');
  await info.attach('far-fixed-dock-A', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  // Compare carriage and fixed dock from the same complete render. A real
  // overshoot and reverse above deliberately leaves Henry inside the dead zone.
  await info.attach('far-dock-coordinate-diagnostic', { body: JSON.stringify(await page.locator('#game').evaluate(canvas => ({
    cachedFarX: 694 - Number(document.querySelector('#status')!.textContent!.match(/X (\d+)/)?.[1]),
    frameDock: (canvas as HTMLCanvasElement).dataset.farDockScreenX,
    frameCarriage: (canvas as HTMLCanvasElement).dataset.craneScreenX,
    status: document.querySelector('#status')!.textContent,
  }))), contentType: 'application/json' });
  await expect.poll(async () => dockDelta('far'), { timeout: 8000, intervals: [16] }).toBeLessThan(-4);
  await expect.poll(async () => dockDelta('far'), { timeout: 8000, intervals: [16] }).toBeCloseTo(0, 0);
  await driveSunset(page, [walk(620)]);
  await expect(page.locator('#status')).toContainText('Y 286');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]), { timeout: 5000 }).toBeLessThanOrEqual(540);
  await driveSunset(page, [walk(440)]);
  await expect(page.locator('#status')).toContainText('Y 286');
  await info.attach('returned-near-dock', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  // Observe the actual far fixed dock in the current camera frame before
  // walking off the absent near edge.
  await expect.poll(async () => dockDelta('far'), { timeout: 8000, intervals: [16] }).toBeCloseTo(0, 0);
  await driveSunset(page, [drop(470, 1, 520, 380)]);
  await expect(page.locator('#status')).toContainText('Y 346');
  await info.attach('absent-carriage-catch', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  await driveSunset(page, [walk(440), jump(440, 320)]);
  await expect(page.locator('#status')).toContainText('Y 286');
  await info.attach('fixed-return-from-catch', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  await info.attach('crane-input-provenance', { body: JSON.stringify({ source: process.env.BROWSER_REPORT_SOURCE_SHA,
    browser: browser.browserType().name(), version: browser.version(), route: 'entrance, near fixed dock, observed carriage, far fixed dock, observed return carriage, near fixed dock; keyboard only' }), contentType: 'application/json' });
});

test('Sunset held-right cannot bypass the first tower and recovers to its local entrance', async ({ page, browser }, info) => {
  test.setTimeout(60_000);
  await startSunsetPilot(page);
  await page.evaluate(() => {
    const proof = { previous: 60, recoveries: 0, maximumX: 60, samples: [] as string[] };
    Object.assign(window, { sunsetBypassProof: proof });
    const sample = () => {
      const status = document.querySelector('#status')!.textContent!;
      const x = Number(status.match(/X (\d+)/)?.[1]);
      if (proof.previous - x > 200) { proof.recoveries++; proof.samples.push(status); }
      proof.maximumX = Math.max(proof.maximumX, x); proof.previous = x;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => (window as unknown as { sunsetBypassProof: { maximumX: number } }).sunsetBypassProof.maximumX >= 900, undefined, { timeout: 10_000 });
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#status')).toContainText('V 0');
  await info.attach('corrected-lower-island-lip', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => (window as unknown as { sunsetBypassProof: { recoveries: number } }).sunsetBypassProof.recoveries >= 2, undefined, { timeout: 20_000 });
  await page.keyboard.up('ArrowRight');
  const proof = await page.evaluate(() => (window as unknown as { sunsetBypassProof: { maximumX: number; samples: string[] } }).sunsetBypassProof);
  expect(proof.maximumX).toBeLessThan(1200);
  await expect(page.getByRole('button', { name: 'Build your word', exact: true })).toHaveCount(0);
  // A real recovery permits the ordinary first climb; no checkpoint lock exists.
  await driveSunset(page, [walk(210), ...FIRST_CLIMB.slice(1)]);
  await info.attach('held-right-local-recovery', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  await info.attach('negative-input-provenance', { body: JSON.stringify({ source: process.env.BROWSER_REPORT_SOURCE_SHA,
    browser: browser.browserType().name(), version: browser.version(), viewport: { width: 426, height: 300 }, proof,
    route: 'real entrance, held-right without jump until two observed recoveries, then ordinary first climb' }), contentType: 'application/json' });
});
