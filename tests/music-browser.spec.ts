import { expect, test } from '@playwright/test';
import { MUSIC, type MusicId } from '../src/core/music';

// Deterministic browser integration complements the native device test in audio.spec.ts.
test('preview switches all tracks and adventure selects music only after starting a level', async ({ page }) => {
  await page.addInitScript(() => {
    const probe = { pitches: [] as number[], active: 0, stopped: 0 };
    Object.assign(window, { musicProbe: probe });
    class Param { value = 0; setValueAtTime(v: number) { this.value = v; }
      linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} }
    class FakeContext {
      state = 'suspended'; destination = {};
      get currentTime() { return performance.now() / 1000; }
      async resume() { this.state = 'running'; }
      async suspend() { this.state = 'suspended'; }
      async close() { this.state = 'closed'; }
      createGain() { return { gain: new Param(), connect() {}, disconnect() {} }; }
      createOscillator() {
        let active = false;
        return { frequency: new Param(), type: '', onended: null, connect() {}, disconnect() {},
          start() { active = true; probe.active++; probe.pitches.push(this.frequency.value); },
          stop(time?: number) { if (time === undefined && active) { active = false; probe.active--; probe.stopped++; } } };
      }
    }
    Object.assign(window, { AudioContext: FakeContext });
  });
  const read = () => page.evaluate(() => (window as unknown as {
    musicProbe: { pitches: number[]; active: number; stopped: number };
  }).musicProbe);
  await page.goto('/?audio');
  // A first gesture must play an effect after unlock resolves.
  await page.getByRole('button', { name: 'gem', exact: true }).click();
  await expect.poll(async () => (await read()).pitches.length).toBe(2);
  for (const id of Object.keys(MUSIC) as MusicId[]) {
    await page.getByLabel('Level soundtrack').selectOption(id);
    await page.getByRole('button', { name: 'Start music', exact: true }).click();
    const state = await read();
    expect(state.pitches.slice(-2)[0]).toBeCloseTo(440 * 2 ** ((MUSIC[id].phrases[0][0] - 69) / 12));
    expect(state.active).toBe(2);
  }
  await page.getByRole('button', { name: 'Stop audio', exact: true }).click();
  expect((await read()).active).toBe(0);
  await page.goto('/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Title');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(100); // Selection is sampled on animation frames.
  await page.keyboard.up('ArrowRight');
  expect((await read()).active).toBe(0);
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Playing');
  await expect.poll(async () => (await read()).pitches[0]).toBeCloseTo(440 * 2 ** ((62 - 69) / 12));
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await read()).active).toBe(0);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await read()).active).toBeGreaterThan(0);
});
