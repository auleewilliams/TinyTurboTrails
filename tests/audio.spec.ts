import { expect, test } from '@playwright/test';

test('audio stays locked until interaction and supports all effects, mute, pause and stop', async ({ page }) => {
  // Probe the native device separately: some headless hosts cannot run an audio clock.
  await page.setContent('<button>Check audio device</button>');
  await page.evaluate(() => {
    document.querySelector('button')!.onclick = () => {
      try {
        const audio = new AudioContext();
        Object.assign(window, { nativeAudioProbe: audio });
        void audio.resume().catch(() => {});
      } catch { /* Some ports expose no native audio backend. */ }
    };
  });
  await page.getByRole('button').click();
  const deviceRuns = await page.waitForFunction(() =>
    (window as unknown as { nativeAudioProbe?: AudioContext }).nativeAudioProbe?.state === 'running',
  undefined, { timeout: 1500 }).then(() => true, () => false);
  await page.evaluate(() => {
    void (window as unknown as { nativeAudioProbe?: AudioContext }).nativeAudioProbe?.close();
  });
  test.skip(!deviceRuns, 'Native AudioContext cannot run on this host; requires an audio backend.');
  await page.addInitScript(() => {
    const state = { contexts: [] as AudioContext[], starts: 0 };
    Object.assign(window, { audioProbe: state });
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) { super(options); state.contexts.push(this); }
      override createOscillator(): OscillatorNode {
        const node = super.createOscillator();
        const start = node.start.bind(node);
        node.start = (when?: number) => { state.starts++; start(when); };
        return node;
      }
    };
  });
  const read = () => page.evaluate(() => {
    const state = (window as unknown as { audioProbe: { contexts: AudioContext[]; starts: number } }).audioProbe;
    return { count: state.contexts.length, starts: state.starts, state: state.contexts[0]?.state };
  });
  await page.goto('/?audio');
  expect((await read()).count).toBe(0);
  await page.getByRole('button', { name: 'Start music', exact: true }).click();
  await expect.poll(async () => (await read()).state).toBe('running');
  await expect.poll(async () => (await read()).starts).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Stop audio', exact: true }).click();
  for (const effect of ['jump', 'gem', 'spring', 'damage', 'checkpoint', 'complete']) {
    const before = (await read()).starts;
    await page.getByRole('button', { name: effect, exact: true }).click();
    await expect.poll(async () => (await read()).starts).toBeGreaterThan(before);
  }
  await page.keyboard.press('m');
  await expect(page.locator('#status')).toContainText('Muted');
  const muted = (await read()).starts;
  await page.getByRole('button', { name: 'gem', exact: true }).click();
  expect((await read()).starts).toBe(muted);
  await page.keyboard.press('m');
  await page.getByRole('button', { name: 'Start music', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await read()).state).toBe('suspended');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await read()).state).toBe('running');
  await page.getByRole('button', { name: 'Stop audio', exact: true }).click();
  const stopped = (await read()).starts;
  await page.waitForTimeout(400);
  expect((await read()).starts).toBe(stopped);
  expect((await read()).count).toBe(1);
});


test('game remains interactive when Web Audio is unavailable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw Error('Unavailable'); } } });
  });
  await page.goto('/?audio');
  await page.getByRole('button', { name: 'Start music', exact: true }).click();
  await page.getByRole('button', { name: 'gem', exact: true }).click();
  await page.keyboard.press('m');
  await expect(page.locator('#status')).toContainText('Muted');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Paused');
  expect(errors).toEqual([]);
});
