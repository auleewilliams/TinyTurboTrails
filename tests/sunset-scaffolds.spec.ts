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
    const crossing = await driveSunset(page, CROSS_DESCENT);
    await info.attach('lower-yard', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    const final = await driveSunset(page, FINAL_CLIMB);
    await expect(page.locator('#status')).toContainText('Letter bag: 0/4');
    await info.attach('highest-roof', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    await driveSunset(page, [{ kind: 'finish' }]);
    await page.getByRole('button', { name: 'Build your word', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Bag 0/4');
    expect(errors).toEqual([]);
    await info.attach('input-provenance', { body: JSON.stringify({ source: process.env.BROWSER_REPORT_SOURCE_SHA,
      browser: browser.browserType().name(), version: browser.version(), viewport, nativeCanvas: { width: 426, height: 240 }, first, crossing, final }), contentType: 'application/json' });
  });
}

test('Sunset actual finish retrace recovers all missed BEAM, reactivates checkpoints and returns', async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await startSunsetPilot(page);
  const outward = await driveSunset(page, MAIN_ROUTE);
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 0/4');
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  await expect(page.locator('#status')).toContainText('X 2210 Y 106 V 0');
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
const collectE = [...CROSS_DESCENT.slice(0, 4), walk(1120), ...CROSS_DESCENT.slice(4)];
const collectA = [walk(740), jump(740, 320), walk(740), drop(800, 1, 850, 380)];
const collectM = [...FINAL_CLIMB.slice(0, -1), walk(2000), walk(2100), FINAL_CLIMB.at(-1)!];
for (const only of ['M', 'A']) test(`Sunset only missed ${only} uses native retrace and returns to word flow`, async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await startSunsetPilot(page);
  const route = only === 'M'
    ? [...collectB, CROSS_DESCENT[0], ...collectA, ...collectE.slice(1), ...FINAL_CLIMB, { kind: 'finish' as const }]
    : [...collectB, ...collectE, ...collectM, { kind: 'finish' as const }];
  const outward = await driveSunset(page, route);
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 3/4');
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  const recovery = only === 'M'
    ? [DOWN_FINAL[0], walk(2000), walk(2100), jump(2130, 140), { kind: 'finish' as const }]
    : [...DOWN_FINAL, ...UP_DESCENT, drop(800, 1, 850, 380), walk(1000), ...CROSS_DESCENT.slice(2), ...FINAL_CLIMB, { kind: 'finish' as const }];
  const returned = await driveSunset(page, recovery);
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 4/4');
  await info.attach(`${only}-only-input-provenance`, { body: JSON.stringify({ source: process.env.BROWSER_REPORT_SOURCE_SHA,
    browser: browser.browserType().name(), version: browser.version(), outward, returned }), contentType: 'application/json' });
});

test('Sunset optional crane boards, carries and disembarks by walking in both directions', async ({ page, browser }, info) => {
  test.setTimeout(60_000);
  // Observe the shipped carriage top, never scene state or a synthetic platform.
  await page.addInitScript(() => {
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (this.canvas.id === 'game' && width === 96 && height === 3) this.canvas.dataset.craneScreenX = String(x);
      fill.call(this, x, y, width, height);
    };
  });
  await startSunsetPilot(page);
  await driveSunset(page, [...FIRST_CLIMB, walk(440)]);
  await info.attach('near-dock-and-lower-catch', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  const nearX = 610 - Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]);
  await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-crane-screen-x')), { timeout: 8000, intervals: [16] }).toBeGreaterThan(nearX + 4);
  await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-crane-screen-x')), { timeout: 8000, intervals: [16] }).toBeCloseTo(nearX, 0);
  await driveSunset(page, [walk(520)]);
  await expect(page.locator('#status')).toContainText('Y 286');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]), { timeout: 5000 }).toBeGreaterThanOrEqual(600);
  await driveSunset(page, [walk(700), walk(740)]);
  await expect(page.locator('#status')).toContainText('Y 286');
  await info.attach('far-fixed-dock-A', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  // Match the observed rounded player origin; the native camera's right dead zone is 140.
  const farX = 694 - Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]);
  await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-crane-screen-x')), { timeout: 8000, intervals: [16] }).toBeLessThan(farX - 4);
  await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-crane-screen-x')), { timeout: 8000, intervals: [16] }).toBeCloseTo(farX, 0);
  await driveSunset(page, [walk(620)]);
  await expect(page.locator('#status')).toContainText('Y 286');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]), { timeout: 5000 }).toBeLessThanOrEqual(540);
  await driveSunset(page, [walk(440)]);
  await expect(page.locator('#status')).toContainText('Y 286');
  await info.attach('returned-near-dock', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  await info.attach('crane-input-provenance', { body: JSON.stringify({ source: process.env.BROWSER_REPORT_SOURCE_SHA,
    browser: browser.browserType().name(), version: browser.version(), route: 'entrance, near fixed dock, observed carriage, far fixed dock, observed return carriage, near fixed dock; keyboard only' }), contentType: 'application/json' });
});
