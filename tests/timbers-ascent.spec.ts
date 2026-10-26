import { expect, test } from '@playwright/test';

import { installTimberKeyboardPilot, runTimberStages, TIMBER_ASCENT_RIGHT,
  TIMBER_DESCENT_ALL, TIMBER_REASCENT, TIMBER_ONLY_E2_ASCENT,
  type TimberPilotStage } from './timbers-browser-pilot';

for (const viewport of [{ width: 426, height: 300 }, { width: 320, height: 240 }]) {
  test(`Timbers right fork input ascent frames roots, middle and summit at ${viewport.width}px`, async ({ page, browser }, info) => {
    test.setTimeout(60_000);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await installTimberKeyboardPilot(page);
    await page.setViewportSize(viewport);
    await page.goto('/?scene=adventure&debug=1');
    await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
    await info.attach('map-preview', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
    await expect(page.locator('#status')).toContainText('X 100 Y 1046');
    await info.attach('roots', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { active: boolean; pauseAt: number } }).timberKeyboardPilot.active = true;
      (window as unknown as { timberKeyboardPilot: { pauseAt: number } }).timberKeyboardPilot.pauseAt = 10; });
    await expect.poll(() => page.evaluate(() => {
      const p = (window as unknown as { timberKeyboardPilot: { paused: boolean; error: string } }).timberKeyboardPilot;
      return p.error || (p.paused ? 'middle' : '');
    }), { timeout: 30_000 }).toBe('middle');
    await expect(page.locator('#status')).toContainText('Y 626');
    await info.attach('middle', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    await page.evaluate(() => { const p = (window as unknown as { timberKeyboardPilot: { paused: boolean; pauseAt: number } }).timberKeyboardPilot;
      p.pauseAt = 20; p.paused = false; });
    await expect.poll(() => page.evaluate(() => {
      const p = (window as unknown as { timberKeyboardPilot: { paused: boolean; error: string } }).timberKeyboardPilot;
      return p.error || (p.paused ? 'summit' : '');
    }), { timeout: 30_000 }).toBe('summit');
    await expect(page.locator('#status')).toContainText('Y 146');
    await info.attach('summit', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
    await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { paused: boolean } }).timberKeyboardPilot.paused = false; });
    await expect.poll(() => page.evaluate(() => {
      const p = (window as unknown as { timberKeyboardPilot: { done: boolean; error: string } }).timberKeyboardPilot;
      return p.error || (p.done ? 'finish' : '');
    }), { timeout: 20_000 }).toBe('finish');
    await expect(page.locator('#status')).toContainText('Finish');
    expect(errors).toEqual([]);
    const pilot = await page.evaluate(() => (window as unknown as { timberKeyboardPilot: object }).timberKeyboardPilot);
    await info.attach('input-route', { body: JSON.stringify({ pilot, browser: browser.browserType().name(), version: browser.version(), viewport }), contentType: 'application/json' });
    if (viewport.width === 426) {
      await page.getByRole('button', { name: 'Replay', exact: true }).click();
      await expect(page.locator('#status')).toContainText('X 100 Y 1046 V 0');
      expect(await runTimberStages(page, TIMBER_ASCENT_RIGHT)).toMatchObject({ done: true, error: '' });
      await page.getByRole('button', { name: 'Next trail', exact: true }).click();
      await expect(page.locator('#status')).toContainText('Playing');
      await expect(page.locator('#status')).toContainText('X 60');
    }
  });
}

test('Timbers input return recovers all missed TREE tiles and revisits the finish', async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await installTimberKeyboardPilot(page);
  await page.setViewportSize({ width: 426, height: 300 });
  await page.goto('/?scene=adventure&debug=1');
  await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  const ascent = await runTimberStages(page, TIMBER_ASCENT_RIGHT);
  expect(ascent, JSON.stringify(ascent)).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Finish');
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 0/4');
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Playing · Letter bag: 0/4');
  await expect(page.locator('#status')).toContainText('X 440 Y 146 V 0');
  const descent = await runTimberStages(page, TIMBER_DESCENT_ALL);
  expect(descent).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
  await info.attach('return-at-roots', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  await page.setViewportSize({ width: 320, height: 240 });
  await info.attach('return-small', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  expect(await runTimberStages(page, TIMBER_REASCENT)).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Finish');
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 4/4');
  for (const [index, label] of ['T', 'R', 'E 1', 'E 2'].entries()) {
    await page.getByRole('button', { name: `Letter ${label}`, exact: true }).click();
    await page.getByRole('button', { name: `Space ${index + 1}: empty`, exact: true }).click();
  }
  await expect(page.locator('#status')).toContainText('Tree sticker earned!');
  await info.attach('all-letters-journey', { body: JSON.stringify({ browser: browser.browserType().name(),
    version: browser.version(), ascent: 'input', descent, reascended: true }), contentType: 'application/json' });
});

test('Timbers only missed summit E returns to word flow without reopening immediately', async ({ page, browser }, info) => {
  test.setTimeout(90_000);
  await installTimberKeyboardPilot(page);
  await page.goto('/?scene=adventure&debug=1');
  await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  const ascent = await runTimberStages(page, TIMBER_ONLY_E2_ASCENT);
  expect(ascent, JSON.stringify(ascent)).toMatchObject({ done: true, error: '' });
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 3/4');
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  const onlyE2: TimberPilotStage[] = [
    { kind: 'walk', x: 350 }, { kind: 'walk', x: 290 }, { kind: 'finish' },
  ];
  const returnResult = await runTimberStages(page, onlyE2);
  expect(returnResult, JSON.stringify(returnResult)).toMatchObject({ done: true, error: '' });
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 4/4');
  await info.attach('summit-E-only', { body: JSON.stringify({ browser: browser.browserType().name(),
    version: browser.version(), route: 'input from roots and same-run return' }), contentType: 'application/json' });
});
