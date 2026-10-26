import { expect, test } from '@playwright/test';

import { installTimberKeyboardPilot, runTimberStages, TIMBER_ASCENT_RIGHT,
  TIMBER_DESCENT_ALL, TIMBER_REASCENT, TIMBER_ONLY_E2_ASCENT,
  TIMBER_LEFT_STARS_ASCENT, TIMBER_TO_MIDDLE, TIMBER_SPRING_RETRY,
  type TimberPilotStage } from './timbers-browser-pilot';

for (const viewport of [{ width: 426, height: 300 }, { width: 320, height: 240 }, { width: 1366, height: 768 }]) {
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
  await info.attach('initial-ascent-input', { body: JSON.stringify({ browser: browser.browserType().name(),
    version: browser.version(), viewport: { width: 426, height: 300 }, ascent }), contentType: 'application/json' });
  await expect(page.locator('#status')).toContainText('Finish');
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 0/4');
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Playing · Letter bag: 0/4');
  await expect(page.locator('#status')).toContainText('X 440 Y 146 V 0');
  expect(await runTimberStages(page, TIMBER_DESCENT_ALL.slice(0, 2))).toMatchObject({ done: true, error: '' });
  await info.attach('lookout-downward-target', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  expect(await runTimberStages(page, TIMBER_DESCENT_ALL.slice(2, 8))).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Y 386');
  await info.attach('canopy-downward-target', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  expect(await runTimberStages(page, TIMBER_DESCENT_ALL.slice(8, 14))).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Y 626');
  await info.attach('middle-downward-target', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  const descent = await runTimberStages(page, TIMBER_DESCENT_ALL.slice(14));
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

test('Timbers left fork visits both outer stars and returns to the lookout by input', async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await installTimberKeyboardPilot(page);
  await page.setViewportSize({ width: 426, height: 300 });
  await page.goto('/?scene=adventure&debug=1');
  await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  const lowStar = await runTimberStages(page, TIMBER_LEFT_STARS_ASCENT.slice(0, 5));
  expect(lowStar).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Y 926');
  await info.attach('low-star-and-return', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  const leftFork = await runTimberStages(page, TIMBER_LEFT_STARS_ASCENT.slice(5, 15));
  expect(leftFork).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Y 626');
  await info.attach('left-fork-rejoined', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  const upperStar = await runTimberStages(page, TIMBER_LEFT_STARS_ASCENT.slice(15, 25));
  expect(upperStar).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Y 266');
  await info.attach('upper-star-and-local-catch', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  const finish = await runTimberStages(page, TIMBER_LEFT_STARS_ASCENT.slice(25));
  expect(finish).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Finish');
  await info.attach('left-fork-input-route', { body: JSON.stringify({ browser: browser.browserType().name(),
    version: browser.version(), lowStar, leftFork, upperStar, finish }), contentType: 'application/json' });
});

test('Timbers optional spring reaches Star 2 and permits a safe repeat approach', async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await installTimberKeyboardPilot(page);
  await page.setViewportSize({ width: 426, height: 300 });
  await page.goto('/?scene=adventure&debug=1');
  await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  expect(await runTimberStages(page, TIMBER_TO_MIDDLE)).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Y 626');
  const firstFlight = await runTimberStages(page, TIMBER_SPRING_RETRY.slice(0, 2));
  expect(firstFlight).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Y 476');
  await info.attach('spring-reward-landing', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  expect(await runTimberStages(page, TIMBER_SPRING_RETRY.slice(2, 4))).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Y 506');
  await page.evaluate(async () => { for (let frame = 0; frame < 24; frame++) {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  } });
  await expect(page.locator('#status')).toContainText('Y 506');
  await info.attach('spring-clear-catch', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  const repeatFlight = await runTimberStages(page, TIMBER_SPRING_RETRY.slice(4));
  expect(repeatFlight).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Y 476');
  await info.attach('spring-repeat-input', { body: JSON.stringify({ browser: browser.browserType().name(),
    version: browser.version(), firstFlight, repeatFlight }), contentType: 'application/json' });
});
