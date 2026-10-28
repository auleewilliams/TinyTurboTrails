import { installCovePilot, driveCove } from './cove-browser-pilot';
import { COVE_RETURN, COVE_LOWER, walk as coveWalk, jump as coveJump } from './cove-pilot';
import { FROST_MAIN, FROST_RETURN, FROST_REASCENT, FROST_MISS_S } from './frost-pilot';
import { driveSunset } from './sunset-browser-pilot';
import { MAIN_ROUTE as SUNSET_MAIN, FIRST_CLIMB as SUNSET_FIRST, CROSS_DESCENT as SUNSET_CROSS, FINAL_CLIMB as SUNSET_FINAL, ALL_RETURN as SUNSET_RETURN, REASCENT as SUNSET_REASCENT, SUNSET_MISS_B } from './sunset-pilot';
import { installQuarryPilotScript } from './quarry-pilot';
import { QUARRY_DESCENT, QUARRY_RETURN, QUARRY_STARS, type QuarryWaypoint } from './quarry-route';
import { installPlainsRewardPilot } from './plains-pilot';
import { installTimberKeyboardPilot, runTimberStages, TIMBER_ONLY_E2_ASCENT } from './timbers-browser-pilot';
import { drawTerrainMaterial, drawTerrainEdge, drawTrailBackdrop } from '../src/world/trail-presentation';
import { installRetracePilotScript } from './retrace-pilot';
import { observedDamage, sustainedControllerMovement, type ActuatorCall, type HealthObservation } from './rumble-observation';
import { drawAmbientWeather } from '../src/world/ambient-weather';
import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { transformSync } from 'rolldown/utils';
import type { EducationOverlay } from '../src/game/education-overlay';
import { PLAINS_LEVEL, hasFixedSupport } from '../src/world/level';
import { LEVELS, QUARRY_RUN } from '../src/world/levels';
import { DEFAULT_MOVEMENT, surfaceY } from '../src/game/movement';
import { platformBodyAt } from '../src/game/platforms';
import { coveGroundY, coveRepeatColumn, validateCoveTerrain, loadCoveTerrain, drawCoveGround, drawCovePlatform } from '../src/world/cove-terrain';
import { validateCoveMaterials, loadCoveMaterials, coveRipplePhase, drawCoveMaterials, drawSurfaceMaterials } from '../src/world/surface-materials';
import { drawSlime, drawGem, drawSpecial, drawLandingBands, drawAsset, drawSurfaceGrip, drawCrumblingLedge, drawPlatformPath, drawPlatforms, drawTerrainTiles, drawTimberTrunk, drawSiteFrame, drawWorld } from '../src/world/renderer';
import { TRAIL_WORDS } from '../src/game/education';
import { MAX_HEALTH, createRun } from '../src/game/interactions';
import { HUD_COLORS, TRAIL_RIBBON, trailPosition, RIBBON_INTRO, areaName } from '../src/game/hud';
import { INTERFACE_PIECES } from '../src/art/interface-kit';
import { PAUSE_PANEL } from '../src/game/pause-menu';

const VIEWPORT_CASES = [
  { width: 2048, height: 1178 }, { width: 1366, height: 768 },
  { width: 1280, height: 720 }, { width: 1024, height: 768 },
  { width: 2560, height: 1080 }, { width: 852, height: 480 },
  { width: 2040, height: 1080 },
  { width: 426, height: 240 }, { width: 320, height: 240 }, { width: 390, height: 844 },
];

async function expectClearViewport(page: Page): Promise<void> {
  const geometry = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
    const game = canvas.getBoundingClientRect();
    const controls = document.querySelector('.feedback-controls')!.getBoundingClientRect();
    const main = document.querySelector('main')!;
    const targets = Array.from(document.querySelectorAll<HTMLButtonElement>('.trail-menu button')).map(button => {
      const bounds = button.getBoundingClientRect();
      return { inside: bounds.left >= game.left - 0.1 && bounds.top >= game.top - 0.1
        && bounds.right <= game.right + 0.1 && bounds.bottom <= game.bottom + 0.1,
      clickable: document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2) === button };
    });
    return { width: game.width, height: game.height, left: game.left, top: game.top,
      right: game.right, bottom: game.bottom, viewportWidth: main.clientWidth, viewportHeight: main.clientHeight,
      clear: controls.left >= game.right || controls.top >= game.bottom,
      fullFit: Math.abs(game.width - main.clientWidth) < 0.1 || Math.abs(game.height - main.clientHeight) < 0.1,
      railFit: Math.abs(game.height + controls.height + 8 - main.clientHeight) < 0.1,
      sideFit: Math.abs(game.width + controls.width + 16 - main.clientWidth) < 0.1,
      overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
      logicalWidth: canvas.width, logicalHeight: canvas.height, targets };
  });
  expect(geometry.logicalWidth).toBe(426);
  expect(geometry.logicalHeight).toBe(240);
  expect(geometry.width / geometry.height).toBeCloseTo(426 / 240, 3);
  expect(geometry.left).toBeGreaterThanOrEqual(-0.1);
  expect(geometry.top).toBeGreaterThanOrEqual(-0.1);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 0.1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 0.1);
  expect(geometry.clear).toBe(true);
  expect(geometry.fullFit || geometry.railFit || geometry.sideFit).toBe(true);
  expect(geometry.overflow).toBe(false);
  for (const target of geometry.targets) expect(target).toEqual({ inside: true, clickable: true });
  if (await page.getByRole('button', { name: 'Resume', exact: true }).count()) {
    await expect(page.getByRole('button', { name: 'Sound', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Controller rumble', exact: true })).toBeInViewport();
  } else await expect(page.locator('#pause')).toBeInViewport();
}

test('uniform viewport fit keeps map, gameplay, pause and finish clear after resizing', async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await installTrailPilot(page);
  await page.goto('/?debug=1');
  await expect(page.locator('#status')).toContainText('Title');
  const capture = async (state: string): Promise<void> => {
    for (const viewport of VIEWPORT_CASES) {
      await page.setViewportSize(viewport);
      await expect.poll(async () => (await page.locator('main').boundingBox())?.height).toBe(viewport.height);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expectClearViewport(page);
      if (state === 'map') await info.attach(`viewport-${viewport.width}x${viewport.height}`, {
        body: JSON.stringify(await page.evaluate(() => ({ width: innerWidth, height: innerHeight,
          devicePixelRatio, fullscreen: Boolean(document.fullscreenElement),
          canvas: document.querySelector('canvas')!.getBoundingClientRect().toJSON() }))),
        contentType: 'application/json',
      });
      // Full-window evidence records dimensions and the rendered DOM/canvas together.
      await info.attach(`${state}-${viewport.width}x${viewport.height}`, {
        body: await page.screenshot({ path: info.outputPath(`${state}-${viewport.width}x${viewport.height}.png`) }),
        contentType: 'image/png',
      });
    }
  };
  await capture('map');
  await page.getByRole('button', { name: 'QUARRY RUN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play QUARRY RUN', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'PLAINS', exact: true }).click();
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  await capture('gameplay');
  // Focused settings must not send Space through to jump or menu confirmation.
  const standingY = (await page.locator('#status').innerText()).match(/Y \d+/)![0];
  await page.locator('#pause').click();
  await page.getByRole('button', { name: 'Sound', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Sound', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Controller rumble', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('#status')).toContainText(standingY);
  await page.locator('#pause').click();
  await capture('pause');
  await page.keyboard.press('t');
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeVisible();
  await expectClearViewport(page);
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  // Reach finish using the existing input-only controller pilot, not a scene hook.
  await acknowledgeTrailNeutral(page);
  await page.evaluate(dangers => {
    Object.assign((window as unknown as { trailPilot: object }).trailPilot, { active: true, controller: true, dangers });
  }, dangerXs(PLAINS_LEVEL));
  try {
    await expect(page.locator('#status')).toContainText('Finish', { timeout: 35_000 });
  } finally {
    await writeFile(info.outputPath('trail-pilot-input.jsonl'), await page.evaluate(() =>
      (window as unknown as { trailPilot: { inputEvents: object[] } }).trailPilot.inputEvents.map(event => JSON.stringify(event)).join('\n') + '\n'));
  }
  await expectResultsFirst(page);
  await capture('finish');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play PLAINS', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('app fullscreen retains feedback controls and native map and pause targets', async ({ page }, info) => {
  await installTrailPilot(page);
  await openAdventure(page, '/');
  test.skip(!await page.evaluate(() => document.fullscreenEnabled), 'Fullscreen unavailable in this browser environment');
  await page.locator('#pause').evaluate(button => {
    button.addEventListener('click', () => { void document.querySelector('main')!.requestFullscreen(); }, { once: true });
  });
  await page.locator('#pause').click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe('MAIN');
  // Fullscreen element changes precede Firefox viewport/overlay layout settlement.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expectClearViewport(page);
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  // Escape belongs to browser fullscreen exit on WebKit. Use controller Start to pause.
  await acknowledgeTrailNeutral(page);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[9].pressed = true; });
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[9].pressed = false; });
  await expectClearViewport(page);
  await info.attach('fullscreen-pause', { body: await page.screenshot(), contentType: 'image/png' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expectClearViewport(page);
});

/** The renderer is injected as plain functions, so every helper it calls has to travel with it. */
const RENDERER_SOURCE = [validateCoveMaterials, loadCoveMaterials, coveRipplePhase, drawCoveMaterials, coveGroundY, coveRepeatColumn, validateCoveTerrain, loadCoveTerrain, drawCoveGround, drawCovePlatform, drawAmbientWeather, drawSlime, drawGem, drawSpecial, drawLandingBands, drawTerrainMaterial, drawTerrainEdge, drawTrailBackdrop, drawAsset, drawSurfaceGrip, drawCrumblingLedge, drawPlatformPath, drawPlatforms, drawTerrainTiles, drawTimberTrunk, drawSiteFrame, drawSurfaceMaterials].map((helper) => helper.toString()).join('\n');

test('ambient weather repeats the same pixels, respects reduced motion and stays behind terrain', async ({ page }, info) => {
  // Six full-image comparisons need extra readback time on constrained WebKit hosts.
  test.setTimeout(120_000);
  await page.goto('/?scene=foundation');
  await page.addScriptTag({ content: `${RENDERER_SOURCE}\nwindow.drawWeatherTestWorld = ${drawWorld.toString()};` });
  for (const level of LEVELS) {
    const result = await page.evaluate(async (level) => {
      const manifest = await (await fetch(`/assets/${level.atlas}/manifest.json`)).json();
      const load = async (url: string) => { const image = new Image(); image.src = url; await image.decode(); return image; };
      const [atlas, gems, materials, backdrops, slimes, panorama] = await Promise.all([
        load(`/assets/${level.atlas}/${manifest.image}`), load('/assets/gems/gems.png'),
        load('/assets/trails/materials.png'), load('/assets/trails/backdrops.webp'), load('/assets/slimes/slimes.png'),
        manifest.panorama ? load(`/assets/${level.atlas}/${manifest.panorama}`) : undefined,
      ]);
      // Scenery has its own established tests; this isolates the weather field.
      // Isolate weather from trail-specific scenery, including Timbers' trunk.
      const base = { ...level, id: 'weather-fixture', theme: { ...level.theme, scenery: false, parallax: [] } };
      const coveTerrain = await (window as unknown as { loadCoveTerrain: typeof loadCoveTerrain }).loadCoveTerrain(`/assets/${level.atlas}/`, manifest.terrainKit);
      const coveMaterials = await (window as unknown as { loadCoveMaterials: typeof loadCoveMaterials }).loadCoveMaterials(`/assets/${level.atlas}/`, manifest.surfaceKit);
      const assets = { atlas, manifest, gems, materials, backdrops, slimes, panorama, coveTerrain, coveMaterials };
      const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
      const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
      const camera = { position: { x: Math.min(1400.25, level.maxX - 426), y: level.progressAxis === 'y' ? level.height - 240 : 0 } } as Parameters<typeof drawWorld>[3];
      const render = (window as unknown as { drawWeatherTestWorld: typeof drawWorld }).drawWeatherTestWorld;
      const draw = (seconds: number, reduced = false, themed = base) => {
        render(ctx, assets, themed, camera, undefined, undefined, undefined, seconds, reduced);
        return canvas.toDataURL();
      };
      const first = draw(12.5);
      const pixels = ctx.getImageData(0, 0, 426, 240).data;
      const later = draw(13.5);
      const repeated = draw(12.5);
      const renamed = draw(12.5, false, { ...base, id: 'future-trail' });
      const reduced = draw(12.5, true);
      const clear = draw(12.5, false, { ...base, theme: { ...base.theme, weather: undefined } });
      const clearPixels = ctx.getImageData(0, 0, 426, 240).data;
      let differences = 0, protectedDifferences = 0;
      for (let x = 0; x < 426; x++) {
        const worldX = x + camera.position.x;
        const surface = level.surfaces.find(s => worldX >= s.x1 && worldX <= s.x2)!;
        const ground = surface.y1 + (surface.y2 - surface.y1) * (worldX - surface.x1) / (surface.x2 - surface.x1) - camera.position.y;
        for (let y = 0; y < 240; y++) {
          const index = (y * 426 + x) * 4;
          if (pixels[index] === clearPixels[index] && pixels[index + 1] === clearPixels[index + 1]
            && pixels[index + 2] === clearPixels[index + 2]) continue;
          differences++;
          if (y < 40 || y > ground + 8) protectedDifferences++;
        }
      }
      return { first, same: first === repeated, renamed: first === renamed, animated: first !== later,
        reduced: reduced === clear, differences, protectedDifferences };
    }, level);
    expect(result.same).toBe(true); expect(result.renamed).toBe(true); expect(result.reduced).toBe(true);
    expect(result.protectedDifferences).toBe(0);
    expect(result.differences).toBeLessThan(180);
    expect(result.animated).toBe(Boolean(level.theme.weather));
    if (level.theme.weather) expect(result.differences).toBeGreaterThan(0);
    else expect(result.differences).toBe(0);
    await info.attach(`${level.id}-weather-native`, { body: Buffer.from(result.first.split(',')[1], 'base64'), contentType: 'image/png' });
  }
});

test('controller damage rumble is independent of audio and stops on pause, focus loss and disconnect', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  type Sample = { time: number; x: number; y: number; velocity: number; axis: number; health: number | null; colors: number[][] };
  await page.setViewportSize({ width: 426, height: 300 });
  await page.addInitScript(() => {
    const probe = { polls: 0, neutralPoll: 0, latest: null as Sample | null, stable: null as Sample | null,
      drive: false, retreat: false, direction: 1, stopHealth: undefined as number | undefined, samples: [] as Sample[], events: [] as Record<string, unknown>[], effects: [] as { duration: number; strongMagnitude: number; weakMagnitude: number }[], resets: 0 };
    const pad = {
      connected: true, mapping: 'standard', index: 0, axes: [0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
      vibrationActuator: {
        playEffect(_type: string, parameters: typeof probe.effects[number]) { probe.effects.push(parameters); probe.events.push({ kind: 'effect', time: performance.now(), parameters }); return Promise.resolve('complete'); },
        reset() { probe.resets++; probe.events.push({ kind: 'reset', time: performance.now() }); return Promise.resolve('complete'); },
      },
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => {
      // Use Plains' existing orchard encounter, then retreat onto its flat
      // x1560–1620 rest. Sunset's approved scaffolds have no damaging actor.
      if (probe.drive && probe.latest) {
        if (probe.retreat && probe.latest.x <= 1600) {
          probe.drive = false; probe.retreat = false; pad.axes[0] = 0;
          probe.events.push({ kind: 'safe-stop', time: performance.now(), x: probe.latest.x });
        } else {
          if (probe.retreat || probe.latest.x >= 1820) probe.direction = -1;
          else if (probe.latest.x <= 1660) probe.direction = 1;
          pad.axes[0] = probe.direction;
        }
      }
      probe.polls++;
      if (pad.axes.every(value => value === 0) && pad.buttons.every(button => !button.pressed)) probe.neutralPoll = probe.polls;
      probe.events.push({ kind: 'poll', time: performance.now(), poll: probe.polls, axis: pad.axes[0], drive: probe.drive, status: document.querySelector('#status')?.textContent, focus: document.activeElement?.getAttribute('aria-label') });
      return [pad];
    } });
    // Read actual interior pixels after all three heart sample pixels are drawn.
    // Ignore every yellow-flash frame: a highlighted full pip after recovery must
    // never look like lost health merely because it is temporarily not red.
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function(x, y, width, height) {
      fillRect.call(this, x, y, width, height);
      if (this.canvas.id !== 'game' || x !== 124 || y !== 12 || width !== 1 || height !== 1) return;
      const status = document.querySelector('#status')?.textContent ?? '';
      const position = status.match(/X (-?\d+) Y (-?\d+) V (-?\d+)/);
      if (!status.includes('Playing') || !position) return;
      const pixels = this.getImageData(92, 12, 33, 1).data;
      const colors = [0, 16, 32].map(offset => Array.from(pixels.slice(offset * 4, offset * 4 + 3)));
      const red = '255,93,93', empty = '49,67,74';
      const steady = colors.every(color => [red, empty].includes(color.join(',')));
      const sample = { time: performance.now(), x: Number(position[1]), y: Number(position[2]), velocity: Number(position[3]),
        axis: pad.axes[0], health: steady ? colors.filter(color => color.join(',') === red).length : null, colors };
      probe.latest = sample; probe.samples.push(sample);
      if (sample.health !== null) probe.stable = sample;
      if (probe.drive && sample.health === probe.stopHealth) {
        probe.retreat = true; probe.stopHealth = undefined; pad.axes[0] = -1;
        probe.events.push({ kind: 'health-retreat', time: performance.now(), sample });
      }
    };
    Object.assign(window, { rumbleProbe: probe, rumblePad: pad });
  });
  const read = () => page.evaluate(() => { const { effects, resets, polls, neutralPoll, latest, stable } = (window as unknown as {
    rumbleProbe: { effects: { duration: number; strongMagnitude: number; weakMagnitude: number }[]; resets: number; polls: number; neutralPoll: number; latest: Sample | null; stable: Sample | null };
  }).rumbleProbe; return { effects, resets, polls, neutralPoll, latest, stable }; });
  const damageAfter = async (index: number): Promise<ActuatorCall | undefined> => {
    const { calls, samples } = await page.evaluate(() => {
      const probe = (window as unknown as { rumbleProbe: { events: ({ kind: string } & ActuatorCall)[]; samples: HealthObservation[] } }).rumbleProbe;
      return { calls: probe.events.filter(event => event.kind === 'effect'),
        samples: probe.samples.map(({ time, health }) => ({ time, health })) };
    });
    return observedDamage(calls.slice(index), samples);
  };
  const axis = (value: number, stopHealth?: number) => page.evaluate(({ value, stopHealth }) => {
    const state = window as unknown as { rumblePad: { axes: number[] }; rumbleProbe: { drive: boolean; retreat: boolean; direction: number; stopHealth?: number; events: object[] } };
    Object.assign(state.rumbleProbe, { drive: value !== 0, retreat: false, direction: value || 1, stopHealth });
    state.rumblePad.axes[0] = value;
    state.rumbleProbe.events.push({ kind: 'drive-request', time: performance.now(), value, stopHealth });
  }, { value, stopHealth });
  const neutral = async (): Promise<void> => {
    await axis(0);
    const afterClear = (await read()).polls;
    // Resume clears input again. Only a later real getGamepads call observing
    // neutral releases that guard; Playing/aria state is not a poll witness.
    await expect.poll(async () => (await read()).neutralPoll).toBeGreaterThan(afterClear);
    await page.evaluate(afterClear => {
      const probe = (window as unknown as { rumbleProbe: { neutralPoll: number; events: object[] } }).rumbleProbe;
      probe.events.push({ kind: 'neutral-ack', time: performance.now(), afterClear, poll: probe.neutralPoll });
    }, afterClear);
  };
  const resume = async (): Promise<void> => {
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await neutral();
  };
  const safeStop = async (): Promise<void> => {
    await expect.poll(() => page.evaluate(() => (window as unknown as { rumbleProbe: { drive: boolean } }).rumbleProbe.drive)).toBe(false);
    expect((await read()).latest!.x).toBeLessThanOrEqual(1620);
  };
  const movedAfter = async (time: number, x: number): Promise<boolean> => sustainedControllerMovement(
    await page.evaluate(() => (window as unknown as { rumbleProbe: { samples: Sample[] } }).rumbleProbe.samples), time, x);
  try {
    await openAdventure(page, '/?debug=1');
    expect((await page.locator('canvas').boundingBox())!.width).toBe(426);
    expect((await page.locator('canvas').boundingBox())!.height).toBe(240);
    await axis(1);
    await expect(page.getByRole('button', { name: 'QUARRY RUN', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await neutral();
    expect((await read()).effects).toEqual([]); // Controller map navigation has no output.
    await page.getByRole('button', { name: 'PLAINS', exact: true }).click();
    await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
    await page.keyboard.press('m');
    await expect(page.locator('#status')).toContainText('Muted');
    await axis(1, 2);
    await expect.poll(() => damageAfter(0), { timeout: 10000 }).toBeDefined();
    expect((await read()).effects.length).toBeGreaterThan(0);
    await safeStop();
    await neutral();
    await expect.poll(async () => (await read()).stable?.health).toBe(2);
    expect((await damageAfter(0))!.parameters).toMatchObject({ duration: 100, strongMagnitude: 0.55, weakMagnitude: 0.3 });
    await page.locator('#pause').click();
    const rumbleButton = page.getByRole('button', { name: 'Controller rumble', exact: true });
    await rumbleButton.click();
    await expect(rumbleButton).toHaveAttribute('aria-pressed', 'false');
    expect((await read()).resets).toBeGreaterThan(0);
    const disabled = await read();
    await resume();
    const offStart = (await read()).latest!;
    await axis(1, 1);
    await expect.poll(async () => movedAfter(offStart.time, offStart.x)).toBe(true);
    await expect.poll(async () => (await read()).stable?.health, { timeout: 10000 }).toBe(1);
    await safeStop();
    await neutral();
    expect((await read()).effects).toEqual(disabled.effects);
    await page.locator('#pause').click();
    await rumbleButton.click();
    await expect(rumbleButton).toHaveAttribute('aria-pressed', 'true');
    await resume();
    const onStart = (await read()).latest!;
    await axis(1, 3);
    await expect.poll(async () => movedAfter(onStart.time, onStart.x)).toBe(true);
    await expect.poll(() => damageAfter(disabled.effects.length), { timeout: 10000 }).toBeDefined();
    expect((await read()).effects.length).toBeGreaterThan(disabled.effects.length);
    expect((await damageAfter(disabled.effects.length))!.parameters).toMatchObject({ duration: 100, strongMagnitude: 0.55, weakMagnitude: 0.3 });
    await expect.poll(async () => (await read()).stable?.health).not.toBe(1);
    await expect(page.locator('#status')).toContainText('Muted');
    await safeStop();
    await neutral();
    await page.keyboard.press('Escape');
    await expect(page.locator('#status')).toContainText('Paused');
    expect((await read()).resets).toBeGreaterThan(0);
    const paused = await read();
    await axis(1); await page.waitForTimeout(350);
    expect((await read()).effects).toEqual(paused.effects);
    await axis(0); await page.keyboard.press('Escape'); await neutral();
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await axis(1); await page.waitForTimeout(350);
    expect((await read()).effects).toEqual(paused.effects);
    await page.evaluate(() => {
      (window as unknown as { rumblePad: { connected: boolean } }).rumblePad.connected = false;
      window.dispatchEvent(new Event('gamepaddisconnected'));
      window.dispatchEvent(new Event('focus'));
    });
    await page.waitForTimeout(350);
    expect((await read()).effects).toEqual(paused.effects);
    await info.attach('rumble-gameplay', { body: await page.screenshot({ path: info.outputPath('rumble-gameplay.png') }), contentType: 'image/png' });
    expect(errors).toEqual([]);
  } finally {
    const observations = await page.evaluate(() => (window as unknown as {
      rumbleProbe: { samples: Sample[]; events: Record<string, unknown>[] };
    }).rumbleProbe);
    await writeFile(info.outputPath('rumble-render-health.jsonl'), observations.samples.map(sample => JSON.stringify(sample)).join('\n') + '\n');
    await writeFile(info.outputPath('rumble-polls-actuator.jsonl'), observations.events.map(event => JSON.stringify(event)).join('\n') + '\n');
    await info.attach('rumble-render-health', { path: info.outputPath('rumble-render-health.jsonl'), contentType: 'application/x-ndjson' });
    await info.attach('rumble-polls-actuator', { path: info.outputPath('rumble-polls-actuator.jsonl'), contentType: 'application/x-ndjson' });
  }
});

test('rumble setting toggles independently with pointer and keyboard at desktop and small sizes', async ({ page }, info) => {
  await openAdventure(page, '/');
  await page.locator('#pause').click();
  const button = page.getByRole('button', { name: 'Controller rumble', exact: true });
  const sound = page.getByRole('button', { name: 'Sound', exact: true });
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await button.focus(); await page.keyboard.press('Space');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await sound.click(); await expect(button).toHaveAttribute('aria-pressed', 'true');
  await sound.click();
  for (const width of [1366, 426, 320]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 240 });
    await expect(button).toBeInViewport();
    const bounds = await button.boundingBox(), mute = await sound.boundingBox(), canvas = await page.locator('canvas').boundingBox();
    expect(bounds!.x).toBeGreaterThan(mute!.x + mute!.width);
    expect(bounds!.y).toBeGreaterThanOrEqual(canvas!.y);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(canvas!.y + canvas!.height);
    for (const state of ['on', 'off']) {
      await info.attach(`rumble-${state}-${width}`, { body: await page.screenshot({ path: info.outputPath(`rumble-${state}-${width}.png`) }), contentType: 'image/png' });
      await button.click();
    }
  }
  await reloadToMap(page); await page.locator('#pause').click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
});

test('movement sounds follow run and landing, and stop on idle, jump, mute, pause and focus loss', async ({ page }, info) => {
  // Device-independent integration; real synthesis is measured by the offline samples.
  await page.addInitScript(() => {
    const probe = { footsteps: 0, landings: 0, active: 0 };
    Object.assign(window, { movementSoundProbe: probe });
    class Param {
      value = 0;
      setValueAtTime(value: number) { this.value = value; }
      linearRampToValueAtTime() {}
      exponentialRampToValueAtTime() {}
    }
    class Context {
      state = 'suspended'; destination = {};
      get currentTime() { return performance.now() / 1000; }
      async resume() { this.state = 'running'; }
      async suspend() { this.state = 'suspended'; }
      async close() { this.state = 'closed'; }
      createGain() { return { gain: new Param(), connect() {}, disconnect() {} }; }
      createOscillator() {
        let active = false;
        return { frequency: new Param(), type: '', onended: null as (() => void) | null, connect() {}, disconnect() {},
          start() {
            active = true; probe.active++;
            if (this.frequency.value === 180) probe.footsteps++;
            if (this.frequency.value === 110 && this.type === 'sine') probe.landings++;
          },
          stop(when?: number) {
            const finish = () => { if (active) { active = false; probe.active--; this.onended?.(); } };
            if (when === undefined) finish();
            else setTimeout(finish, Math.max(0, (when - performance.now() / 1000) * 1000));
          } };
      }
    }
    Object.assign(window, { AudioContext: Context });
  });
  const read = () => page.evaluate(() => (window as unknown as {
    movementSoundProbe: { footsteps: number; landings: number; active: number };
  }).movementSoundProbe);
  await openAdventure(page, '/');
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await read()).footsteps).toBeGreaterThan(0);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(250); // Finish braking before checking idle.
  const idle = await read();
  await page.waitForTimeout(300);
  expect((await read()).footsteps).toBe(idle.footsteps);

  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(100);
  expect((await read()).footsteps).toBe(idle.footsteps);
  await expect.poll(async () => (await read()).landings).toBe(idle.landings + 1);
  await page.waitForTimeout(200);
  expect((await read()).landings).toBe(idle.landings + 1);
  await info.attach('movement-sounds-grounded', { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });

  for (const mode of ['mute', 'pause', 'focus']) {
    if (mode === 'mute') await page.keyboard.press('m');
    else if (mode === 'pause') await page.keyboard.press('Escape');
    else await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const before = await read();
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowLeft');
    expect((await read()).footsteps).toBe(before.footsteps);
    expect((await read()).landings).toBe(before.landings);
    expect((await read()).active).toBe(0);
    if (mode === 'mute') {
      await page.keyboard.down('Space'); await page.waitForTimeout(100); await page.keyboard.up('Space');
      await page.waitForTimeout(700);
      expect((await read()).landings).toBe(before.landings);
      await page.keyboard.press('m');
    } else if (mode === 'pause') await page.keyboard.press('Escape');
    else await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(100);
    expect((await read()).footsteps).toBe(before.footsteps);
    expect((await read()).landings).toBe(before.landings);
  }
});

test('all springs keep their visible bases on terrain at rest, compressed and released', async ({ page }, info) => {
  await page.goto('/?scene=foundation');
  await page.addScriptTag({ content: `window.drawSpringTestAsset = ${drawAsset.toString()};` });
  for (const level of LEVELS) {
    const results = await page.evaluate(async (level) => {
      const manifest = await (await fetch(`/assets/${level.atlas}/manifest.json`)).json();
      const atlas = new Image();
      atlas.src = `/assets/${level.atlas}/${manifest.image}`;
      await atlas.decode();
      const cell = manifest.cellSize;
      const canvas = document.createElement('canvas');
      canvas.width = 96; canvas.height = 96;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      const index = manifest.assets.spring;
      ctx.drawImage(atlas, index % 4 * cell, Math.floor(index / 4) * cell, cell, cell, 0, 0, cell, cell);
      const source = ctx.getImageData(0, 0, cell, cell).data;
      let left = cell, right = 0, bottom = 0;
      // Match the atlas processor's visible-alpha threshold: invisible fringes
      // must not count as support or conceal a gap below the actual mechanism.
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        if (source[(y * cell + x) * 4 + 3] < 128) continue;
        left = Math.min(left, x); right = Math.max(right, x); bottom = Math.max(bottom, y + 1);
      }
      const anchor = manifest.anchors?.spring ?? { x: cell / 2, y: cell };
      const render = (window as unknown as { drawSpringTestAsset: typeof drawAsset }).drawSpringTestAsset;
      const samples = [];
      for (const spring of level.entities.filter((entity) => entity.kind === 'spring')) {
        for (const scale of [1, 0.6, 1.25]) {
          ctx.clearRect(0, 0, 96, 96);
          // Same translate/scale around the entity contact point as drawWorld.
          ctx.save(); ctx.translate(48, 72); ctx.scale(1, scale);
          render(ctx, { atlas, manifest } as Parameters<typeof drawAsset>[1], 'spring', 0, 0);
          ctx.restore();
          const pixels = ctx.getImageData(0, 0, 96, 96).data;
          let renderedBottom = 0;
          for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
            if (pixels[(y * 96 + x) * 4 + 3] >= 128) renderedBottom = Math.max(renderedBottom, y + 1);
          }
          samples.push({ id: spring.id, scale, renderedBottom });
        }
      }
      return { left: left - anchor.x, right: right - anchor.x, bottom, anchor, samples };
    }, level);
    expect(results.bottom, `${level.id} visible base`).toBe(results.anchor.y);
    for (const spring of level.entities.filter((entity) => entity.kind === 'spring')) {
      // Check the entire actual silhouette, including ledge/pit boundaries.
      for (let dx = results.left; dx <= results.right; dx++) {
        const x = spring.x + dx;
        const planted = surfaceY(level, x) === spring.y || (level.platforms ?? []).some(platform =>
          platform.from.x === platform.to.x && platform.from.y === platform.to.y
          && platform.from.y === spring.y && x >= platform.from.x && x <= platform.from.x + platform.width);
        expect(planted, `${spring.id} footprint ${dx}`).toBe(true);
      }
    }
    for (const sample of results.samples) {
      expect(sample.renderedBottom, `${sample.id} scale ${sample.scale}`).toBe(72);
    }
    await info.attach(`${level.id}-spring-contact`, {
      body: JSON.stringify(results, null, 2), contentType: 'application/json',
    });
  }
});

const dangerXs = (level: typeof PLAINS_LEVEL): number[] => level.entities
  .filter((entity) => entity.kind === 'slime' || entity.kind === 'hazard')
  // Traversal consumes this list from left to right. Entity order groups slimes
  // before hazards, which otherwise hides earlier stones until after the route.
  // Jump before entering any possible patrol position, not just its spawn centre.
  .map(entity => entity.patrol?.minX ?? entity.x)
  .sort((left, right) => left - right);

test('route driver starts avoidance at each slime patrol entry rather than its authored centre', () => {
  for (const level of LEVELS) {
    const expected = level.entities.filter(entity => entity.kind === 'slime' || entity.kind === 'hazard')
      .map(entity => entity.patrol?.minX ?? entity.x).sort((a, b) => a - b);
    expect(dangerXs(level)).toEqual(expected);
  }
});

/** Observe the real title drawing without adding a production-only test API. */
async function observeTitleSelection(page: Page): Promise<void> {
  await page.addInitScript(() => {
    setInterval(() => {
      const selected = document.querySelector('.trail-menu button[aria-pressed="true"]');
      const canvas = document.querySelector('canvas');
      if (selected && canvas) canvas.dataset.titleSelection = `◀ ${selected.getAttribute('aria-label')} ▶`;
    }, 16);
  });
}

async function selectNextLevel(page: Page, name: string): Promise<void> {
  await page.keyboard.down('ArrowRight');
  try {
    await expect(page.locator('canvas')).toHaveAttribute('data-title-selection', `◀ ${name} ▶`);
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  // Selection is edge-triggered by simulation samples. Let neutral input reach
  // a simulation step before another keydown, even on a slow or fast display.
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame((start) => {
      const releasedFrame = (now: number): void => {
        if (now - start >= 50) resolve();
        else requestAnimationFrame(releasedFrame);
      };
      requestAnimationFrame(releasedFrame);
    });
  }));
}

async function advancePastDanger(page: Page, dangers: readonly number[], progress: { index: number; lastX?: number }, pollIntervalMs = 100): Promise<string> {
  const status = await page.locator('#status').innerText();
  const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
  if (progress.lastX !== undefined && x < progress.lastX - 100) {
    const retryIndex = dangers.findIndex((dangerX) => dangerX >= x - 40);
    progress.index = retryIndex < 0 ? dangers.length : retryIndex;
  }
  progress.lastX = x;
  while (dangers[progress.index] !== undefined && dangers[progress.index] < x - 40) progress.index++;
  if (dangers[progress.index] !== undefined && x >= dangers[progress.index] - 60) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(350);
    await page.keyboard.up('Space');
    progress.index++;
  } else {
    await page.waitForTimeout(pollIntervalMs);
  }
  return status;
}

test('terrain joins stay solid while scrolling in both directions at integer and fractional scales', async ({ page }, info) => {
  // WebKit is substantially slower for repeated canvas readbacks than the
  // other bundled engines; keep the assertion identical while allowing the
  // full cross-scale sweep to complete on constrained runners.
  test.setTimeout(120_000);
  await page.goto('/?scene=foundation');
  // Run the real renderer on a separate canvas so sprites and HUD cannot hide seams.
  await page.addScriptTag({ content: `${RENDERER_SOURCE}\nwindow.drawTerrainTestWorld = ${drawWorld.toString()};` });
  const result = await page.evaluate(async ({ level, maxSpeed }) => {
    const manifest = await (await fetch('/assets/plains/manifest.json')).json();
    const atlas = new Image();
    atlas.src = `/assets/plains/${manifest.image}`;
    await atlas.decode();
    const gems = new Image(); gems.src = '/assets/gems/gems.png'; await gems.decode();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const render = (window as unknown as { drawTerrainTestWorld: typeof drawWorld }).drawTerrainTestWorld;
    const failures: string[] = [];
    let frames = 0;
    let evidence = '';
    for (const scale of [1, 1.25, 1.5, 2]) {
      canvas.width = Math.ceil(426 * scale);
      canvas.height = Math.ceil(240 * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      for (const direction of [-1, 1]) {
        for (const surface of level.surfaces.slice(0, -1)) {
          for (let frame = 0; frame < 12; frame++) {
            const x = surface.x2 - 213 + 0.25 + direction * frame * maxSpeed / 60;
            const camera = { position: { x, y: 0 } } as Parameters<typeof drawWorld>[3];
            render(ctx, { atlas, manifest, gems }, level, camera, () => false);
            // The new hollow reaches y224. Keep the sample below the contour,
            // and retain at least the original 3×20 scaled pixels per frame by
            // widening the strip where fewer rows fit above the viewport bottom.
            const joinX = Math.floor((surface.x2 - x) * scale);
            const sampleTop = Math.max(210, Math.ceil(surface.y2) + 6);
            const sampleHeight = Math.floor(Math.min(20, 239 - sampleTop) * scale);
            const sampleWidth = Math.ceil(3 * Math.floor(20 * scale) / sampleHeight);
            const pixels = ctx.getImageData(joinX - Math.floor(sampleWidth / 2), Math.ceil(sampleTop * scale), sampleWidth, sampleHeight).data;
            for (let i = 0; i < pixels.length; i += 4) {
              if (pixels[i] <= pixels[i + 1] || pixels[i + 1] <= pixels[i + 2] || pixels[i + 3] !== 255) {
                if (failures.length < 10) failures.push(`join ${surface.x2}, scale ${scale}, direction ${direction}, frame ${frame}: ${Array.from(pixels.slice(i, i + 4))}`);
                break;
              }
            }
            frames++;
            if (surface.x2 === 1100 && scale === 2 && direction === 1 && frame === 0) evidence = canvas.toDataURL();
          }
        }
      }
    }
    return { failures, frames, evidence };
  }, { level: PLAINS_LEVEL, maxSpeed: DEFAULT_MOVEMENT.maxSpeed });
  const evidencePath = info.outputPath('terrain-join-1100.png');
  await writeFile(evidencePath, Buffer.from(result.evidence.split(',')[1], 'base64'));
  await info.attach('terrain-join-1100', { path: evidencePath, contentType: 'image/png' });
  expect(result.frames).toBe((PLAINS_LEVEL.surfaces.length - 1) * 4 * 2 * 12);
  expect(result.failures).toEqual([]);
});

test('moving platform slabs and their telegraphed paths draw on the real canvas', async ({ page }, info) => {
  await page.goto('/?scene=foundation');
  await page.addScriptTag({ content: `${RENDERER_SOURCE}\nwindow.drawTerrainTestWorld = ${drawWorld.toString()};` });
  const platforms = (QUARRY_RUN.platforms ?? []).filter(platform => platform.from.x !== platform.to.x || platform.from.y !== platform.to.y);
  // Sample each vertical lift in transit and frame the deck at screen Y120.
  const views = platforms.map((platform) => ({
    id: platform.id,
    body: platformBodyAt(platform, 2),
  }));
  const rgb = (hex: string): number[] => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const theme = { edge: rgb(QUARRY_RUN.theme.edge), ground: rgb(QUARRY_RUN.theme.ground) };
  const results = await page.evaluate(async ({ level, views: sampled, theme: colors }) => {
    const manifest = await (await fetch('/assets/plains/manifest.json')).json();
    const atlas = new Image();
    atlas.src = `/assets/plains/${manifest.image}`;
    await atlas.decode();
    const gems = new Image(); gems.src = '/assets/gems/gems.png'; await gems.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 426;
    canvas.height = 240;
    const ctx = canvas.getContext('2d')!;
    const render = (window as unknown as { drawTerrainTestWorld: typeof drawWorld }).drawTerrainTestWorld;
    const bare = { ...level, platforms: [] };
    return sampled.map(({ id, body }) => {
      const offset = { x: body.x - 150, y: body.y - 120 };
      const camera = { position: offset } as Parameters<typeof drawWorld>[3];
      // The same frame without any platform data, to prove what the telegraph itself draws.
      ctx.clearRect(0, 0, 426, 240);
      render(ctx, { atlas, manifest, gems }, bare, camera, () => true, (entity) => entity, []);
      const before = ctx.getImageData(0, 0, 426, 240).data;
      ctx.clearRect(0, 0, 426, 240);
      render(ctx, { atlas, manifest, gems }, { ...level, platforms: level.platforms!.filter(platform => platform.id === id) }, camera, () => true, (entity) => entity, [body]);
      const after = ctx.getImageData(0, 0, 426, 240).data;
      // Everything outside the deck is identical between the two frames except the telegraph,
      // so counting changed pixels there counts exactly the pips and their end markers.
      let telegraphed = 0;
      for (let y = 0; y < 240; y++) {
        for (let x = 0; x < 426; x++) {
          if (x >= 150 && x <= 150 + body.width && y >= 120 - 3 && y <= 120 + body.height) continue;
          const pixel = (y * 426 + x) * 4;
          if (before[pixel] !== after[pixel] || before[pixel + 1] !== after[pixel + 1]) telegraphed++;
        }
      }
      // Count along the whole deck rather than sampling one pixel: entity art, such as the
      // bonus gem hanging over the lift, legitimately covers part of it.
      const run = (y: number, colour: number[]): number => {
        const data = ctx.getImageData(150, Math.round(y), Math.round(body.width), 1).data;
        let matches = 0;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index] === colour[0] && data[index + 1] === colour[1] && data[index + 2] === colour[2]) matches++;
        }
        return matches;
      };
      return {
        id,
        width: body.width,
        cap: run(121, colors.edge),
        slab: run(126, colors.ground),
        telegraphed,
        image: canvas.toDataURL(),
      };
    });
  }, { level: QUARRY_RUN, views, theme });
  expect(results.map(({ id }) => id)).toEqual(platforms.map((platform) => platform.id));
  for (const result of results) {
    // A quarter of the deck is a conservative floor: entity art legitimately covers the rest,
    // such as the bonus gem hanging over the lift or the hazards the ferry passes.
    expect(result.cap).toBeGreaterThan(result.width / 4);
    expect(result.slab).toBeGreaterThan(result.width / 4);
    // Pips mark the route away from the deck, whatever the ride happens to pass in front of.
    expect(result.telegraphed).toBeGreaterThan(20);
    const evidence = info.outputPath(`${result.id}.png`);
    await writeFile(evidence, Buffer.from(result.image.split(',')[1], 'base64'));
    await info.attach(result.id, { path: evidence, contentType: 'image/png' });
  }
});

test('production canvas loads, scales and recovers from focus loss', async ({ page, browser }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?scene=foundation');
  await expect(page.locator('#status')).toHaveText('Foundation preview · Escape to pause · M to mute');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('width', '426');
  await expect(canvas).toHaveAttribute('height', '240');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(12, 25, 34)');
  expect((await canvas.boundingBox())!.height).toBeCloseTo(724, 1);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(724 * 426 / 240, 1);
  await page.setViewportSize({ width: 900, height: 600 });
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(900);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  const pausedImage = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.evaluate(() => new Promise<void>((resolve) => {
    let frames = 0;
    const tick = () => { if (++frames === 10) resolve(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }));
  expect(await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL())).toBe(pausedImage);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#status')).toHaveText('Paused · Return to the game to continue');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Foundation preview');
  await page.keyboard.press('m');
  await expect(page.locator('#status')).toContainText('Muted');
  await page.locator('#pause').click();
  await expect(page.getByRole('button', { name: 'Sound', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Sound', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('#status')).not.toContainText('Muted');
  await reloadToMap(page);
  await expect(page.locator('#status')).toHaveText('Foundation preview · Escape to pause · M to mute');
  expect(errors).toEqual([]);
  await info.attach('browser-version', { body: browser.version(), contentType: 'text/plain' });
  console.log(`${info.project.name}: ${browser.version()}`);
  await page.screenshot({ path: info.outputPath('foundation.png') });
});

test('art preview loads local assets and reports a missing atlas', async ({ page }) => {
  await page.goto('/?scene=art');
  await expect(page.locator('#status')).toContainText('Art preview', { timeout: 15000 });
  await expect(page.locator('#status')).not.toContainText('Loading', { timeout: 15000 });
  await page.route('**/assets/henry/henry-celebration.png', (route) => route.abort());
  await reloadToMap(page);
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute('**/assets/henry/henry-celebration.png');
  await retryToMap(page);
  await expect(page.locator('#status')).toContainText('Art preview', { timeout: 15000 });
});

test('starter atlas contains real transparency and every frame stays within its cell', async ({ page }) => {
  await page.goto('/?scene=art');
  await expect(page.locator('#status')).toContainText('Art preview', { timeout: 15000 });
  const results = await page.evaluate(async () => {
    const manifest = await (await fetch('/assets/henry/manifest.json')).json();
    const image = new Image();
    image.src = '/assets/henry/' + manifest.image;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    return manifest.frames.map((frame: { x: number; y: number; width: number; height: number }) => {
      const pixels = ctx.getImageData(frame.x, frame.y, frame.width, frame.height).data;
      let opaque = 0;
      let clear = 0;
      let edge = 0;
      let cornerBackground = 0;
      for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
        const alpha = pixels[(y * frame.width + x) * 4 + 3];
        if (alpha === 0) clear++;
        else opaque++;
        if ((x === 0 || y === 0 || x === frame.width - 1 || y === frame.height - 1) && alpha) edge++;
        // Inspect inside the normalization margin: a transparent cell border
        // alone also passes for an opaque checkerboard rectangle (#42).
        if (((x >= 4 && x < 8) || (x >= 40 && x < 44)) &&
            ((y >= 4 && y < 8) || (y >= 40 && y < 44)) && alpha) cornerBackground++;
      }
      return { opaque, clear, edge, cornerBackground };
    });
  });
  expect(results).toHaveLength(24);
  for (const result of results) {
    expect(result.opaque).toBeGreaterThan(150);
    expect(result.clear).toBeGreaterThan(500);
    expect(result.edge).toBe(0);
    expect(result.cornerBackground).toBe(0);
  }
});

test('movement preview accepts keyboard movement and jump input', async ({ page }) => {
  await page.goto('/?scene=movement');
  await expect(page.locator('#status')).toContainText('Movement preview', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(180);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('canvas')).toHaveAttribute('width', '426');
  await page.keyboard.press('Space');
  await page.waitForTimeout(40);
  await expect(page.locator('#status')).toContainText('Movement preview');
});

test('world preview loads generated Plains assets and level data', async ({ page }) => {
  await page.goto('/?scene=world');
  await expect(page.locator('#status')).toContainText('World preview', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(160);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('canvas')).toHaveAttribute('width', '426');
});

test('gameplay preview collects a gem and reaches a checkpoint', async ({ page }) => {
  await page.goto('/?scene=gameplay');
  await expect(page.locator('#status')).toContainText('Gameplay preview', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#status')).toContainText('Gameplay preview');
});

test('adventure flashes the sprite after damage without a rectangular overlay', async ({ page }) => {
  await installTrailPilot(page);
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      if (args[0] instanceof HTMLCanvasElement && args.length === 9) {
        this.canvas.dataset.hitSprite = `tinted|${this.globalAlpha}`;
      }
      Reflect.apply(draw, this, args);
    } as typeof draw;
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (width === 44 && height === 50) this.canvas.dataset.hurtRectangle = 'true';
      fill.call(this, x, y, width, height);
    };
  });
  await page.setViewportSize({ width: 426, height: 300 });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Title');
  await page.getByRole('button', { name: 'PLAINS', exact: true }).click();
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  await page.keyboard.down('ArrowRight');
  await expect(page.locator('canvas')).toHaveAttribute('data-hit-sprite', /tinted/, { timeout: 5000 });
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('canvas')).not.toHaveAttribute('data-hurt-rectangle');
});

test('adventure HUD shows three hearts and empties one after damage', async ({ page }) => {
  await installTrailPilot(page);
  await page.setViewportSize({ width: 426, height: 300 });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.getByRole('button', { name: 'PLAINS', exact: true }).click();
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const canvas = page.locator('canvas');
  const readPips = async (): Promise<number[][]> => canvas.evaluate((element) => {
    const ctx = (element as HTMLCanvasElement).getContext('2d')!;
    return [94, 110, 126].map((x) => Array.from(ctx.getImageData(x, 13, 1, 1).data));
  });
  const full = [255, 93, 93, 255];
  expect(await readPips()).toEqual([full, full, full]);

  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await readPips()).filter((pip) => pip[0] === 255 && pip[1] === 93 && pip[2] === 93).length,
    { timeout: 5000 }).toBe(2);
  await page.keyboard.up('ArrowRight');
  const damaged = await readPips();
  expect(new Set(damaged.map((pip) => pip.join(','))).size).toBeGreaterThan(1);
});

test('a patrolling slime keeps moving while Henry stands still', async ({ page }) => {
  await installTrailPilot(page);
  await page.setViewportSize({ width: 426, height: 300 });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.getByRole('button', { name: 'PLAINS', exact: true }).click();
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  // Stop on the orchard's actual flat x1900–1960, past the slime. Its
  // sloping approach accelerates a released player and cannot prove standing still.
  await page.evaluate(() => Object.assign((window as unknown as { trailPilot: object }).trailPilot,
    { active: true, dangers: [], pauseAt: 1910 }));
  await page.waitForFunction(() => (window as unknown as { trailPilot: { frozen: boolean } }).trailPilot.frozen, undefined, { timeout: 5000 });
  await page.keyboard.up('ArrowRight');
  await page.evaluate(() => Object.assign((window as unknown as { trailPilot: object }).trailPilot,
    { active: false, frozen: false, pauseAt: 0 }));
  await expect(page.locator('#status')).toContainText('V 0');
  const stationaryX = Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]);
  // Henry now stands beside the Plains orchard slime; only the patrol moves.
  // With Henry stationary, the visible Plains slime patrol changes this strip.
  const signature = async (): Promise<number> => page.locator('canvas').evaluate((element) => {
    const pixels = (element as HTMLCanvasElement).getContext('2d')!.getImageData(20, 120, 130, 90).data;
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 4) sum += pixels[i] * 3 + pixels[i + 1] * 5 + pixels[i + 2] * 7;
    return sum;
  });
  const before = await signature();
  await expect.poll(signature, { timeout: 5000 }).not.toBe(before);
  expect(Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? -1)).toBe(stationaryX);
});

test('Henry faces the direction of travel, including after reversing while moving', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const facing = async () => Number((await page.locator('#status').innerText()).match(/F (-?\d+)/)?.[1] ?? 0);
  const velocity = async () => Number((await page.locator('#status').innerText()).match(/V (-?\d+)/)?.[1] ?? 0);
  await page.keyboard.down('ArrowRight');
  await expect.poll(velocity).toBeGreaterThan(0);
  expect(await facing()).toBe(1);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await expect.poll(velocity, { timeout: 3000 }).toBeLessThan(0);
  expect(await facing()).toBe(-1);
  await page.keyboard.up('ArrowLeft');
});

test('default main menu starts the Plains level with Space', async ({ page }) => {
  await openAdventure(page, '/');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await reloadToMap(page);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
});

for (const url of ['/', '/?scene=adventure']) {
  test(`${url} starts and reloads on the trail map with Plains selected and no picture story`, async ({ page }) => {
    const errors: string[] = [], storyRequests: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/assets/story/')) storyRequests.push(request.url()); });
    await installTrailPilot(page);
    const canvas = page.locator('canvas');
    const expectMap = async (): Promise<void> => {
      await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
      await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: 'Play PLAINS', exact: true })).toBeVisible();
      await expect(page.locator('.trail-menu button')).toHaveCount(LEVELS.length + 2);
      for (const name of ['Skip story', 'Next picture', 'Replay story', 'View reunion picture']) {
        await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
      }
      await expect(canvas).toHaveAttribute('aria-label', 'Tiny Turbo Trails game');
    };
    await page.goto(url);
    await expectMap();
    // The retired R key and controller View button are inert on the map.
    await page.keyboard.press('r');
    await page.evaluate(() => {
      const state = window as unknown as { trailPilot: { controller: boolean }; trailPad: { buttons: { pressed: boolean }[] } };
      state.trailPilot.controller = true; state.trailPad.buttons[8].pressed = true;
    });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[8].pressed = false; });
    await expectMap();
    await page.reload();
    await expectMap();
    await page.keyboard.press('Space');
    await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
    expect(storyRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('title picker selects Quarry Run and starts the selected route', { lock: 'native-route' }, async ({ page }) => {
  await startQuarryPilot(page);
  await driveQuarry(page, QUARRY_DESCENT);
  await quarryFinish(page);
});

test('Quarry absent carriage has a permanent local catch and a return jump', { lock: 'native-route' }, async ({ page }, info) => {
  await startQuarryPilot(page);
  await driveQuarry(page, [{ x: 180, y: 140, tag: 'A waiting ledge' }]);
  await page.waitForFunction(() => (window as unknown as { quarryPilot: { decks: { id: string; y: number }[] } }).quarryPilot.decks.some(deck => deck.id === 'quarry-lift-a' && deck.y > 240 && deck.y < 350));
  await driveQuarry(page, [{ x: 112, y: 164, tag: 'absent A local catch' }]);
  await info.attach('quarry-absent-carriage-catch', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  await driveQuarry(page, [{ x: 180, y: 140, jump: true, tag: 'catch return jump' }]);
  await expect(page.locator('#status')).toContainText('Playing');
});

test('title picker renders Treetop Timbers with its own atlas', async ({ page }, info) => {
  await observeTitleSelection(page);
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D,
      ...args: Parameters<typeof original>) {
      const image = args[0];
      if (image instanceof HTMLImageElement && image.src.endsWith('/assets/timbers/environment.png')) {
        this.canvas.dataset.timberAtlas = image.src;
      }
      Reflect.apply(original, this, args);
    } as typeof original;
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await selectNextLevel(page, 'QUARRY RUN');
  await selectNextLevel(page, 'TREETOP TIMBERS');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-timber-atlas', /\/assets\/timbers\/environment\.png$/,
  );
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number(
    (await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0,
  ), { timeout: 10000 }).toBeGreaterThan(250);
  await page.keyboard.up('ArrowRight');
  const screenshot = info.outputPath('treetop-timbers.png');
  await page.locator('canvas').screenshot({ path: screenshot });
  await info.attach('treetop-timbers', { path: screenshot, contentType: 'image/png' });
});

test('title picker consumes each selection and release with delayed animation frames', async ({ page }) => {
  await observeTitleSelection(page);
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => window.setTimeout(() => original(callback), 200);
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await selectNextLevel(page, 'QUARRY RUN');
  await selectNextLevel(page, 'TREETOP TIMBERS');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
});

test('title picker wraps back to Sunset Site and renders its terrain atlas', async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D,
      ...args: Parameters<typeof original>) {
      const image = args[0];
      if (image instanceof HTMLImageElement && image.src.endsWith('/assets/site/environment.png')
        && args.length === 9) {
        this.canvas.dataset.siteTerrainAtlas = image.src;
      }
      Reflect.apply(original, this, args);
    } as typeof original;
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  // Wrap from Plains through Sandy Cove and Frost Ridge to Sunset Site.
  for (let step = 0; step < 3; step++) {
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(50);
  }
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-site-terrain-atlas', /\/assets\/site\/environment\.png$/,
  );
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
});

test('adventure mute control updates the audio state', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure');
  await page.locator('#pause').click();
  const sound = page.getByRole('button', { name: 'Sound', exact: true });
  await sound.click(); await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Muted');
  await page.locator('#pause').click(); await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('#status')).not.toContainText('Muted');
});

test('adventure remains playable when Web Audio is unavailable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw Error('Unavailable'); } } });
  });
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(180);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  expect(errors).toEqual([]);
});

test('adventure keeps its letterbox and pauses on focus loss', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const canvas = page.locator('canvas');
  await page.setViewportSize({ width: 900, height: 600 });
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(900);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#status')).toHaveText('Paused · Return to the game to continue');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
});

test('adventure exposes retry when a required asset fails to load', async ({ page }) => {
  await page.route('**/assets/henry/henry-celebration.png', (route) => route.abort());
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.', { timeout: 15000 });
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute('**/assets/henry/henry-celebration.png');
  await retryToMap(page);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
});

test('adventure clears held controller input after disconnect', async ({ page }) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = {
      id: 'disconnect-controller', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0], buttons, vibrationActuator: null,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    Object.assign(window, { disconnectController: pad });
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.evaluate(() => {
    (window as unknown as { disconnectController: { axes: number[] } }).disconnectController.axes[0] = 1;
  });
  await expect.poll(async () => Number(
    (await page.locator('#status').innerText()).match(/V (-?\d+)/)?.[1] ?? 0,
  )).toBeGreaterThan(0);
  // Sample and disconnect in one browser task: tracing/transport latency between
  // separate calls otherwise counts still-held movement as post-disconnect coast.
  const beforeDisconnect = await page.evaluate(() => {
    const x = Number(document.querySelector('#status')?.textContent?.match(/X (\d+)/)?.[1] ?? 0);
    window.dispatchEvent(new Event('gamepaddisconnected'));
    const pad = (window as unknown as { disconnectController: { axes: number[]; connected: boolean } }).disconnectController;
    pad.connected = false;
    pad.axes[0] = 0;
    return x;
  });
  await expect(page.locator('#status')).toContainText(' V 0 ');
  const afterDisconnect = Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
  // Disconnect clears the held input; existing momentum may coast briefly while braking.
  expect(afterDisconnect - beforeDisconnect).toBeLessThanOrEqual(25);
  await page.evaluate(() => {
    const pad = (window as unknown as { disconnectController: { axes: number[]; connected: boolean } }).disconnectController;
    pad.connected = true;
    pad.axes[0] = 0;
  });
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    (window as unknown as { disconnectController: { axes: number[] } }).disconnectController.axes[0] = 1;
  });
  await page.waitForTimeout(150);
  const afterRelease = Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
  expect(afterRelease).toBeGreaterThan(afterDisconnect);
});

test('adventure can complete the forgiving route and replay directly with a fresh camera', { lock: 'native-route' }, async ({ page }, info) => {
  test.setTimeout(200_000);
  await page.setViewportSize({ width: 426, height: 300 });
  await openAdventure(page, '/?scene=adventure&debug=1');
  expect((await page.locator('canvas').boundingBox())!.width).toBe(426);
  expect((await page.locator('canvas').boundingBox())!.height).toBe(240);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  // The compact Plains route retains ordinary held-right traversal.
  // Jump near hazards so health loss does not intentionally return the run to a checkpoint.
  const progress = { index: 0 };
  const dangers = dangerXs(PLAINS_LEVEL);
  for (let step = 0; step < 1100; step++) {
    const status = await advancePastDanger(page, dangers, progress);
    if (status.includes('Finish')) break;
  }
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#status')).toContainText('Adventure preview · Finish', { timeout: 5000 });
  await expectResultsFirst(page);
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeVisible();
  const finishStatus = await page.locator('#status').innerText();
  expect(finishStatus).toMatch(new RegExp(`Gems [1-9]\\d*/${PLAINS_LEVEL.entities.filter((entity) => entity.kind === 'gem').length}\\b`));
  const celebrationPixels = await page.locator('canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.getImageData(256, 87, 48, 64).data;
    let matches = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 190 && pixels[i + 1] > 120 && pixels[i + 1] < 240 && pixels[i + 2] < 100 && pixels[i + 3] > 0) matches++;
    }
    return matches;
  });
  expect(celebrationPixels).toBeGreaterThan(20);
  // The first visible finish frame can precede the neutral simulation step that rearms Space.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await selectReplayWithKeyboard(page);
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing', { timeout: 15000 });
  await expect(page.locator('#status')).toContainText('X 60');
  await info.attach('replay-starting-view', { body: await page.locator('canvas').screenshot({ path: info.outputPath('replay-starting-view.png') }), contentType: 'image/png' });
});

test('adventure pause freezes progress and reload starts a fresh in-memory run', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing', { timeout: 15000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(220);
  await page.keyboard.up('ArrowRight');
  const progressed = await page.locator('#status').innerText();
  const progressedX = Number(progressed.match(/X (\d+)/)?.[1] ?? 0);
  expect(progressedX).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  const pausedImage = await page.locator('canvas').evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(250);
  expect(await page.locator('canvas').evaluate((element) => (element as HTMLCanvasElement).toDataURL())).toBe(pausedImage);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await reloadToMap(page);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
});

test('paused T shortcut confirms before returning to Trails and resets the run', async ({ page }, info) => {
  await page.setViewportSize({ width: 426, height: 240 });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Playing');
  await page.keyboard.press('t');
  await expect(page.locator('#status')).toContainText('Playing');
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1])).toBeGreaterThan(100);
  const beforePauseX = Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]);
  await page.keyboard.press('Escape');
  await page.keyboard.up('ArrowRight');
  await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveAttribute('aria-pressed', 'true');
  if (info.project.name === 'chromium') {
    await mkdir(info.outputPath('pause-evidence'), { recursive: true });
    await page.screenshot({ path: info.outputPath('pause-evidence/keyboard-pause.png') });
  }
  const paused = await page.locator('canvas').evaluate(element => (element as HTMLCanvasElement).toDataURL());
  await page.keyboard.down('t');
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('t'); // Auto-repeat cannot also confirm the exit.
  await expect(page.locator('#status')).toContainText('Paused');
  await page.keyboard.up('t');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  expect(await page.locator('canvas').evaluate(element => (element as HTMLCanvasElement).toDataURL())).toBe(paused);
  // Resume and a fresh movement press can arrive before the same render frame.
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
  });
  await expect(page.locator('#status')).toContainText('Playing');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1])).toBeGreaterThan(beforePauseX + 100);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toBeVisible();
  await page.keyboard.press('t');
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 240 });
  if (info.project.name === 'chromium') await page.screenshot({ path: info.outputPath('confirmation-small.png') });
  await page.keyboard.press('t');
  await expect(page.locator('#status')).toContainText('Title');
  await expect(page.getByRole('button', { name: `Play ${PLAINS_LEVEL.name}`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Playing');
  await expect(page.locator('#status')).toContainText(`X ${PLAINS_LEVEL.start.x}`);
});

test('pause return works through pointer, Tab, Enter and focused Space, and cancels on focus loss', async ({ page }) => {
  await openAdventure(page, '/?scene=adventure');
  await page.getByRole('button', { name: `Play ${PLAINS_LEVEL.name}`, exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Return to Trails', exact: true }).click();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toBeFocused();
  await page.keyboard.down('Enter');
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeVisible();
  await page.keyboard.down('Enter');
  await expect(page.locator('#status')).toContainText('Paused');
  await page.keyboard.up('Enter');
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Title');
  await page.getByRole('button', { name: `Play ${PLAINS_LEVEL.name}`, exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.keyboard.press('t');
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.keyboard.press('t');
  await page.getByRole('button', { name: 'Return to Trails', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Title');
});

test('controller pause return requires confirmation and clears held actions before map and replay', async ({ page }, info) => {
  await page.addInitScript(() => {
    const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
    Object.assign(window, { pausePad: pad });
  });
  const button = async (index: number, pressed: boolean): Promise<void> => {
    await page.evaluate(({ index, pressed }) => new Promise<void>(resolve => {
      (window as unknown as { pausePad: { buttons: { pressed: boolean }[] } }).pausePad.buttons[index].pressed = pressed;
      // Let the real input loop sample each edge, even when the host is busy.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }), { index, pressed });
  };
  await openAdventure(page, '/?scene=adventure&debug=1');
  await button(0, true); await button(0, false);
  await expect(page.locator('#status')).toContainText('Playing');
  await button(9, true); await button(9, false);
  await button(15, true); await button(15, false);
  await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toHaveAttribute('aria-pressed', 'true');
  if (info.project.name === 'chromium') {
    await mkdir(info.outputPath('pause-evidence'), { recursive: true });
    await page.screenshot({ path: info.outputPath('pause-evidence/controller-pause.png') });
  }
  await button(0, true);
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(120);
  await expect(page.locator('#status')).toContainText('Paused');
  await button(0, false);
  await button(9, true); await button(9, false);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await button(15, true); await button(15, false);
  await button(0, true); await button(0, false);
  await button(15, true);
  await button(0, true);
  await expect(page.locator('#status')).toContainText('Title');
  await page.waitForTimeout(120);
  await expect(page.getByRole('button', { name: `Play ${PLAINS_LEVEL.name}`, exact: true })).toBeVisible();
  await button(0, false); await button(15, false);
  await button(0, true);
  await expect(page.locator('#status')).toContainText('Playing');
  await expect(page.locator('#status')).toContainText(`X ${PLAINS_LEVEL.start.x}`);
  await button(0, false);
});

test('default main menu accepts controller primary-button start, Start pause and D-pad movement', async ({ page }) => {
  await observeTitleSelection(page);
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = {
      id: 'browser-smoke-controller', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0], buttons, vibrationActuator: null,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    Object.assign(window, { smokeController: pad });
  });
  await openAdventure(page, '/');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { buttons: { pressed: boolean }[] } }).smokeController;
    pad.buttons[15].pressed = true;
  });
  await expect(page.locator('canvas')).toHaveAttribute('data-title-selection', '◀ QUARRY RUN ▶');
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { buttons: { pressed: boolean }[] } }).smokeController;
    pad.buttons[15].pressed = false;
    pad.buttons[0].pressed = true;
  });
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { axes: number[]; buttons: { pressed: boolean }[] } }).smokeController;
    pad.buttons[0].pressed = false;
    pad.axes[0] = 1;
    pad.buttons[15].pressed = true;
  });
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { axes: number[]; buttons: { pressed: boolean }[] } }).smokeController;
    pad.axes[0] = 0;
    pad.buttons[15].pressed = false;
    pad.buttons[9].pressed = true;
  });
  await expect(page.locator('#status')).toHaveText('Paused · Start to resume');
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { buttons: { pressed: boolean }[] } }).smokeController;
    pad.buttons[9].pressed = false;
  });
  await page.waitForTimeout(40);
  await page.evaluate(() => {
    const pad = (window as unknown as { smokeController: { buttons: { pressed: boolean }[] } }).smokeController;
    pad.buttons[9].pressed = true;
  });
  await expect(page.locator('#status')).toContainText('Adventure preview');
});

test('controller jump works mid-gameplay via any face button, not just at the title screen (#62)', async ({ page }) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = {
      id: 'jump-controller', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0], buttons, vibrationActuator: null,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    Object.assign(window, { jumpController: pad });
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  const readY = async (): Promise<number> =>
    Number((await page.locator('#status').innerText()).match(/Y (\d+)/)?.[1] ?? 0);
  // Start with A (button 0), as the existing controller smoke test does.
  await page.evaluate(() => {
    const pad = (window as unknown as { jumpController: { buttons: { pressed: boolean }[] } }).jumpController;
    pad.buttons[0].pressed = true;
  });
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.evaluate(() => {
    const pad = (window as unknown as { jumpController: { buttons: { pressed: boolean }[] } }).jumpController;
    pad.buttons[0].pressed = false;
  });
  await page.waitForTimeout(150); // Let the player settle on the ground.
  const groundedY = await readY();
  // Jump with B (button 1) once gameplay is running, exercising the broadened jump mapping.
  await page.evaluate(() => {
    const pad = (window as unknown as { jumpController: { buttons: { pressed: boolean }[] } }).jumpController;
    pad.buttons[1].pressed = true;
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    const pad = (window as unknown as { jumpController: { buttons: { pressed: boolean }[] } }).jumpController;
    pad.buttons[1].pressed = false;
  });
  await expect.poll(readY).toBeLessThan(groundedY);
});

test('all checkpoints activate along the ground route and render planted markers', { lock: 'native-route' }, async ({ page }, info) => {
  // Observe every current Plains flag through real held-right traversal.
  test.setTimeout(200_000);
  // Observe the visible HUD without adding test-only state to the game.
  await page.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text === 'Checkpoint reached!') document.querySelector('canvas')?.setAttribute('data-test-checkpoint', text);
      if (maxWidth === undefined) fillText.call(this, text, x, y);
      else fillText.call(this, text, x, y, maxWidth);
    };
  });
  await page.setViewportSize({ width: 426, height: 300 });
  await openAdventure(page, '/?scene=adventure&debug=1');
  expect((await page.locator('canvas').boundingBox())!.width).toBe(426);
  expect((await page.locator('canvas').boundingBox())!.height).toBe(240);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await page.keyboard.down('ArrowRight');
  // Terrain heights come from surfaceY rather than being restated here, so the check
  // cannot drift from the level data the way the coordinates in #26 did.
  const checkpoints = PLAINS_LEVEL.checkpoints;
  // Patrols can meet Henry before their authored centre. Start the approach at
  // their left bound, retaining the same static hazard positions and jump input.
  const dangers = PLAINS_LEVEL.entities
    .filter((entity) => entity.kind === 'slime' || entity.kind === 'hazard')
    .map((entity) => entity.patrol?.minX ?? entity.x)
    .sort((left, right) => left - right);
  const progress = { index: 0 };
  for (const checkpoint of checkpoints) {
    await page.evaluate(() => document.querySelector('canvas')?.removeAttribute('data-test-checkpoint'));
    let activated = false;
    // Faster observations leave room to jump before contact. Use an elapsed
    // 40s window rather than reducing traversal time with the shorter polling.
    // The overall 200s test limit and every checkpoint assertion remain intact.
    const deadline = Date.now() + 40_000;
    while (Date.now() < deadline) {
      if (await page.locator('canvas').getAttribute('data-test-checkpoint') === 'Checkpoint reached!') {
        activated = true;
        break;
      }
      await advancePastDanger(page, dangers, progress, 40);
    }
    expect(activated, checkpoint.id).toBe(true);
    // Activation is detected anywhere in the 28px window around the flag, so compare
    // Henry's feet to the terrain beneath him rather than to the flag's own height:
    // the hillside marker sits on a ramp, where those two differ by the slope alone.
    // X and Y come from one status sample, so they describe the same frame.
    const status = await page.locator('#status').innerText();
    const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
    const y = Number(status.match(/Y (\d+)/)?.[1] ?? 0);
    expect(Math.abs(x - checkpoint.x), checkpoint.id).toBeLessThan(90);
    expect(Math.abs(y + DEFAULT_MOVEMENT.height - surfaceY(PLAINS_LEVEL, x))).toBeLessThanOrEqual(2);
    // Walk just past the flag so Henry does not obscure its base in the evidence.
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await info.attach(checkpoint.id, { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });
    await page.waitForTimeout(2000);
    await page.keyboard.down('ArrowRight');
  }
  await page.keyboard.up('ArrowRight');
});

// Record how the HUD is actually drawn, the way #46 was measured, without test-only game state.
const recordHudDraws = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (x === 28 && y === 20 && /^\d+$/.test(text)) document.querySelector('canvas')?.setAttribute('data-test-hud-draw', `${this.textAlign} ${x} ${text}`);
      if (maxWidth === undefined) fillText.call(this, text, x, y);
      else fillText.call(this, text, x, y, maxWidth);
    };
  });
};

test('adventure HUD stays left-aligned through keyboard pause and focus loss', async ({ page }) => {
  await recordHudDraws(page);
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-test-hud-draw', /^left 28 /);
  const resample = async (): Promise<void> => {
    await page.evaluate(() => document.querySelector('canvas')?.removeAttribute('data-test-hud-draw'));
  };
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toHaveText('Paused · Escape to resume');
  await resample();
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await expect(canvas).toHaveAttribute('data-test-hud-draw', /^left 28 /);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#status')).toHaveText('Paused · Return to the game to continue');
  await resample();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  await expect(canvas).toHaveAttribute('data-test-hud-draw', /^left 28 /);
  // The double-digit gem total must fit its own panel, before the hearts at x=85.
  const rightEdge = await canvas.evaluate((element) => {
    const ctx = (element as HTMLCanvasElement).getContext('2d')!;
    ctx.font = 'bold 10px monospace';
    return 28 + ctx.measureText('99').width;
  });
  expect(rightEdge).toBeLessThan(81);
});

test('a collected gem stops being drawn where it stood', async ({ page }, info) => {
  await recordHudDraws(page);
  await page.setViewportSize({ width: 426, height: 300 });
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      if (this.canvas.id === 'game' && args[0] instanceof HTMLImageElement) {
        if (args[0].src.endsWith('/scenery/background.webp')) this.canvas.dataset.gemAnchors = '[]';
        if (args[0].src.endsWith('/assets/gems/gems.png')) {
          const anchors = JSON.parse(this.canvas.dataset.gemAnchors ?? '[]');
          anchors.push([Number(args[5]) + 16, Number(args[6]) + 24]);
          this.canvas.dataset.gemAnchors = JSON.stringify(anchors);
        }
      }
      Reflect.apply(draw, this, args);
    } as typeof draw;
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title', { timeout: 15000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const canvas = page.locator('canvas');
  const gem = PLAINS_LEVEL.entities.find((entity) => entity.id === 'gem-001')!;
  // Near the start the camera is clamped to 0, so the gem's cell keeps one screen rect.
  const cell = { x: gem.x - 24, y: gem.y - 48, size: 48 };
  const readCell = async (): Promise<number[]> => canvas.evaluate((element, rect) =>
    Array.from((element as HTMLCanvasElement).getContext('2d')!.getImageData(rect.x, rect.y, rect.size, rect.size).data), cell);
  const playerX = async (): Promise<number> => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
  const authoredGems = PLAINS_LEVEL.entities.filter(entity => entity.kind === 'gem');
  const missingGemIds = async (): Promise<string[]> => {
    const anchors = JSON.parse((await canvas.getAttribute('data-gem-anchors'))!) as number[][];
    // Draw positions are camera-relative. Calibrate the shared translation from
    // a unique, untouched far gem rather than assuming the camera stayed at zero.
    const reference = authoredGems[authoredGems.length - 1];
    expect(authoredGems.filter(gem => gem.y === reference.y)).toHaveLength(1);
    expect(await playerX() + 24).toBeLessThan(reference.x);
    const referenceDraws = anchors.filter(([, y]) => y === reference.y);
    expect(referenceDraws).toHaveLength(1);
    const cameraX = reference.x - referenceDraws[0][0];
    return authoredGems.filter(gem => !anchors.some(([x, y]) => x + cameraX === gem.x && y === gem.y)).map(gem => gem.id);
  };
  expect(await missingGemIds()).toEqual([]);
  const before = await readCell();
  await expect(canvas).toHaveAttribute('data-test-hud-draw', /left 28 0$/);
  await page.keyboard.down('ArrowRight');
  for (let step = 0; step < 40 && (await playerX()) < 100; step++) await page.waitForTimeout(50);
  // Jump before the gem and stay airborne across it, as #44 reproduced it.
  await page.keyboard.down('Space');
  await page.waitForTimeout(300);
  await page.keyboard.up('Space');
  for (let step = 0; step < 40 && (await playerX()) < gem.x + 40; step++) await page.waitForTimeout(50);
  await page.keyboard.up('ArrowRight');
  const collected = await missingGemIds();
  expect(collected).toContain(gem.id);
  await expect(canvas).toHaveAttribute('data-test-hud-draw', `left 28 ${collected.length}`);
  // Walk back so Henry cannot be standing over the gem's cell when it is sampled.
  await page.keyboard.down('ArrowLeft');
  for (let step = 0; step < 40 && (await playerX()) > 40; step++) await page.waitForTimeout(50);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(150);
  expect(await playerX() + 24).toBeLessThan(cell.x);
  const returnedCollected = await missingGemIds();
  expect(returnedCollected).toEqual(expect.arrayContaining(collected));
  expect(returnedCollected).toContain(gem.id);
  await expect(canvas).toHaveAttribute('data-test-hud-draw', `left 28 ${returnedCollected.length}`);
  await writeFile(info.outputPath('gem-pickup-observations.json'), JSON.stringify({ target: gem.id, collected, returnedCollected, clearCell: cell, playerX: await playerX() }, null, 2));
  const after = await readCell();
  const changed = before.filter((value, index) => value !== after[index]).length;
  expect(changed, 'the collected gem is still drawn').toBeGreaterThan(200);
  await info.attach('gem-001-collected', { body: await canvas.screenshot(), contentType: 'image/png' });
});

test('ground scenery and slimes draw their opaque bases at terrain height', async ({ page }, info) => {
  await page.addInitScript(() => {
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const [image, sx, sy] = args;
      if (image instanceof HTMLImageElement && image.src.endsWith('/scenery/background.webp')) {
        this.canvas.dataset.worldDraws = '[]';
        this.canvas.dataset.slimeDraws = '[]';
      } else if (image instanceof HTMLImageElement && image.src.endsWith('/assets/slimes/slimes.png')) {
        const calls = JSON.parse(this.canvas.dataset.slimeDraws ?? '[]');
        calls.push(args.slice(1));
        this.canvas.dataset.slimeDraws = JSON.stringify(calls);
      } else if (image instanceof HTMLImageElement && image.src.endsWith('/assets/plains/environment.png')) {
        const canvas = this.canvas;
        // The parallax hills precede the entity pass each frame.
        const calls = sx === 96 && sy === 144 ? [] : JSON.parse(canvas.dataset.worldDraws ?? '[]');
        if (!(sx === 96 && sy === 144)) calls.push(args.slice(1));
        canvas.dataset.worldDraws = JSON.stringify(calls);
      }
      Reflect.apply(drawImage, this, args);
    } as typeof drawImage;
  });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await page.keyboard.press('Space');
  const bases = await page.evaluate(async () => {
    const manifest = await (await fetch('/assets/plains/manifest.json')).json();
    const image = new Image();
    image.src = '/assets/plains/' + manifest.image;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const bases: Record<string, number> = {};
    for (const [asset, index] of Object.entries(manifest.assets) as [string, number][]) {
      const pixels = ctx.getImageData(index % 4 * 48, Math.floor(index / 4) * 48, 48, 48).data;
      bases[asset] = 0;
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
        if (pixels[(y * 48 + x) * 4 + 3]) bases[asset] = y + 1;
      }
    }
    const slimeImage = new Image();
    slimeImage.src = '/assets/slimes/slimes.png';
    await slimeImage.decode();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(slimeImage, 0, 0);
    const slimePixels = ctx.getImageData(0, 0, 48, 48).data;
    bases.slime = 0;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      if (slimePixels[(y * 48 + x) * 4 + 3]) bases.slime = y + 1;
    }
    return bases;
  });
  // Starting is consumed by the simulation frame; asset decoding can finish
  // before that frame and leave the miniature map preview in the draw log.
  await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
  const { calls, slimeCalls } = await page.locator('canvas').evaluate((canvas) => ({
    calls: JSON.parse(canvas.getAttribute('data-world-draws') ?? '[]') as number[][],
    slimeCalls: JSON.parse(canvas.getAttribute('data-slime-draws') ?? '[]') as number[][],
  }));
  PLAINS_LEVEL.entities.forEach((entity) => {
    if (entity.kind !== 'decoration' && entity.kind !== 'slime') return;
    // Generated decorative trees/plants/rocks are covered by the scenery test.
    if (entity.kind === 'decoration' && entity.asset !== 'cave') return;
    const call = (entity.kind === 'slime' ? slimeCalls : calls).find((args) => {
      const drawnX = args[4] + 24;
      if (entity.patrol) {
        return args[0] === 0 && args[1] === 0 &&
          drawnX >= entity.patrol.minX && drawnX <= entity.patrol.maxX;
      }
      return drawnX === entity.x && args[6] === 48;
    })!;
    expect(call, entity.id).toBeDefined();
    // Ground art anchors at its horizontal centre, 24px into the 48px cell. A patrolling
    // slime has already walked away from its level X, so check the ground under where it is.
    const drawnX = call[4] + 24;
    if (entity.patrol) {
      expect(drawnX, entity.id).toBeGreaterThanOrEqual(entity.patrol.minX);
      expect(drawnX, entity.id).toBeLessThanOrEqual(entity.patrol.maxX);
    } else {
      expect(drawnX, entity.id).toBeCloseTo(entity.x, 5);
    }
    expect(call[5] + bases[entity.asset], entity.id).toBeCloseTo(surfaceY(PLAINS_LEVEL, drawnX), 5);
  });
  // Frame the new meadow rollers; the input-route captures separately show the orchard slime.
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0),
    { timeout: 5000, intervals: [30] }).toBeGreaterThan(320);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(900);
  const screenshot = info.outputPath('grounded-slime-and-tree.png');
  await page.locator('canvas').screenshot({ path: screenshot });
  await info.attach('grounded-slime-and-tree', { path: screenshot, contentType: 'image/png' });
});

test('Plains renders its panorama and transparent scenery, and Quarry keeps its own backdrop', async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const image = args[0];
      if (image instanceof HTMLImageElement) {
        const source = image.src;
        if (source.endsWith('/scenery/background.webp') || source.endsWith('/trails/backdrops.webp') || (source.endsWith('/environment.png') && args[1] === 48 && args[2] === 48 && Number(args[7]) > 48)) {
          this.canvas.dataset.sceneryDraws = '[]';
        }
        const calls = JSON.parse(this.canvas.dataset.sceneryDraws ?? '[]');
        calls.push({ source, args: args.slice(1) });
        this.canvas.dataset.sceneryDraws = JSON.stringify(calls);
      }
      Reflect.apply(original, this, args);
    } as typeof original;
  });
  await page.setViewportSize({ width: 426, height: 300 });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Playing');
  // The sparse foreground begins at x800; frame that tuft through real input
  // instead of assuming decoration exists in the opening viewport.
  expect((await page.locator('canvas').boundingBox())!.width).toBe(426);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]), { timeout: 5000, intervals: [30] }).toBeGreaterThan(620);
  await page.keyboard.up('ArrowRight'); await page.waitForTimeout(250);
  const calls = JSON.parse(await page.locator('canvas').getAttribute('data-scenery-draws') ?? '[]') as { source: string; args: number[] }[];
  expect(calls[0].source).toContain('/scenery/background.webp');
  const tree = calls.find((call) => call.source.endsWith('/foreground.png') && call.args[0] === 7.25 && call.args[4] > 400)!;
  expect(tree).toBeDefined();
  expect(tree.args[5] + tree.args[7]).toBe(surfaceY(PLAINS_LEVEL, 2100));
  const henryIndex = calls.findIndex((call) => call.source.includes('/henry/'));
  expect(henryIndex).toBeGreaterThan(0);
  expect(calls.slice(henryIndex + 1).some((call) => call.source.endsWith('/foreground.png'))).toBe(true);
  const transparent = await page.evaluate(async () => {
    const image = new Image(); image.src = '/assets/plains/scenery/foreground.png'; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, 1, 1).data[3];
  });
  expect(transparent).toBe(0);
  const screenshot = info.outputPath('plains-scenery-meadow.png');
  await page.locator('canvas').screenshot({ path: screenshot });
  await info.attach('plains-scenery-meadow', { path: screenshot, contentType: 'image/png' });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#status')).toContainText('Title');
  await page.keyboard.down('ArrowRight');
  // Selection changes the title text; the world changes only when Space starts it.
  await page.waitForTimeout(100);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toContainText('Playing');
  const quarryCalls = JSON.parse(await page.locator('canvas').getAttribute('data-scenery-draws') ?? '[]') as { source: string }[];
  expect(quarryCalls.length).toBeGreaterThan(0);
  expect(quarryCalls.some((call) => call.source.includes('/scenery/'))).toBe(false);
});

test('a failed scenery image exposes Retry loading and recovers', async ({ page }) => {
  await page.route('**/assets/plains/scenery/foreground.png', (route) => route.abort());
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  await expect(page.locator('#retry')).toBeVisible();
  const retryBox = (await page.locator('#retry').boundingBox())!;
  const statusBox = (await page.locator('#status').boundingBox())!;
  expect(retryBox.y + retryBox.height).toBeLessThan(statusBox.y);
  await page.unroute('**/assets/plains/scenery/foreground.png');
  await retryToMap(page);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await expect(page.locator('#retry')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
});

for (const [biome, pickerSteps] of [['frost', 4], ['cove', 5]] as const) {
  test(`${biome} trail renders its material, completes and replays`, { lock: 'native-route' }, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D,
        ...args: Parameters<typeof original>) {
        const image = args[0];
        if (image instanceof HTMLImageElement && /\/assets\/(frost|cove)\/environment.png$/.test(image.src)) {
          this.canvas.dataset.biomeAtlas = image.src;
          // Creature cell: track the live drawn Y for the real pause behavior below.
          if (args[1] === 96 && args[2] === 96) this.canvas.dataset.creatureY = String(args[6]);
        }
        Reflect.apply(original, this, args);
      } as typeof original;
    });
    if (biome === 'frost') await installTimberKeyboardPilot(page);
    await openAdventure(page, '/?scene=adventure&debug=1');
    await expect(page.locator('#status')).toContainText('Adventure preview · Title');
    for (let i = 0; i < pickerSteps; i++) {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(100);
      await page.keyboard.up('ArrowRight');
      await page.waitForTimeout(50);
    }
    await page.keyboard.press('Space');
    await expect(page.locator('#status')).toContainText('Playing');
    await expect(page.locator('canvas')).toHaveAttribute('data-biome-atlas', new RegExp(`/assets/${biome}/environment.png$`));
    const position = async (): Promise<number> => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
    const velocity = async (): Promise<number> => Number((await page.locator('#status').innerText()).match(/V (-?\d+)/)?.[1] ?? 0);
    if (biome === 'frost') await driveSunset(page, [...FROST_MAIN.slice(0, 4), { kind: 'walk', x: 2100 }]);
    await page.keyboard.down('ArrowRight');
    await expect.poll(position, { intervals: [20], timeout: 10000 }).toBeGreaterThan(biome === 'frost' ? 2240 : 560);
    if (biome === 'frost') {
      const slideVelocity = await page.evaluate(async () => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
        const start = performance.now();
        await new Promise<void>(resolve => {
          const sample = () => performance.now() - start >= 120 ? resolve() : requestAnimationFrame(sample);
          requestAnimationFrame(sample);
        });
        return Number(document.querySelector('#status')!.textContent!.match(/V (-?\d+)/)?.[1]);
      });
      await page.keyboard.up('ArrowRight');
      expect(slideVelocity).toBeGreaterThan(80);
    } else {
      expect(await velocity()).toBe(176);
      await expect.poll(position, { intervals: [20], timeout: 10000 }).toBeGreaterThan(1750);
      expect(await velocity()).toBe(143);
      await page.keyboard.up('ArrowRight');
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#status')).toContainText('Paused');
    const pausedObservation = async () => page.locator('#status').innerText();
    const frozen = await pausedObservation();
    await page.waitForTimeout(200);
    expect(await pausedObservation()).toBe(frozen);
    const screenshot = info.outputPath(`${biome}-material.png`);
    await page.locator('canvas').screenshot({ path: screenshot });
    await info.attach(`${biome}-material`, { path: screenshot, contentType: 'image/png' });
    await page.keyboard.press('Escape');
    if (biome === 'frost') { await twoFrames(page); await driveSunset(page, FROST_MAIN.slice(4)); }
    else await page.keyboard.down('ArrowRight');
    await expect(page.locator('#status')).toContainText('Finish', { timeout: 85000 });
    await page.keyboard.up('ArrowRight');
    await expect(page.locator('#status')).toContainText(/Gems [1-9]\d*/);
    await expectResultsFirst(page, biome === 'cove' ? 'Map' : 'Next trail');
    await page.waitForTimeout(60);
    await selectReplayWithKeyboard(page);
    await page.keyboard.press('Space');
    await expect(page.locator('#status')).toContainText('Playing');
    expect(await position()).toBe(60);
    await expect(page.locator('canvas')).toHaveAttribute('data-biome-atlas', new RegExp(`/assets/${biome}/environment.png$`));
  });

  test(`${biome} atlas failure is recoverable through retry`, async ({ page }) => {
    const path = `**/assets/${biome}/environment.png`;
    await page.route(path, (route) => route.abort());
    await openAdventure(page, '/?scene=adventure');
    await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
    await page.unroute(path);
    await retryToMap(page);
    await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  });
}

test('movement preview shows distinct friction cues and remains controllable', async ({ page }, info) => {
  await page.goto('/?scene=movement');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cyan = 0;
    let ochre = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] === 128 && pixels[i + 1] === 219 && pixels[i + 2] === 234) cyan++;
      if (pixels[i] === 214 && pixels[i + 1] === 172 && pixels[i + 2] === 99) ochre++;
    }
    return cyan > 10 && ochre > 10;
  })).toBe(true);
  const before = await canvas.screenshot();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await page.goto('/?scene=movement');
  await page.waitForTimeout(300);
  await canvas.screenshot({ path: info.outputPath('surface-friction.png') });
});

test('native HUD hints follow active input and pause controls fit small windows', async ({ page }, info) => {
  await page.setViewportSize({ width: 426, height: 240 });
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons };
    Object.defineProperty(navigator, 'getGamepads', { value: () => pad.connected ? [pad] : [] });
    (window as unknown as { clarityPad: typeof pad }).clarityPad = pad;
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (x === 28 && y === 20 && /^\d+$/.test(text)) this.canvas.dataset.frameText = '';
      this.canvas.dataset.frameText = (this.canvas.dataset.frameText ?? '') + text + '|';
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Title');
  await page.keyboard.press('Space');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-frame-text', /Arrows \/ A-D: move/);
  await info.attach('native-keyboard-hud', { body: await canvas.screenshot(), contentType: 'image/png' });
  await page.evaluate(() => { (window as unknown as { clarityPad: { axes: number[] } }).clarityPad.axes[0] = 1; });
  await expect(canvas).toHaveAttribute('data-frame-text', /Buttons 1–4: jump/);
  await page.evaluate(() => {
    const pad = (window as unknown as { clarityPad: { axes: number[]; buttons: { pressed: boolean }[] } }).clarityPad;
    pad.axes[0] = 0; pad.buttons[9].pressed = true;
  });
  await expect(page.locator('#status')).toContainText('Paused');
  await expect(canvas).toHaveAttribute('data-frame-text', /Stick \/ D-pad: move.*Jump \/ select.*Start.*Resume/);
  await info.attach('native-controller-pause', { body: await canvas.screenshot(), contentType: 'image/png' });
  await page.evaluate(() => {
    (window as unknown as { clarityPad: { connected: boolean } }).clarityPad.connected = false;
    window.dispatchEvent(new Event('gamepaddisconnected'));
  });
  await expect(canvas).toHaveAttribute('data-frame-text', /← →.*Move.*Space.*Jump.*Escape.*Resume/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Playing');
  await expect(canvas).toHaveAttribute('data-frame-text', /Space: jump/);
  await expect(canvas).not.toHaveAttribute('data-frame-text', /checkpoint-|quarry-checkpoint/);
  await page.keyboard.press('Space');
  await expect(canvas).not.toHaveAttribute('data-frame-text', /Space: jump/);
  await page.setViewportSize({ width: 360, height: 240 });
  await page.keyboard.press('Escape');
  await info.attach('small-keyboard-pause', { body: await page.screenshot(), contentType: 'image/png' });
});

test('all six trail previews show cached gameplay and the map requests no story artwork', async ({ page }, info) => {
  test.setTimeout(90_000);
  const storyRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/assets/story/')) storyRequests.push(request.url()); });
  await page.setViewportSize({ width: 426, height: 240 });
  await page.addInitScript(() => {
    const probe = { pixels: undefined as Uint8ClampedArray | undefined };
    Object.assign(window, { trailPreviewProbe: probe });
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (x === 0 && y === 0 && width === 426 && height === 240) this.canvas.dataset.landmarkDraws = '0';
      return fill.call(this, x, y, width, height);
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image: CanvasImageSource, ...coordinates: number[]) {
      if (image instanceof HTMLImageElement && image.src.endsWith('/assets/overworld/landmarks.png')) {
        this.canvas.dataset.landmarkDraws = String(Number(this.canvas.dataset.landmarkDraws ?? 0) + 1);
      }
      const result = Reflect.apply(draw, this, [image, ...coordinates]);
      if (image instanceof HTMLCanvasElement && coordinates.join(',') === '287,84,126,71') {
        // Read the actual scaled draw so GPU/CPU resampling differences cannot affect the comparison.
        probe.pixels = this.getImageData(287, 84, 126, 71).data;
      }
      return result;
    };
  });
  await openAdventure(page, '/?scene=adventure');
  const canvas = page.locator('canvas');
  for (const level of LEVELS) {
    await page.getByRole('button', { name: level.name, exact: true }).click();
    await expect(page.getByRole('button', { name: `Play ${level.name}`, exact: true })).toBeVisible();
    await expect(canvas).toHaveAttribute('data-landmark-draws', '6');
    expect(await canvas.evaluate(async (element) => {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const pixels = (element as HTMLCanvasElement).getContext('2d')!.getImageData(287, 84, 126, 71).data;
      const reference = (window as unknown as { trailPreviewProbe: { pixels?: Uint8ClampedArray } }).trailPreviewProbe.pixels;
      return Boolean(reference && pixels.every((value, index) => value === reference[index]));
    })).toBe(true);
    await info.attach(`${level.id}-map`, { body: await canvas.screenshot({ path: info.outputPath(`${level.id}-map.png`) }), contentType: 'image/png' });
  }
  await page.getByRole('button', { name: 'PLAINS', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Replay story', exact: true })).toHaveCount(0);
  await expect(page.locator('#status')).toContainText('Title');
  expect(storyRequests).toEqual([]);
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 426, height: 240 },
  { width: 320, height: 240 },
]) {
  test(`approved title artwork and menu fit ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await observeTitleSelection(page);
    await page.addInitScript(() => {
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (image: CanvasImageSource, ...coordinates: number[]) {
        if (image instanceof HTMLCanvasElement && coordinates.at(-2) === 126 && coordinates.at(-1) === 71) {
          this.canvas.dataset.previewSmoothing = String(this.imageSmoothingEnabled);
        }
        if (image instanceof HTMLImageElement && image.src.endsWith('/assets/title/tiny-turbo-trails-v2.png')) {
          this.canvas.dataset.titleArtwork = JSON.stringify({
            rect: coordinates, smoothing: this.imageSmoothingEnabled,
            width: image.naturalWidth, height: image.naturalHeight,
          });
        }
        return Reflect.apply(draw, this, [image, ...coordinates]);
      };
    });
    await openAdventure(page, '/?scene=adventure');
    await expect(page.locator('#status')).toContainText('Adventure preview · Title');
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-title-artwork');
    await expect(canvas).toHaveAttribute('data-preview-smoothing', 'true');
    const artwork = JSON.parse((await canvas.getAttribute('data-title-artwork'))!);
    expect(artwork.smoothing).toBe(false);
    expect([artwork.width, artwork.height]).toEqual([282, 154]);
    expect(artwork.rect).toEqual([8, 0, 94, 94 * 154 / 282]);
    expect(artwork.rect[1] + artwork.rect[3]).toBeLessThan(160);
    const box = (await canvas.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + 217 * box.height / 240).toBeLessThanOrEqual(viewport.height);
    await selectNextLevel(page, 'QUARRY RUN');
    await info.attach('title-screen', {
      body: await page.screenshot({ path: info.outputPath(`map-${info.project.name}-${viewport.width}x${viewport.height}.png`) }),
      contentType: 'image/png',
    });
    await canvas.evaluate((element) => delete element.dataset.titleArtwork);
    await page.keyboard.press('Space');
    await expect(page.locator('#status')).toContainText('Adventure preview · Playing');
    await canvas.evaluate((element) => delete element.dataset.titleArtwork);
    await page.waitForTimeout(100);
    await expect(canvas).not.toHaveAttribute('data-title-artwork');
  });
}

test('title artwork failure recovers through the existing retry flow', async ({ page }) => {
  const path = '**/assets/title/tiny-turbo-trails-v2.png';
  await page.route(path, (route) => route.abort());
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute(path);
  await retryToMap(page);
  await expect(page.locator('#status')).toContainText('Adventure preview · Title');
  await expect(page.locator('#retry')).toBeHidden();
});

test('adventure never requests Henry reference art while the art preview requires it', async ({ page }) => {
  let requests = 0;
  await page.route('**/assets/henry/reference.png', route => { requests++; return route.abort(); });
  await openAdventure(page, '/?scene=adventure');
  await expect(page.locator('#status')).toContainText('Adventure preview');
  expect(requests).toBe(0);
  await page.goto('/?scene=art');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  expect(requests).toBe(1);
});

test('finish artwork pixels meet terrain in all six trails, including the sloped beach exit', async ({ page }, info) => {
  await page.goto('/?scene=foundation');
  await page.addScriptTag({ content: `${RENDERER_SOURCE}\nwindow.drawFinishTestWorld = ${drawWorld.toString()};` });
  const results = await page.evaluate(async levels => {
    const image = async (url: string): Promise<HTMLImageElement> => {
      const result = new Image(); result.src = url; await result.decode(); return result;
    };
    const render = (window as unknown as { drawFinishTestWorld: typeof drawWorld }).drawFinishTestWorld;
    const samples = [];
    for (const level of levels) {
      const base = `/assets/${level.atlas}/`;
      const manifest = await (await fetch(`${base}manifest.json`)).json();
      const atlas = await image(`${base}${manifest.image}`);
      const gems = await image('/assets/gems/gems.png');
      const backdrops = await image('/assets/trails/backdrops.webp');
      const materials = await image('/assets/trails/materials.png');
      const panorama = manifest.panorama ? await image(`${base}${manifest.panorama}`) : undefined;
      const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
      const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
      const offset = { x: level.finish.x - 213, y: level.progressAxis === 'y' ? level.finish.y - 180 : 0 };
      const coveTerrain = await (window as unknown as { loadCoveTerrain: typeof loadCoveTerrain }).loadCoveTerrain(base, manifest.terrainKit);
      const coveMaterials = await (window as unknown as { loadCoveMaterials: typeof loadCoveMaterials }).loadCoveMaterials(base, manifest.surfaceKit);
      const assets = { atlas, manifest, gems, backdrops, materials, panorama, coveTerrain, coveMaterials };
      const route = { ...level, entities: [] };
      const fixed = (level.platforms ?? []).filter(platform => platform.from.x === platform.to.x && platform.from.y === platform.to.y)
        .map(platform => ({ id: platform.id, x: platform.from.x, y: platform.from.y,
          width: platform.width, height: 10, vx: 0, vy: 0 }));
      render(ctx, assets, route, { position: offset } as Parameters<typeof drawWorld>[3], undefined, undefined, fixed);
      const world = canvas.toDataURL();
      // Retain only the intercepted finish draw on a transparent canvas.
      const arch = document.createElement('canvas'); arch.width = 426; arch.height = 240;
      const ink = arch.getContext('2d')!; ink.imageSmoothingEnabled = false;
      const finishCalls: { args: unknown[]; matrix: DOMMatrix }[] = [];
      ctx.drawImage = ((...args: unknown[]) => {
        if (args[0] === atlas && args[1] === 0 && args[2] === manifest.cellSize * 3 && args[7] === 96)
          finishCalls.push({ args, matrix: ctx.getTransform() });
      }) as typeof ctx.drawImage;
      render(ctx, assets, route, { position: offset } as Parameters<typeof drawWorld>[3], undefined, undefined, fixed);
      for (const call of finishCalls) { ink.setTransform(call.matrix); Reflect.apply(ink.drawImage, ink, call.args); }
      const pixels = ink.getImageData(0, 0, 426, 240).data;
      const gaps = [];
      for (const [left, right] of [[165, 213], [213, 261]]) {
        let bottom = -1, footX = -1;
        for (let y = 0; y < 240; y++) for (let x = left; x < right; x++) {
          if (pixels[(y * 426 + x) * 4 + 3] >= 128 && y > bottom) { bottom = y; footX = x; }
        }
        const wx = footX + offset.x;
        const surface = level.surfaces.find(s => wx >= s.x1 && wx <= s.x2)!;
        const ground = (level.finish.supportOnly ? level.finish.y
          : surface.y1 + (surface.y2 - surface.y1) * (wx - surface.x1) / (surface.x2 - surface.x1)) - offset.y;
        gaps.push(ground - (bottom + 1));
      }
      const source = document.createElement('canvas'); source.width = 48; source.height = 48;
      const sourceCtx = source.getContext('2d')!;
      sourceCtx.drawImage(atlas, 0, manifest.cellSize * 3, 48, 48, 0, 0, 48, 48);
      const sourcePixels = sourceCtx.getImageData(0, 0, 48, 48).data;
      const columnBottoms = Array.from({ length: 48 }, (_, x) => {
        let bottom = -1;
        for (let y = 0; y < 48; y++) if (sourcePixels[(y * 48 + x) * 4 + 3] >= 128) bottom = y;
        return bottom;
      });
      const supportGaps: number[] = [];
      const call = finishCalls[0];
      for (const start of [0, 24]) {
        const base = Math.max(...columnBottoms.slice(start, start + 24));
        // Stepped pixel feet can have a single lowest pixel; include the adjacent
        // one-source-row tread so partial floating cannot hide behind that pixel.
        const supports = columnBottoms.map((bottom, x) => ({ bottom, x }))
          .filter(column => column.x >= start && column.x < start + 24 && column.bottom >= base - 1);
        if (supports.length < 2) throw new Error(`${level.id}: missing load-bearing foot columns`);
        for (const support of supports) {
          const point = call.matrix.transformPoint(new DOMPoint(Number(call.args[5]) + (support.x + 0.5) * 2, 0));
          const x = Math.floor(point.x);
          let bottom = -1;
          for (let y = 0; y < 240; y++) if (pixels[(y * 426 + x) * 4 + 3] >= 128) bottom = y;
          const wx = x + 0.5 + offset.x;
          const surface = level.surfaces.find(s => wx >= s.x1 && wx <= s.x2)!;
          const ground = (level.finish.supportOnly ? level.finish.y
            : surface.y1 + (surface.y2 - surface.y1) * (wx - surface.x1) / (surface.x2 - surface.x1)) - offset.y;
          supportGaps.push(ground - (bottom + 1));
        }
      }
      samples.push({ id: level.id, gaps, supportGaps, world });
    }
    return samples;
  }, LEVELS);
  for (const result of results) {
    for (const gap of result.gaps) expect(Math.abs(gap), `${result.id} visible foot gap`).toBeLessThanOrEqual(2);
    for (const gap of result.supportGaps) expect(gap, `${result.id} load-bearing column gap`).toBeLessThanOrEqual(2);
    await info.attach(`${result.id}-finish-metrics`, { body: JSON.stringify({ gaps: result.gaps, supportGaps: result.supportGaps }), contentType: 'application/json' });
    await info.attach(`${result.id}-finish-native`, { body: Buffer.from(result.world.split(',')[1], 'base64'), contentType: 'image/png' });
  }
});

// Drive the real input boundary and simulation faster without production test hooks.
async function installTrailPilot(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
    const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons };
    const pilot = { active: false, lastActive: false, controller: false, dangers: [] as number[], index: 0, lastX: 0, jumpUntil: 0, jumping: false, pauseAt: 0, frozen: false, advanceMs: 0, polls: 0, neutralPoll: 0, inputEvents: [] as object[] };
    Object.assign(window, { trailPad: pad, trailPilot: pilot });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => {
      pilot.polls++;
      const neutral = pilot.controller && pad.axes.every(axis => axis === 0) && buttons.every(button => !button.pressed);
      if (neutral) pilot.neutralPoll = pilot.polls;
      pilot.inputEvents.push({ kind: 'poll', time: performance.now(), poll: pilot.polls, neutral,
        controller: pilot.controller, axis: pad.axes[0], status: document.querySelector('#status')?.textContent, buttons: buttons.flatMap((button, index) => button.pressed ? [index] : []) });
      return pilot.controller ? [pad] : [];
    } });
    let previousTime: number | undefined; let presentationTime = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => raf((now) => {
      if (pilot.frozen) { previousTime = now; callback(presentationTime); return; }
      const status = document.querySelector('#status')?.textContent ?? '';
      if (pilot.active) {
        const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
        if (pilot.pauseAt && x >= pilot.pauseAt) {
          pilot.frozen = true; previousTime = now; callback(presentationTime); return;
        }
        if (x < pilot.lastX - 100) pilot.index = Math.max(0, pilot.dangers.findIndex(d => d >= x - 30));
        pilot.lastX = x;
        if (status.includes('Finish')) pilot.active = false;
        else if (pilot.dangers[pilot.index] !== undefined && x >= pilot.dangers[pilot.index] - 65) {
          pilot.jumpUntil = now + 65; pilot.index++;
        }
      }
      const jumping = pilot.active && now < pilot.jumpUntil;
      if (pilot.controller) {
        if (pilot.active) { pad.axes[0] = 1; pad.buttons[0].pressed = jumping; }
        else if (pilot.lastActive) { pad.axes[0] = 0; pad.buttons[0].pressed = false; }
      } else {
        if (pilot.active) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
        else if (pilot.lastActive) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
        if (jumping !== pilot.jumping) window.dispatchEvent(new KeyboardEvent(jumping ? 'keydown' : 'keyup', { code: 'Space' }));
      }
      pilot.jumping = jumping;
      pilot.lastActive = pilot.active;
      presentationTime += pilot.advanceMs; pilot.advanceMs = 0;
      presentationTime += previousTime === undefined ? 0 : (now - previousTime) * (status.includes('Playing') ? 6 : 1);
      previousTime = now;
      callback(presentationTime);
    });
  });
}

/** Arm fresh controller controls only after the actual app has sampled neutral. */
async function acknowledgeTrailNeutral(page: Page): Promise<void> {
  const afterClear = await page.evaluate(() => {
    const state = window as unknown as {
      trailPilot: { active: boolean; controller: boolean; polls: number };
      trailPad: { axes: number[]; buttons: { pressed: boolean }[] };
    };
    Object.assign(state.trailPilot, { active: false, controller: true });
    state.trailPad.axes.fill(0);
    state.trailPad.buttons.forEach(button => { button.pressed = false; });
    return state.trailPilot.polls;
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as {
    trailPilot: { neutralPoll: number };
  }).trailPilot.neutralPoll)).toBeGreaterThan(afterClear);
  await page.evaluate(afterClear => {
    const pilot = (window as unknown as { trailPilot: { neutralPoll: number; inputEvents: object[] } }).trailPilot;
    pilot.inputEvents.push({ kind: 'neutral-ack', time: performance.now(), afterClear, poll: pilot.neutralPoll });
  }, afterClear);
}

test('Timbers roots keep a safe, open first-jump run-up', async ({ page }, info) => {
  const level = LEVELS.find(candidate => candidate.id === 'timbers')!;
  expect(level.entities.filter(entity => entity.kind === 'hazard' || entity.kind === 'slime')).toEqual([]);
  await info.attach('old-prop-inventory-replaced', { body: JSON.stringify({ source: 'level data',
    hazards: level.entities.filter(entity => entity.kind === 'hazard'),
    slimes: level.entities.filter(entity => entity.kind === 'slime') }), contentType: 'application/json' });
  await page.addInitScript(() => {
    const probe = { paints: 0, latest: null as null | { status: string; colors: number[][]; x: number } };
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function(x, y, width, height) {
      fillRect.call(this, x, y, width, height);
      // This is the last of the three interior heart pixels sampled below.
      if (this.canvas.id !== 'game' || x !== 126 || y !== 14 || width !== 1 || height !== 1) return;
      const status = document.querySelector('#status')?.textContent ?? '';
      if (!status.includes('Playing')) return;
      const colors = [94, 110, 126].map(sampleX => Array.from(this.getImageData(sampleX, 14, 1, 1).data).slice(0, 3));
      probe.paints++;
      probe.latest = { status, colors, x: Number(status.match(/X (-?\d+)/)?.[1] ?? NaN) };
    };
    Object.assign(window, { timberHudPaint: probe });
  });
  await openAdventure(page, '/?debug=1');
  await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  const beforePlay = await page.evaluate(() => (window as unknown as { timberHudPaint: { paints: number } }).timberHudPaint.paints);
  expect(beforePlay).toBe(0);
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  await expect.poll(() => page.evaluate(() => (window as unknown as {
    timberHudPaint: { paints: number } }).timberHudPaint.paints)).toBeGreaterThan(0);
  const first = await page.evaluate(() => (window as unknown as { timberHudPaint: {
    paints: number; latest: { status: string; colors: number[][]; x: number } } }).timberHudPaint);
  const full = [1, 3, 5].map(index => Number.parseInt(HUD_COLORS.full.slice(index, index + 2), 16));
  expect(first.latest.colors).toEqual([full, full, full]);
  await info.attach('first-painted-full-hearts', { body: JSON.stringify(first), contentType: 'application/json' });
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0),
    { timeout: 10_000 }).toBeGreaterThan(700);
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => page.evaluate(() => (window as unknown as { timberHudPaint: {
    latest: { x: number } | null } }).timberHudPaint.latest?.x ?? -1)).toBeGreaterThan(700);
  const after = await page.evaluate(() => (window as unknown as { timberHudPaint: {
    paints: number; latest: { status: string; colors: number[][]; x: number } } }).timberHudPaint);
  expect(after.paints).toBeGreaterThan(first.paints);
  expect(after.latest.colors).toEqual(first.latest.colors);
  await info.attach('post-run-painted-full-hearts', { body: JSON.stringify(after), contentType: 'application/json' });
  for (const width of [426, 320]) {
    await page.setViewportSize({ width, height: width === 426 ? 288 : 240 });
    await info.attach(`roots-run-up-${width}`, { body: await page.screenshot({ path: info.outputPath(`roots-run-up-${width}.png`) }), contentType: 'image/png' });
  }
});

/** Observe the shipped ribbon drawing; no production scene or run-state access. */
async function observeTrailRibbon(page: Page): Promise<void> {
  await page.addInitScript(ribbon => {
    const samples = new WeakMap<HTMLCanvasElement, { recording: boolean; points: { x: number; filled: boolean }[] }>();
    const probe = { henryBounds: undefined as { left: number; right: number; top: number; bottom: number } | undefined };
    Object.assign(window, { ribbonProbe: probe });
    const setValue = (canvas: HTMLCanvasElement, key: string, value: string): void => {
      if (canvas.dataset[key] !== value) canvas.dataset[key] = value;
    };
    const clear = (canvas: HTMLCanvasElement): void => {
      setValue(canvas, 'ribbon', 'absent');
      setValue(canvas, 'ribbonCheckpoints', '[]');
      if (canvas.dataset.ribbonMarker !== undefined) delete canvas.dataset.ribbonMarker;
    };
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      let sample = samples.get(this.canvas);
      if (!sample) { sample = { recording: false, points: [] }; samples.set(this.canvas, sample); }
      if (x === 0 && y === 0 && width === 426 && height === 240
        && this.globalAlpha === 1 && typeof this.fillStyle === 'string' && this.fillStyle.startsWith('#')) {
        sample.recording = false;
        const canvas = this.canvas;
        const frame = sample;
        // Decide absence after the complete synchronous render, from drawing
        // itself, without toggling DOM attributes at the start of every frame.
        queueMicrotask(() => { if (!frame.recording) clear(canvas); });
      }
      if (x === ribbon.x && y === ribbon.y && width === ribbon.width && height === ribbon.height) {
        sample.recording = true;
        sample.points = [];
      }
      if (sample.recording) {
        if (width === 3 && height === 4 && y === ribbon.railY) {
          sample.points.push({ x: x + 1, filled: this.fillStyle === '#ffda75' });
        }
        if (y === ribbon.y && width === 7 && height === 7) {
          // Publish one complete sample, only on changes, so tracing DOM mutations
          // does not slow the simulation by recording every intermediate tick.
          setValue(this.canvas, 'ribbon', 'present');
          setValue(this.canvas, 'ribbonCheckpoints', JSON.stringify(sample.points));
          setValue(this.canvas, 'ribbonMarker', String(x + 3));
        }
      }
      fillRect.call(this, x, y, width, height);
    };
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const [image] = args;
      // The ribbon's generated plaque backing starts each sample with its top-left corner slice.
      if (image instanceof HTMLImageElement && image.src.endsWith('/assets/interface/plaque.png') && args.length === 9
        && args[5] === ribbon.x && args[6] === ribbon.y) {
        let sample = samples.get(this.canvas);
        if (!sample) { sample = { recording: false, points: [] }; samples.set(this.canvas, sample); }
        sample.recording = true;
        sample.points = [];
      }
      if (image instanceof HTMLImageElement && image.src.endsWith('/assets/henry/henry-celebration.png') && args.length === 9) {
        const transform = this.getTransform();
        const from = transform.transformPoint(new DOMPoint(Number(args[5]), Number(args[6])));
        const to = transform.transformPoint(new DOMPoint(Number(args[5]) + Number(args[7]), Number(args[6]) + Number(args[8])));
        // Keep frame-by-frame geometry in memory, avoiding DOM tracing overhead.
        probe.henryBounds = {
          left: Math.min(from.x, to.x), right: Math.max(from.x, to.x),
          top: Math.min(from.y, to.y), bottom: Math.max(from.y, to.y),
        };
      }
      Reflect.apply(drawImage, this, args);
    } as typeof drawImage;
  }, TRAIL_RIBBON);
}

/** Capture actual result drawing without exposing simulation state to the browser. */
async function observeRewardResults(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text === 'TRAIL COMPLETE!') this.canvas.dataset.finishRewards = '[]';
      if (text === 'PATCHWORK VALE') this.canvas.dataset.mapRewards = '[]';
      const result = y === 76 ? text.match(/^(?:GEMS|STARS) (\d+\/\d+)$/)?.[1] : text;
      if ((y === 76 || y === 174) && result && /^\d+\/\d+$/.test(result)) {
        const key = y === 76 ? 'finishRewards' : 'mapRewards';
        const row = JSON.parse(this.canvas.dataset[key] ?? '[]') as string[];
        row.push(result); this.canvas.dataset[key] = JSON.stringify(row);
      }
      if (maxWidth === undefined) fillText.call(this, text, x, y);
      else fillText.call(this, text, x, y, maxWidth);
    };
  });
}

// Timbers' full vertical route is exercised by timbers-ascent.spec.ts.
for (const [index, level] of LEVELS.entries()) {
  if (level.id === 'timbers') continue;
  test(`milestone ${level.name}: pointer selection, full route, return, replay and next`, async ({ page }, info) => {
    test.setTimeout(100_000);
    if (level.id === 'quarry') {
      await startQuarryPilot(page); await driveQuarry(page, QUARRY_DESCENT); await quarryFinish(page);
      await page.getByRole('button', { name: 'Replay', exact: true }).click();
      await expect(page.locator('#status')).toContainText('X 300 Y 106');
      await driveQuarry(page, QUARRY_DESCENT); await quarryFinish(page);
      await page.getByRole('button', { name: 'Next trail', exact: true }).click();
      await expect(page.locator('#status')).toContainText('Playing');
      return;
    }
    await installTrailPilot(page);
    if (level.id === 'sunset') await installTimberKeyboardPilot(page);
    await observeRewardResults(page);
    await observeTrailRibbon(page);
    if (level.id === 'plains') await page.setViewportSize({ width: 426, height: 300 });
    await openAdventure(page, '/?debug=1');
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-map-rewards', '[]');
    await expect(canvas).toHaveAttribute('data-ribbon', 'absent');
    await page.getByRole('button', { name: level.name, exact: true }).click();
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    const expectFreshRibbon = async (): Promise<void> => {
      await expect(canvas).toHaveAttribute('data-ribbon', 'present');
      await expect(canvas).toHaveAttribute('data-ribbon-marker', String(TRAIL_RIBBON.startX));
      const points = JSON.parse((await canvas.getAttribute('data-ribbon-checkpoints'))!) as { x: number; filled: boolean }[];
      expect(points.map(point => point.x)).toEqual(level.checkpoints.map(point =>
        Math.round(TRAIL_RIBBON.startX + trailPosition(level, point.x) * (TRAIL_RIBBON.finishX - TRAIL_RIBBON.startX))));
      expect(points.every(point => !point.filled)).toBe(true);
    };
    await expectFreshRibbon();
    const captureRibbon = async (state: string): Promise<void> => {
      for (const width of [426, 320]) {
        // Leave room for the 48px control footer so 426 is truly native scale.
        await page.setViewportSize({ width, height: width === 426 ? 288 : 240 });
        await page.waitForTimeout(50);
        const bounds = await canvas.boundingBox();
        expect(bounds!.width).toBeCloseTo(width);
        expect(bounds!.height).toBeCloseTo(width * 240 / 426);
        const path = info.outputPath(`${level.id}-ribbon-${state}-${width}.png`);
        await page.screenshot({ path });
        await info.attach(`ribbon-${state}-${width}`, { path, contentType: 'image/png' });
      }
      await page.setViewportSize(level.id === 'plains' ? { width: 426, height: 300 } : { width: 1366, height: 768 });
      await twoFrames(page);
      if (level.id === 'plains') { expect((await canvas.boundingBox())!.width).toBe(426); expect((await canvas.boundingBox())!.height).toBe(240); }
    };
    await captureRibbon('start');
    if (level.id === 'sunset') await driveSunset(page, SUNSET_FIRST);
    else {
    await page.evaluate(({ dangers, pauseAt }) => {
      Object.assign((window as unknown as { trailPilot: object }).trailPilot, { active: true, dangers, pauseAt });
    }, { dangers: dangerXs(level), pauseAt: level.checkpoints[0].x + 40 });
    await page.waitForFunction(() => (window as unknown as { trailPilot: { frozen: boolean } }).trailPilot.frozen, undefined, { timeout: 15_000 });
    }
    const checkpointPoints = JSON.parse((await canvas.getAttribute('data-ribbon-checkpoints'))!) as { filled: boolean }[];
    expect(checkpointPoints.map(point => point.filled)).toEqual(level.checkpoints.map((_, i) => i === 0));
    const checkpointX = Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1]);
    const expectedMarker = TRAIL_RIBBON.startX + trailPosition(level, checkpointX) * (TRAIL_RIBBON.finishX - TRAIL_RIBBON.startX);
    // Debug X and the pixel marker are independently rounded.
    expect(Math.abs(Number(await canvas.getAttribute('data-ribbon-marker')) - expectedMarker)).toBeLessThanOrEqual(1);
    await captureRibbon('checkpoint');
    await page.evaluate(() => Object.assign((window as unknown as { trailPilot: object }).trailPilot, { active: false, frozen: false, pauseAt: 0 }));
    // The old Sunset valley is retired. This live yard capture is route evidence;
    // the nonvacuous vertical-band/horizontal-clearance obligation is exercised
    // separately by the explicitly labelled compact HUD renderer fixture below.
    if (level.id === 'sunset') {
      await driveSunset(page, SUNSET_CROSS);
      await captureRibbon('lower-yard');
    }
    const traverse = async (): Promise<void> => {
      if (level.id === 'sunset') {
        const status = await page.locator('#status').innerText();
        await driveSunset(page, status.includes('Y 586') ? [...SUNSET_FINAL, { kind: 'finish' }] : SUNSET_MAIN);
        await expect(canvas).toHaveAttribute('data-ribbon', 'absent');
        await expectResultsFirst(page, 'Next trail');
        return;
      }
      if (index % 2 === 1) await acknowledgeTrailNeutral(page);
      await page.evaluate(({ dangers, controller }) => {
        const pilot = (window as unknown as { trailPilot: { active: boolean; controller: boolean; dangers: number[]; index: number; lastX: number } }).trailPilot;
        Object.assign(pilot, { active: true, controller, dangers, index: 0, lastX: 0 });
      }, { dangers: dangerXs(level), controller: index % 2 === 1 });
      await expect(page.locator('#status')).toContainText('Finish', { timeout: 35_000 });
      await expect(canvas).toHaveAttribute('data-ribbon', 'absent');
      await expectResultsFirst(page, index < LEVELS.length - 1 ? 'Next trail' : 'Map');
      // Stop the input pilot explicitly: a quick menu action can replace Finish
      // before its next RAF notices completion, leaving movement held in a new run.
      await page.evaluate(() => new Promise<void>(resolve => {
        const state = window as unknown as {
          trailPilot: { active: boolean; lastActive: boolean; jumping: boolean; jumpUntil: number };
          trailPad: { axes: number[]; buttons: { pressed: boolean }[] };
        };
        Object.assign(state.trailPilot, { active: false, lastActive: false, jumping: false, jumpUntil: 0 });
        state.trailPad.axes[0] = 0;
        state.trailPad.buttons.forEach(button => { button.pressed = false; });
        for (const code of ['ArrowRight', 'Space']) window.dispatchEvent(new KeyboardEvent('keyup', { code }));
        requestAnimationFrame(start => {
          const releasedFrame = (now: number): void => {
            if (now - start >= 50) resolve();
            else requestAnimationFrame(releasedFrame);
          };
          requestAnimationFrame(releasedFrame);
        });
      }));
    };
    const finishAction = async (label: string): Promise<void> => {
      if (index % 3 === 0) { await page.getByRole('button', { name: label, exact: true }).click(); return; }
      // Default first; moving through Build your word never opens it.
      const labels = index < LEVELS.length - 1 ? ['Next trail', 'Map', 'Build your word', 'Replay'] : ['Map', 'Build your word', 'Replay'];
      const steps = labels.indexOf(label);
      const controller = index % 3 === 2;
      await page.evaluate(controller => {
        (window as unknown as { trailPilot: { controller: boolean } }).trailPilot.controller = controller;
      }, controller);
      for (let step = 0; step < steps; step++) {
        const selected = labels[step + 1];
        if (controller) {
          await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[15].pressed = true; });
          await expect(page.getByRole('button', { name: selected, exact: true })).toHaveAttribute('aria-pressed', 'true');
          await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[15].pressed = false; });
        } else {
          await page.keyboard.down('ArrowRight');
          await expect(page.getByRole('button', { name: selected, exact: true })).toHaveAttribute('aria-pressed', 'true');
          await page.keyboard.up('ArrowRight');
        }
        // Let neutral input reach simulation before sending the next edge.
        await releasedFrames(page);
        await expect(page.getByRole('dialog')).toHaveCount(0);
      }
      await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
      if (controller) {
        await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = true; });
        await expect(page.locator('#status')).not.toContainText('Finish');
        await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = false; });
      } else {
        await page.keyboard.down('Space');
        await expect(page.locator('#status')).not.toContainText('Finish');
        await page.keyboard.up('Space');
      }
    };
    await traverse();
    const gemTotal = level.entities.filter(entity => entity.kind === 'gem').length;
    const starTotal = level.entities.filter(entity => entity.kind === 'special').length;
    const collected = Number((await page.locator('#status').innerText()).match(/Gems (\d+)/)?.[1]);
    await expect(canvas).toHaveAttribute('data-finish-rewards', new RegExp(`^\\["${collected}/${gemTotal}"${starTotal ? `,"[0-3]/${starTotal}"` : ''}\\]$`));
    const rewards = JSON.parse((await canvas.getAttribute('data-finish-rewards'))!) as string[];
    const stars = starTotal ? Number(rewards[1].split('/')[0]) : 0;
    const captureResults = async (state: string): Promise<void> => {
      for (const width of [426, 320]) {
        await page.setViewportSize({ width, height: 240 });
        await page.screenshot({ path: info.outputPath(`${level.id}-${state}-${width}.png`) });
        await info.attach(`${state}-${width}`, { path: info.outputPath(`${level.id}-${state}-${width}.png`), contentType: 'image/png' });
      }
      await page.setViewportSize(level.id === 'plains' ? { width: 426, height: 300 } : { width: 1366, height: 768 });
      await twoFrames(page);
      if (level.id === 'plains') { expect((await canvas.boundingBox())!.width).toBe(426); expect((await canvas.boundingBox())!.height).toBe(240); }
    };
    await captureResults('finish-results');
    await info.attach('finish', { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });
    await finishAction('Map');
    await expect(canvas).toHaveAttribute('data-ribbon', 'absent');
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-description',
      `Session best: ${collected} of ${gemTotal} gems${starTotal ? `, ${stars} of ${starTotal} stars` : ''}`);
    await expect(canvas).toHaveAttribute('data-map-rewards', JSON.stringify(rewards));
    await captureResults('map-results');
    await info.attach('completed-map', { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });
    // Replay after a second completion checks the browser-visible reset independently of unit state checks.
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await expectFreshRibbon();
    await traverse();
    await finishAction('Replay');
    await expect(page.locator('#status')).toContainText('Playing');
    await expect(page.locator('#status')).toContainText(`X ${level.start.x}`);
    await expectFreshRibbon();
    await traverse();
    if (index < LEVELS.length - 1) {
      await finishAction('Next trail');
      const next = LEVELS[index + 1];
      expect(hasFixedSupport(next, next.start)).toBe(true);
      await expect(page.locator('#status')).toContainText(`Playing · Letter bag: 0/4 · X ${next.start.x} Y ${next.start.y - DEFAULT_MOVEMENT.height} V 0`);
      await expect(canvas).toHaveAttribute('data-ribbon-marker', String(TRAIL_RIBBON.startX));
      expect(JSON.parse((await canvas.getAttribute('data-ribbon-checkpoints'))!).every((point: { filled: boolean }) => !point.filled)).toBe(true);
    } else await expect(page.getByRole('button', { name: 'Next trail', exact: true })).toHaveCount(0);
    await reloadToMap(page);
    await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-description', 'Ready to explore');
    await expect(canvas).toHaveAttribute('data-map-rewards', '[]');
  });
}

test('overworld input stays usable and missing decorative sheets do not block a full route', async ({ page }) => {
  test.setTimeout(60_000);
  await installTrailPilot(page);
  await openAdventure(page, '/');
  await page.getByRole('button', { name: 'SANDY COVE', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'SANDY COVE', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    const state = window as unknown as { trailPilot: { controller: boolean }; trailPad: { buttons: { pressed: boolean }[] } };
    state.trailPilot.controller = true; state.trailPad.buttons[15].pressed = true;
  });
  await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    const state = window as unknown as { trailPad: { buttons: { pressed: boolean }[] } };
    state.trailPad.buttons[15].pressed = false; state.trailPad.buttons[0].pressed = true;
  });
  await expect(page.locator('#status')).toContainText('Playing');
  await page.route('**/assets/trails/materials.png', route => route.abort());
  await page.route('**/assets/trails/backdrops.webp', route => route.abort());
  await openAdventure(page, '/?scene=adventure&debug=1');
  await expect(page.locator('#retry')).toBeHidden();
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  await page.evaluate(dangers => {
    const pilot = (window as unknown as { trailPilot: { active: boolean; controller: boolean; dangers: number[]; index: number; lastX: number } }).trailPilot;
    Object.assign(pilot, { active: true, controller: false, dangers, index: 0, lastX: 0 });
  }, dangerXs(PLAINS_LEVEL));
  await expect(page.locator('#status')).toContainText('Finish', { timeout: 35_000 });
});

test('textured flats and slopes keep authored grip above cosmetic materials', async ({ page }, info) => {
  await page.goto('/?scene=foundation');
  await page.addScriptTag({ content: `${RENDERER_SOURCE}\nwindow.drawTerrainTestWorld = ${drawWorld.toString()};` });
  const result = await page.evaluate(async (base) => {
    const manifest = await (await fetch('/assets/plains/manifest.json')).json();
    const atlas = new Image(); atlas.src = `/assets/plains/${manifest.image}`; await atlas.decode();
    const gems = new Image(); gems.src = '/assets/gems/gems.png'; await gems.decode();
    const materials = new Image(); materials.src = '/assets/trails/materials.png'; await materials.decode();
    const level = { ...base, entities: [], theme: { ...base.theme, scenery: false, parallax: [] }, surfaces: [
      { x1: 0, x2: 100, y1: 190, y2: 150, friction: 0.6 },
      { x1: 100, x2: 200, y1: 150, y2: 150, friction: 1 },
      { x1: 200, x2: 310, y1: 150, y2: 190, friction: 1.4 },
      { x1: 310, x2: 500, y1: 190, y2: 190, material: 'ice', friction: 0.6 },
    ] };
    const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
    const ctx = canvas.getContext('2d')!;
    const render = (window as unknown as { drawTerrainTestWorld: typeof drawWorld }).drawTerrainTestWorld;
    const samples = [];
    for (const x of [0, 0.25, 19.5, 40, 19.5, 0.25, 0]) {
      render(ctx, { atlas, manifest, materials, gems }, level as typeof base, { position: { x, y: 0 } } as Parameters<typeof drawWorld>[3]);
      const pixels = ctx.getImageData(0, 140, 426, 65).data;
      let cyan = 0, ochre = 0, streaks = 0, grains = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const rgb = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`;
        if (rgb === '128,219,234') cyan++;
        if (rgb === '214,172,99') ochre++;
        if (rgb === '230,255,255') streaks++;
        if (rgb === '114,80,45') grains++;
      }
      samples.push({ cyan, ochre, streaks, grains });
    }
    return { samples, image: canvas.toDataURL() };
  }, PLAINS_LEVEL);
  // At fractional camera offsets each 2x2 grain may contain only one fully opaque pixel.
  for (const sample of result.samples) {
    expect(sample.cyan).toBeGreaterThan(400); expect(sample.ochre).toBeGreaterThan(200);
    expect(sample.streaks).toBeGreaterThan(40); expect(sample.grains).toBeGreaterThan(7);
  }
  await info.attach('textured-grip', { body: Buffer.from(result.image.split(',')[1], 'base64'), contentType: 'image/png' });
});

test('every destination accepts keyboard and standard-controller selection and start', async ({ page }) => {
  await installTrailPilot(page);
  for (const controller of [false, true]) for (const [index, level] of LEVELS.entries()) {
    await openAdventure(page, '/?debug=1');
    await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(controller => { (window as unknown as { trailPilot: { controller: boolean } }).trailPilot.controller = controller; }, controller);
    for (let step = 0; step < index; step++) {
      if (controller) {
        await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[15].pressed = true; });
        await page.waitForTimeout(60);
        await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[15].pressed = false; });
      } else await page.keyboard.press('ArrowRight', { delay: 60 });
      await page.waitForTimeout(60);
    }
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    if (controller) await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = true; });
    else await page.keyboard.press('Space', { delay: 60 });
    await expect(page.locator('#status')).toContainText('Playing');
    await expect(page.locator('#status')).toContainText(`X ${level.start.x}`);
  }
});

// Input-only star pilot: observes the shipped debug position and dispatches the
// same keyboard events as a player. No scene access, teleports or reward writes.
// Timbers' branch rewards have their own vertical route and spring witnesses.
for (const [index, level] of LEVELS.slice(0, 3).entries()) {
  if (level.id === 'timbers') continue;
  test(`signature ${level.name}: nine-star route, native/small evidence and fresh navigation`, async ({ page }, info) => {
    test.setTimeout(120_000);
    if (level.id === 'quarry') {
      await startQuarryPilot(page); await driveQuarry(page, QUARRY_STARS); await quarryFinish(page);
      await info.attach('quarry-star-route', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
      await page.getByRole('button', { name: 'Replay', exact: true }).click();
      await expect(page.locator('#status')).toContainText('X 300 Y 106');
      return;
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ id, dangers }) => {
      const pilot = { active: false, pauseAt: 0, frozen: false, lastX: 0, index: 0, jumpUntil: 0, docked: false, rode: false, time: 0, signboards: [] as string[], downhill: false };
      Object.assign(window, { starPilot: pilot });
      const originalText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
        if (x === 168 && y === 20 && /^\d+\/\d+$/.test(text)) this.canvas.dataset.stars = text;
        if (/^(STAR SLOPE >|SAFE RUNOUT|STAR LIFT >|SAFE RETURN|SPRING STARS >|LAND [1-3])$/.test(text)) pilot.signboards.push(text);
        return maxWidth === undefined ? originalText.call(this, text, x, y) : originalText.call(this, text, x, y, maxWidth);
      };
      const raf = requestAnimationFrame.bind(window);
      let last = 0;
      window.requestAnimationFrame = callback => raf(now => {
        if (pilot.frozen) { last = now; callback(pilot.time); return; }
        const status = document.querySelector('#status')?.textContent ?? '';
        const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
        const y = Number(status.match(/Y (-?\d+)/)?.[1] ?? 0);
        const vx = Number(status.match(/V (-?\d+)/)?.[1] ?? 0);
        let horizontal = 0;
        let jump = false;
        if (pilot.active && status.includes('Playing')) {
          horizontal = 1;
          if (x < pilot.lastX - 100) pilot.index = Math.max(0, dangers.findIndex(d => d >= x - 30));
          pilot.lastX = x;
          if (dangers[pilot.index] !== undefined && x >= dangers[pilot.index] - 65) {
            pilot.jumpUntil = pilot.time + 400; pilot.index++;
          }
          if (id === 'plains') {
            if (!pilot.downhill && x >= 1065) { pilot.downhill = true; pilot.jumpUntil = pilot.time + 400; }
            const collected = Number((document.querySelector('canvas')?.dataset.stars ?? '').match(/^(\d+)/)?.[1] ?? 0);
            if (x >= 1840 && collected < 2) {
              const stop = x + Math.sign(vx) * vx ** 2 / 2400;
              horizontal = stop < 1927 ? 1 : stop > 1933 ? -1 : 0;
              if (Math.abs(x - 1930) < 6 && y + 34 >= 222 && pilot.time >= pilot.jumpUntil) pilot.jumpUntil = pilot.time + 400;
            }
          }
          if (id === 'timbers') for (const [target, required] of [[4850, 2], [8400, 3]]) {
            const collected = Number((document.querySelector('canvas')?.dataset.stars ?? '').match(/^(\d+)/)?.[1] ?? 0);
            if (x < target - 95 || collected >= required) continue;
            const stop = x + Math.sign(vx) * vx ** 2 / 2400;
            horizontal = stop < target - 3 ? 1 : stop > target + 3 ? -1 : 0;
            const ground = target === 4850 ? 150 : 160;
            pilot.jumpUntil = y + 34 < ground - 4 ? pilot.time + 40 : 0;
            break;
          }
          jump = pilot.time < pilot.jumpUntil;
          if (pilot.pauseAt && x >= pilot.pauseAt) {
            pilot.frozen = true;
            callback(pilot.time); return;
          }
        }
        if (!pilot.active || status.includes('Finish')) { horizontal = 0; jump = false; }
        for (const [code, down] of [['ArrowRight', horizontal > 0], ['ArrowLeft', horizontal < 0], ['Space', jump]] as const) {
          window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
        }
        // Match the existing input pilot's accelerated wall clock outside the
        // challenge area; the production clock still integrates fixed steps.
        const near = id === 'plains' ? [[1000, 1320], [1650, 2030], [2680, 3100]].some(([l, r]) => x > l && x < r) : [[850, 1180], [4750, 5120], [8300, 8680]].some(([left, right]) => x > left && x < right);
        pilot.time += Math.min(now - (last || now), 32) * (near ? 1 : 4); last = now;
        callback(pilot.time);
      });
    }, { id: level.id, dangers: dangerXs(level) });
    await page.setViewportSize({ width: 426, height: 300 });
    await twoFrames(page);
    await openAdventure(page, '/?debug=1');
    expect((await page.locator('canvas').boundingBox())!.width).toBe(426);
    await page.getByRole('button', { name: level.name, exact: true }).click();
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-stars', '0/3');
    const stops = index === 0 ? [1300, 1990, 2940] : index === 1 ? [2290, 2490] : [910, 1140, 4800, 4970, 8350, 8570];
    const capture = async (name: string): Promise<void> => {
      for (const width of [426, 320]) {
        await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
        await page.waitForTimeout(50);
        await page.screenshot({ path: info.outputPath(`${level.id}-${name}-${width}.png`) });
        await info.attach(`${name}-${width}`, { path: info.outputPath(`${level.id}-${name}-${width}.png`), contentType: 'image/png' });
      }
      await page.setViewportSize({ width: 426, height: 300 });
      await twoFrames(page);
      expect((await page.locator('canvas').boundingBox())!.width).toBe(426);
    };
    for (const x of stops) {
      await page.evaluate(x => {
        const pilot = (window as unknown as { starPilot: { active: boolean; frozen: boolean; pauseAt: number } }).starPilot;
        Object.assign(pilot, { active: true, frozen: false, pauseAt: x });
      }, x);
      await page.waitForFunction(() => (window as unknown as { starPilot: { frozen: boolean } }).starPilot.frozen, undefined, { timeout: 35_000, polling: 100 });
      await capture(`challenge-${stops.indexOf(x) + 1}`);
    }
    await page.evaluate(() => { Object.assign((window as unknown as { starPilot: object }).starPilot, { active: true, frozen: false, pauseAt: 0 }); });
    await expect(page.locator('#status')).toContainText('Finish', { timeout: 75_000 });
    await expectResultsFirst(page);
    await expect(page.locator('canvas')).toHaveAttribute('data-stars', '3/3');
    expect(await page.evaluate(() => (window as unknown as { starPilot: { signboards: string[] } }).starPilot.signboards)).toEqual([]);
    for (const width of [426, 320]) {
      await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
      await page.screenshot({ path: info.outputPath(`${level.id}-finish-${width}.png`) });
      await info.attach(`finish-${width}`, { path: info.outputPath(`${level.id}-finish-${width}.png`), contentType: 'image/png' });
      for (const label of ['Next trail', 'Map', 'Build your word', 'Replay']) await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    await page.evaluate(() => { Object.assign((window as unknown as { starPilot: object }).starPilot, { active: false }); });
    await page.getByRole('button', { name: ['Replay', 'Next trail', 'Map'][index], exact: true }).click();
    if (index === 2) await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-stars', '0/3');
    await reloadToMap(page);
    await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-stars', '0/3');
    expect(errors).toEqual([]);
  });
}

/** Startup lands directly on the trail map (or the retry screen); never a picture story. */
/** Trail results come first: no activity covers them, and word building is an explicit choice beside the default. */
async function expectResultsFirst(page: Page, defaultAction: 'Next trail' | 'Map' = 'Next trail', timeout?: number): Promise<void> {
  await expect(page.getByRole('button', { name: 'Build your word', exact: true })).toBeVisible(timeout === undefined ? undefined : { timeout });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: defaultAction, exact: true })).toHaveAttribute('aria-pressed', 'true');
}

const releasedFrames = (page: Page) => page.evaluate(() => new Promise<void>(resolve => {
  requestAnimationFrame(start => {
    const releasedFrame = (now: number): void => {
      if (now - start >= 50) resolve();
      else requestAnimationFrame(releasedFrame);
    };
    requestAnimationFrame(releasedFrame);
  });
}));

/** Replay sits left of the default action. A real held ArrowLeft selects it once neutral input has rearmed the results. */
async function selectReplayWithKeyboard(page: Page): Promise<void> {
  await releasedFrames(page);
  await page.keyboard.down('ArrowLeft');
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.up('ArrowLeft');
  await releasedFrames(page);
}

/**
 * Opens word building deliberately from the results: a pointer click, Tab focus and Enter, or real arrow/D-pad
 * steps to the highlighted Build your word action and a held Space/face press that acts once.
 */
async function openWordActivity(page: Page, method: 'pointer' | 'keyboard' | 'controller',
  { pad = 'trailPad', keyboard = 'arrows' }: { pad?: string; keyboard?: 'arrows' | 'tab' } = {}): Promise<void> {
  const build = page.getByRole('button', { name: 'Build your word', exact: true });
  const press = (button: number, pressed: boolean) => page.evaluate(({ pad, button, pressed }) => {
    (window as unknown as Record<string, { buttons: { pressed: boolean }[] }>)[pad].buttons[button].pressed = pressed;
  }, { pad, button, pressed });
  if (method === 'pointer') await build.click();
  else if (method === 'keyboard' && keyboard === 'tab') {
    for (let step = 0; step < 8 && !await build.evaluate(button => button === document.activeElement); step++) await page.keyboard.press('Tab');
    await expect(build).toBeFocused();
    await expect(build).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
  } else {
    if (method === 'controller' && pad === 'trailPad') await page.evaluate(() => { (window as unknown as { trailPilot: { controller: boolean } }).trailPilot.controller = true; });
    await releasedFrames(page);
    for (let step = 0; step < 4 && await build.getAttribute('aria-pressed') !== 'true'; step++) {
      const before = await page.locator('.trail-menu button[aria-pressed="true"]').getAttribute('aria-label');
      if (method === 'controller') await press(15, true); else await page.keyboard.down('ArrowRight');
      await expect(page.locator('.trail-menu button[aria-pressed="true"]')).not.toHaveAttribute('aria-label', before!);
      if (method === 'controller') await press(15, false); else await page.keyboard.up('ArrowRight');
      await releasedFrames(page);
    }
    await expect(build).toHaveAttribute('aria-pressed', 'true');
    if (method === 'controller') await press(0, true); else await page.keyboard.down('Space');
    await expect(page.getByRole('dialog')).toBeVisible();
    // The held confirmation must not also act inside the activity: selection and progress stay unchanged.
    const activityState = () => page.evaluate(() => ({ status: document.querySelector('#status')!.textContent!.replace(/ · (Muted|M to).*$/, ''),
      selected: document.querySelector('.trail-menu button[aria-pressed="true"]')?.getAttribute('aria-label'),
      labels: [...document.querySelectorAll('.trail-menu button')].map(button => button.getAttribute('aria-label')) }));
    const opened = await activityState();
    await releasedFrames(page);
    expect(await activityState()).toEqual(opened);
    if (method === 'controller') await press(0, false); else await page.keyboard.up('Space');
    await releasedFrames(page);
    expect(await activityState()).toEqual(opened);
  }
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function waitForMap(page: Page): Promise<void> {
  await expect(page.locator('#status')).not.toContainText('Loading artwork', { timeout: 15000 });
  await expect(page.locator('#status')).not.toContainText('Story');
}
async function openAdventure(page: Page, url: string): Promise<void> {
  await page.goto(url); await waitForMap(page);
}
async function reloadToMap(page: Page): Promise<void> {
  await page.reload(); await waitForMap(page);
}

async function retryToMap(page: Page): Promise<void> {
  // Retry reloads the document. Wait for that navigation before inspecting status,
  // otherwise the old error page can be mistaken for a finished loading screen.
  await Promise.all([page.waitForEvent('load'), page.locator('#retry').click()]);
  await waitForMap(page);
}

for (const level of LEVELS.slice(3)) {
  test(`${level.id} panorama appears in the map and pans during keyboard play`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        const image = args[0];
        if (image instanceof HTMLImageElement && /\/assets\/(site|frost|cove)\/background\.png$/.test(image.src)) {
          this.canvas.dataset.panorama = image.src;
          this.canvas.dataset.panoramaX = String(args[1]);
          this.canvas.dataset.repeatedHills = '0';
        } else if (image instanceof HTMLCanvasElement && image.dataset.panorama) {
          this.canvas.dataset.panorama = image.dataset.panorama;
        } else if (image instanceof HTMLImageElement && /\/assets\/(site|frost|cove)\/environment\.png$/.test(image.src)
          && args[1] === 96 && args[2] === 144 && Number(args[7]) > 48) {
          this.canvas.dataset.repeatedHills = String(Number(this.canvas.dataset.repeatedHills ?? 0) + 1);
        }
        Reflect.apply(original, this, args);
      } as typeof original;
    });
    await openAdventure(page, '/?debug=1');
    await page.getByRole('button', { name: level.name, exact: true }).click();
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-panorama', new RegExp(`/assets/${level.atlas}/background.png$`));
    await info.attach(`${level.id}-map`, { body: await canvas.screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await expect(page.locator('#status')).toContainText('Playing');
    await expect(canvas).toHaveAttribute('data-panorama-x', '0');
    await page.keyboard.down('ArrowRight');
    await expect.poll(async () => Number(await canvas.getAttribute('data-panorama-x'))).toBeGreaterThan(2);
    await page.keyboard.up('ArrowRight');
    await expect(canvas).toHaveAttribute('data-repeated-hills', '0');
    await info.attach(`${level.id}-background-playing`, { body: await canvas.screenshot(), contentType: 'image/png' });
    expect(errors).toEqual([]);
  });

  test(`${level.id} panorama failure recovers through Retry loading`, async ({ page }) => {
    const path = `**/assets/${level.atlas}/background.png`;
    await page.route(path, route => route.abort());
    await page.goto('/');
    await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
    await page.unroute(path);
    await retryToMap(page);
    await expect(page.getByRole('button', { name: level.name, exact: true })).toBeVisible();
  });
}


test('trail map supports keyboard, pointer and controller without timed screens or repeated starts', async ({ page }, info) => {
  await installTrailPilot(page);
  await page.goto('/?debug=1');
  const canvas = page.locator('canvas');
  const status = page.locator('#status');
  await waitForMap(page);
  // Nothing advances on a timer: the map waits for the player.
  await page.waitForTimeout(500);
  await expect(status).toContainText('Title');
  await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('m');
  await page.keyboard.press('Escape');
  await expect(status).toContainText('Paused');
  await expect(page.getByRole('button', { name: 'Play PLAINS' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(status).toContainText('Title');
  await page.getByRole('button', { name: 'QUARRY RUN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play QUARRY RUN' })).toBeVisible();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => {
    const state = window as unknown as { trailPilot: { controller: boolean }; trailPad: { buttons: { pressed: boolean }[] } };
    state.trailPilot.controller = true; state.trailPad.buttons[14].pressed = true;
  });
  await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[14].pressed = false; });
  // A held Space on a focused native control acts once and never also starts the selected trail.
  await page.getByRole('button', { name: 'Open stickers', exact: true }).focus();
  await page.keyboard.down('Space');
  await expect(page.getByRole('button', { name: 'Return to map', exact: true })).toBeVisible();
  await page.waitForTimeout(200);
  await expect(status).not.toContainText('Playing');
  await page.keyboard.up('Space');
  await page.getByRole('button', { name: 'Return to map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play PLAINS' })).toBeVisible();
  await expect(status).toContainText('Title');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = true; });
  await expect(status).toContainText('Playing');
  await expect(status).toContainText('X 60');
  await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = false; });
  await expect(canvas).toHaveAttribute('aria-label', /Letter bag|Tiny Turbo Trails game/);
  await info.attach('map-start-play', { body: await canvas.screenshot(), contentType: 'image/png' });
});

test('celebration freezes for pause and focus, then accepts finish actions during playback', async ({ page }, info) => {
  test.setTimeout(60_000);
  await installTrailPilot(page);
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      Reflect.apply(draw, this, args);
      const values = args as unknown as (number | HTMLImageElement)[];
      if (values[0] instanceof HTMLImageElement && values[0].src.endsWith('/henry-celebration.png') &&
          values.length === 9 && Number(values[2]) >= 192 && Number(values[5]) === 256) {
        const pose = 16 + (Number(values[2]) - 192) / 48 * 4 + Number(values[1]) / 48;
        this.canvas.dataset.celebrationPose = String(pose);
        if (pose === 18 && !this.canvas.dataset.celebrationPaused) {
          this.canvas.dataset.celebrationPaused = 'yes';
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' }));
        }
      }
    };
  });
  await page.addInitScript(() => {
    // Plains finishes like every trail: its landmark tile at the finish rect and the ordinary message.
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const values = args as unknown as (number | HTMLImageElement)[];
      if (values[0] instanceof HTMLImageElement && values[0].src.endsWith('/assets/overworld/landmarks.png') && values.slice(5).join(',') === '88,90,80,66') {
        this.canvas.dataset.finishLandmark = `${values[1]},${values[2]}`;
      }
      return Reflect.apply(draw, this, args);
    };
    const text = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, value: string, ...rest: [number, number, number?]) {
      if (/explored|friend|picture/i.test(value)) this.canvas.dataset.finishMessage = value;
      return text.call(this, value, ...rest);
    };
  });
  await openAdventure(page, '/?debug=1');
  await page.getByRole('button', { name: 'Play PLAINS' }).click();
  await page.evaluate(dangers => {
    Object.assign((window as unknown as { trailPilot: object }).trailPilot, { active: true, dangers });
  }, dangerXs(LEVELS[0]));
  // The celebration plays straight away: no activity covers it, so the pose-18 pause fires on the results.
  await expect(page.locator('#status')).toContainText('Paused', { timeout: 35000 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const canvas = page.locator('canvas');
  const pose = await canvas.getAttribute('data-celebration-pose');
  expect(Number(pose)).toBeLessThan(23);
  await page.waitForTimeout(350);
  expect(await canvas.getAttribute('data-celebration-pose')).toBe(pose);
  await page.keyboard.press('Escape');
  await expect(page.locator('#status')).toContainText('Finish');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#status')).toContainText('Return to the game');
  const focusPose = await canvas.getAttribute('data-celebration-pose');
  expect(Number(focusPose)).toBeLessThan(23);
  await page.waitForTimeout(350);
  expect(await canvas.getAttribute('data-celebration-pose')).toBe(focusPose);
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#status')).toContainText('Finish');
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeVisible();
  await expectResultsFirst(page);
  await expect(canvas).toHaveAttribute('data-finish-message', 'Another trail explored!');
  await expect(canvas).toHaveAttribute('data-finish-landmark', '0,0');
  await expect(page.getByRole('button', { name: 'View reunion picture', exact: true })).toHaveCount(0);
  await expect(page.locator('.trail-menu button')).toHaveCount(4);
  await page.keyboard.press('r');
  await expect(page.locator('#status')).toContainText('Finish');
  await expect(canvas).toHaveAttribute('aria-label', 'Tiny Turbo Trails game');
  await info.attach('plains-ordinary-finish', { body: await canvas.screenshot(), contentType: 'image/png' });
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  await info.attach('replay-during-celebration', { body: await canvas.screenshot(), contentType: 'image/png' });
});

test('celebration preview preserves gameplay pixels and final pose under reduced motion', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?scene=art&animation=celebrate');
  await expect(page.locator('#status')).toContainText('Art preview');
  const same = await page.evaluate(async () => {
    const images = await Promise.all(['starter.png', 'henry-celebration.png'].map(async file => {
      const image = new Image(); image.src = '/assets/henry/' + file; await image.decode(); return image;
    }));
    const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 192;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(images[0], 0, 0); const before = ctx.getImageData(0, 0, 192, 192).data;
    ctx.clearRect(0, 0, 192, 192); ctx.drawImage(images[1], 0, 0);
    return ctx.getImageData(0, 0, 192, 192).data.every((value, i) => value === before[i]);
  });
  expect(same).toBe(true);
  const still = await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(350);
  expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(still);
  await info.attach('celebration-art-reduced', { body: await page.locator('canvas').screenshot(), contentType: 'image/png' });
});

for (const [costume, level] of [...LEVELS.entries()].filter(([, level]) => level.entities.some(entity => entity.kind === 'slime'))) {
  test(`${level.id} uses the common slime atlas, patrols and pauses in play`, async ({ page }, info) => {
    test.setTimeout(45_000);
    await page.addInitScript((sky) => {
      const fillRect = CanvasRenderingContext2D.prototype.fillRect;
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
        if (x === 0 && y === 0 && w === 426 && h === 240 && this.fillStyle === sky) this.canvas.dataset.liveSlimes = '[]';
        return fillRect.call(this, x, y, w, h);
      };
      CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        if (args[0] instanceof HTMLImageElement && args[0].src.endsWith('/assets/slimes/slimes.png')) {
          const calls = JSON.parse(this.canvas.dataset.liveSlimes ?? '[]');
          calls.push(args.slice(1));
          this.canvas.dataset.liveSlimes = JSON.stringify(calls);
        }
        Reflect.apply(drawImage, this, args);
      } as typeof drawImage;
    }, level.theme.sky);
    await openAdventure(page, '/?debug=1');
    await page.getByRole('button', { name: level.name, exact: true }).click();
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    const canvas = page.locator('canvas');
    const read = async (): Promise<number[][]> => JSON.parse(await canvas.getAttribute('data-live-slimes') ?? '[]');
    await expect.poll(async () => (await read()).length).toBe(level.entities.filter(e => e.kind === 'slime').length);
    const initial = await read();
    for (const call of initial) expect([call[0], call[1], call[2], call[3], call[6], call[7]]).toEqual([costume * 48, 0, 48, 48, 48, 48]);
    await expect.poll(async () => (await read())[0][4]).not.toBe(initial[0][4]);
    const first = level.entities.find(e => e.kind === 'slime')!;
    // Walk to a clear viewing distance through the actual controls.
    const position = async (): Promise<number> => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1] ?? 0);
    await page.keyboard.down('ArrowRight');
    await expect.poll(position, { timeout: 15_000, intervals: [30] }).toBeGreaterThan(first.x - 120);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(350);
    const evidence = info.outputPath(`${level.id}-slime.png`);
    await canvas.screenshot({ path: evidence });
    await info.attach(`${level.id}-slime`, { path: evidence, contentType: 'image/png' });
    await page.keyboard.press('Escape');
    await expect(page.locator('#status')).toContainText('Paused');
    const frozen = await read();
    await page.waitForTimeout(200);
    expect(await read()).toEqual(frozen);
    await page.keyboard.press('Escape');
    await expect(page.locator('#status')).toContainText('Playing');
    await expect.poll(async () => (await read())[0][4]).not.toBe(frozen[0][4]);
  });
}

test('slime atlas keeps identical bodies, transparent borders and ground anchors', async ({ page }) => {
  await page.goto('/?scene=foundation');
  const result = await page.evaluate(async () => {
    const image = new Image(); image.src = '/assets/slimes/slimes.png'; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const bodies = [], bases = [], borders = [];
    for (let cell = 0; cell < 6; cell++) {
      const data = ctx.getImageData(cell * 48, 0, 48, 48).data;
      let base = 0, border = 0;
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
        if (data[(y * 48 + x) * 4 + 3]) {
          base = y + 1;
          if (x === 0 || x === 47 || y === 0 || y === 47) border++;
        }
      }
      bases.push(base); borders.push(border);
      // Compare the shared body strip that every accessory leaves uncovered.
      bodies.push(Array.from(ctx.getImageData(cell * 48 + 8, 28, 5, 16).data));
    }
    return { width: image.width, height: image.height, bodies, bases, borders };
  });
  expect([result.width, result.height]).toEqual([288, 48]);
  expect(result.bases).toEqual([44, 44, 44, 44, 44, 44]);
  expect(result.borders).toEqual([0, 0, 0, 0, 0, 0]);
  for (const body of result.bodies) expect(body).toEqual(result.bodies[0]);
});

for (const asset of ['slimes/slimes', 'gems/gems', 'spelling/pouch', 'spelling/tile', ...TRAIL_WORDS.map(config => `spelling/${config.id}-sticker`),
  ...Object.keys(INTERFACE_PIECES).map(name => `interface/${name}`)]) test(`shared ${asset} atlas failure is recoverable through retry`, async ({ page }) => {
  await page.route(`**/assets/${asset}.png`, route => route.abort());
  await page.goto('/?debug=1');
  await expect(page.getByRole('button', { name: /Retry/i })).toBeVisible();
  await page.unroute(`**/assets/${asset}.png`);
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: /Retry/i }).click()]);
  await waitForMap(page);
  await expect(page.locator('#status')).toContainText('Title');
});

for (const name of ['tile', 'frost-sticker']) test(`spelling ${name} artwork rejects wrong dimensions and recovers through retry`, async ({ page }) => {
  const path = `**/assets/spelling/${name}.png`;
  await page.route(path, async route => {
    const response = await route.fetch({ url: route.request().url().replace(`${name}.png`, 'pouch.png') });
    await route.fulfill({ response });
  });
  await page.goto('/');
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute(path); await retryToMap(page);
  await expect(page.locator('#status')).toContainText('Title');
});

/**
 * Records real glyph bounds (measureText actualBoundingBox*) for game-canvas text drawn over a
 * generated kit piece, against that piece's quiet interior reconstructed from its own corner-slice
 * draws. A full-screen fill (scrim or new frame) starts a new layer.
 */
async function observeKitTextClearance(page: Page): Promise<void> {
  await page.addInitScript(pieces => {
    type Rect = { piece: string; x: number; y: number; right: number; bottom: number; quiet: { left: number; top: number; right: number; bottom: number } };
    const rects: Rect[] = [];
    let pending: { piece: string; x: number; y: number; left: number; top: number } | undefined;
    const probe = { checked: [] as string[], violations: [] as unknown[] };
    Object.assign(window, { kitTextProbe: probe });
    // Ownership is per rendered frame: clear before every animation-frame callback.
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(time => { rects.length = 0; pending = undefined; callback(time); });
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (this.canvas.id === 'game' && x === 0 && y === 0 && width === 426 && height === 240) rects.length = 0;
      fillRect.call(this, x, y, width, height);
    };
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const [image] = args;
      const name = image instanceof HTMLImageElement ? image.src.match(/\/assets\/interface\/([a-z-]+)\.png$/)?.[1] : undefined;
      // Spelling tiles carry their own glyphs over any kit piece beneath them (e.g. letter flights over the bag).
      if (this.canvas.id === 'game' && image instanceof HTMLImageElement && image.src.endsWith('/assets/spelling/tile.png') && args.length === 5) {
        const [dx, dy, dw, dh] = args.slice(1).map(Number);
        rects.push({ piece: 'spelling-tile', x: dx, y: dy, right: dx + dw, bottom: dy + dh, quiet: { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity } });
      }
      if (this.canvas.id === 'game' && name && args.length === 9) {
        const [sx, sy, sw, sh, dx, dy, dw, dh] = args.slice(1).map(Number);
        const size = (pieces as Record<string, { width: number; height: number }>)[name];
        if (sx === 0 && sy === 0) pending = { piece: name, x: dx, y: dy, left: sw, top: sh };
        if (pending?.piece === name && sx + sw === size.width && sy + sh === size.height) {
          rects.push({ piece: name, x: pending.x, y: pending.y, right: dx + dw, bottom: dy + dh,
            quiet: { left: pending.x + pending.left, top: pending.y + pending.top, right: dx + dw - sw, bottom: dy + dh - sh } });
          pending = undefined;
        }
      }
      Reflect.apply(drawImage, this, args);
    } as typeof drawImage;
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.id === 'game' && text.trim()) {
        // The innermost (latest) kit piece under the text anchor owns its clearance.
        const owner = [...rects].reverse().find(rect => x >= rect.x && x <= rect.right && y >= rect.y && y <= rect.bottom);
        const transform = this.getTransform();
        const successText = /^(WORD COMPLETE!|Done: return to trail results|(?:HILL|ROCK|Tree|BEAM|SNOW|SAND) sticker earned!)$/.test(text);
        if (successText && transform.isIdentity) {
          const metrics = this.measureText(text);
          const box = { left: x - metrics.actualBoundingBoxLeft, right: x + metrics.actualBoundingBoxRight, top: y - metrics.actualBoundingBoxAscent, bottom: y + metrics.actualBoundingBoxDescent };
          const key = `${text}|canvas`;
          if (!probe.checked.includes(key)) probe.checked.push(key);
          if (box.left < 0 || box.right > 426 || box.top < 0 || box.bottom > 240 || (box.left < 241 && box.right > 185 && box.top < 158 && box.bottom > 102)) probe.violations.push({ key, box });
        }
        if (owner && owner.piece !== 'spelling-tile' && transform.isIdentity) {
          const metrics = this.measureText(text);
          const box = { left: x - metrics.actualBoundingBoxLeft, right: x + metrics.actualBoundingBoxRight,
            top: y - metrics.actualBoundingBoxAscent, bottom: y + metrics.actualBoundingBoxDescent };
          const key = `${text}|${owner.piece}`;
          if (!probe.checked.includes(key)) probe.checked.push(key);
          const { quiet } = owner;
          if (box.left < quiet.left || box.right > quiet.right || box.top < quiet.top || box.bottom > quiet.bottom) {
            if (!probe.violations.some(entry => (entry as { key: string }).key === key)) probe.violations.push({ key, font: this.font, box, quiet });
          }
        }
      }
      if (maxWidth === undefined) fillText.call(this, text, x, y); else fillText.call(this, text, x, y, maxWidth);
    };
  }, INTERFACE_PIECES);
}

const kitTextProbe = (page: Page) => page.evaluate(() => (window as unknown as { kitTextProbe: { checked: string[]; violations: unknown[] } }).kitTextProbe);
const twoFrames = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
async function captureNativeAndSmall(page: Page, info: import('@playwright/test').TestInfo, name: string): Promise<void> {
  for (const viewport of [{ width: 426, height: 300 }, { width: 320, height: 240 }]) {
    await page.setViewportSize(viewport); await twoFrames(page); await twoFrames(page);
    await page.screenshot({ path: info.outputPath(`${name}-${viewport.width}.png`) });
  }
}

test('kit text clears generated rims for keyboard and controller prompts at native and small sizes', async ({ page }, info) => {
  await observeKitTextClearance(page);
  await page.addInitScript(() => {
    const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    Object.assign(window, { kitPad: pad, kitPadOn: false });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => (window as unknown as { kitPadOn: boolean }).kitPadOn ? [pad] : [] });
  });
  const tap = async (button: number) => {
    await page.evaluate(index => { Object.assign(window, { kitPadOn: true }); (window as unknown as { kitPad: { buttons: { pressed: boolean; value: number }[] } }).kitPad.buttons[index].pressed = true; }, button);
    await twoFrames(page);
    await page.evaluate(index => { (window as unknown as { kitPad: { buttons: { pressed: boolean }[] } }).kitPad.buttons[index].pressed = false; }, button);
    await twoFrames(page);
  };
  await openAdventure(page, '/');
  await captureNativeAndSmall(page, info, 'map-keyboard');
  await page.getByRole('button', { name: 'Open stickers', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await twoFrames(page);
  await page.getByRole('button', { name: 'Return to map', exact: true }).click(); await twoFrames(page);
  await page.getByRole('button', { name: /^Play / }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  await captureNativeAndSmall(page, info, 'hud-keyboard-move');
  await page.keyboard.down('ArrowRight'); await twoFrames(page); await page.keyboard.up('ArrowRight');
  await expect.poll(async () => (await kitTextProbe(page)).checked.includes('Space: jump|plaque')).toBe(true);
  await captureNativeAndSmall(page, info, 'hud-keyboard-jump');
  await page.keyboard.press('Escape'); await twoFrames(page);
  await page.keyboard.press('t'); await twoFrames(page);
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await twoFrames(page);
  await page.keyboard.press('Escape'); await twoFrames(page);
  // Controller: the HUD switches to controller prompts, then a fresh run teaches movement.
  await tap(15);
  await expect.poll(async () => (await kitTextProbe(page)).checked.includes('Buttons 1–4: jump|plaque')).toBe(true);
  await tap(9); await twoFrames(page);
  await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to Trails', exact: true }).click();
  await page.getByRole('button', { name: 'Return to Trails', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Title');
  await tap(15);
  await captureNativeAndSmall(page, info, 'map-controller');
  await tap(0);
  await expect(page.locator('#status')).toContainText('Playing');
  await expect.poll(async () => (await kitTextProbe(page)).checked.includes('Stick / D-pad: move|plaque')).toBe(true);
  await captureNativeAndSmall(page, info, 'hud-controller-move');
  const { checked, violations } = await kitTextProbe(page);
  await writeFile(info.outputPath('kit-text-clearance.json'), JSON.stringify({ checked, violations }, null, 2));
  await info.attach('kit-text-clearance', { path: info.outputPath('kit-text-clearance.json'), contentType: 'application/json' });
  for (const key of ['STICKERS|button', 'Arrows / A-D: move|plaque', 'Space: jump|plaque', 'Buttons 1–4: jump|plaque', 'Stick / D-pad: move|plaque',
    'PAUSED|panel', 'LEAVE THIS TRAIL?|panel', 'Resume|button-selected', 'Return to Trails|button', 'Return to map|button-selected', 'PLAY|button-selected']) {
    expect(checked).toContain(key);
  }
  expect(checked.some(key => /^\d\/6 · .*E.*\|button$/.test(key))).toBe(true);
  expect(checked.some(key => /^\d\/6 · .*D-pad.*\|button$/.test(key))).toBe(true);
  expect(violations).toEqual([]);
});

test('kit text clears generated rims on the real assembly and finish results', { lock: 'native-route' }, async ({ page }, info) => {
  await observeKitTextClearance(page);
  await installTrailPilot(page);
  await openAdventure(page, '/?debug=1');
  await page.getByRole('button', { name: /^Play / }).click();
  await page.evaluate(dangers => Object.assign((window as unknown as { trailPilot: object }).trailPilot, { active: true, dangers }), dangerXs(PLAINS_LEVEL));
  await expectResultsFirst(page, 'Next trail', 25_000);
  await page.evaluate(() => Object.assign((window as unknown as { trailPilot: object }).trailPilot, { active: false, lastActive: false }));
  await page.keyboard.up('ArrowRight');
  await captureNativeAndSmall(page, info, 'finish');
  await openWordActivity(page, 'pointer');
  await captureNativeAndSmall(page, info, 'assembly');
  await page.getByRole('button', { name: 'Leave activity', exact: true }).click();
  await expectResultsFirst(page);
  await captureNativeAndSmall(page, info, 'finish-after-activity');
  const { checked, violations } = await kitTextProbe(page);
  await writeFile(info.outputPath('kit-text-clearance.json'), JSON.stringify({ checked, violations }, null, 2));
  await info.attach('kit-text-clearance', { path: info.outputPath('kit-text-clearance.json'), contentType: 'application/json' });
  for (const key of ['Leave activity|button', '_|button', 'TRAIL COMPLETE!|panel', 'Next trail|button-selected', 'Map|button', 'Build your word|button', 'Replay|button', 'Build your word|button-selected']) expect(checked).toContain(key);
  expect(violations).toEqual([]);
});

test('interface panel artwork rejects wrong dimensions and recovers through retry', async ({ page }) => {
  const path = '**/assets/interface/panel.png';
  await page.route(path, async route => {
    const response = await route.fetch({ url: route.request().url().replace('panel.png', 'plaque.png') });
    await route.fulfill({ response });
  });
  await page.goto('/');
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute(path); await retryToMap(page);
  await expect(page.locator('#status')).toContainText('Title');
});

test('illustrated pause panel draws generated art behind live text with aligned targets and kit feedback controls', async ({ page }, info) => {
  await openAdventure(page, '/');
  await page.getByRole('button', { name: /^Play / }).click();
  await expect(page.locator('#status')).toContainText('Playing');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  const sample = () => page.locator('canvas').evaluate((element, panel) => {
    const ctx = (element as HTMLCanvasElement).getContext('2d')!;
    const at = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data];
    // Timber mid-edge, interior, scrim outside the panel, and each button face beside its label.
    return { wood: at(panel.x + 4, panel.y + 100), interior: at(panel.x + 20, panel.y + 40), scrim: at(10, 120),
      resume: at(53 + 9, 62 + 15), leave: at(53 + 9, 99 + 15) };
  }, PAUSE_PANEL);
  const isWood = ([r, g, b]: number[]) => r > 170 && g > 90 && g < 210 && b < 110 && r > g && g > b;
  const isGold = ([r, g, b]: number[]) => r > 200 && g > 160 && b < 150;
  const isSlate = ([r, g, b]: number[]) => r < 110 && b >= r && g < 140;
  let pixels = await sample();
  expect(isWood(pixels.wood)).toBe(true);
  expect(pixels.interior[0] + pixels.interior[1] + pixels.interior[2]).toBeLessThan(200);
  expect(isWood(pixels.scrim)).toBe(false);
  expect(isGold(pixels.resume)).toBe(true); expect(isSlate(pixels.leave)).toBe(true);
  // Hold until a polled frame sees the direction, as in the other pause tests.
  await page.keyboard.down('ArrowRight');
  await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.up('ArrowRight');
  await expect.poll(async () => { pixels = await sample(); return isGold(pixels.leave) && isSlate(pixels.resume); }).toBe(true);
  for (const viewport of [{ width: 426, height: 300 }, { width: 320, height: 240 }]) {
    await page.setViewportSize(viewport);
    // Let the resize observer and a rendered frame apply the new layout before measuring.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expectClearViewport(page);
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')!.getBoundingClientRect();
      return { canvas: { x: canvas.left, y: canvas.top, width: canvas.width },
        buttons: Array.from(document.querySelectorAll<HTMLButtonElement>('.trail-menu button')).map(button => {
          const box = button.getBoundingClientRect(); return { label: button.getAttribute('aria-label'), x: box.left, y: box.top, width: box.width, height: box.height };
        }),
        controls: ['#pause'].map(selector => {
          const element = document.querySelector<HTMLElement>(selector)!, style = getComputedStyle(element);
          return { image: style.borderImageSource, width: element.offsetWidth, height: element.offsetHeight };
        }) };
    });
    const scale = geometry.canvas.width / 426;
    expect(geometry.buttons.map(button => button.label)).toEqual(['Resume', 'Return to Trails', 'Sound', 'Controller rumble']);
    geometry.buttons.forEach((button, index) => {
      const [x, y, width] = [[53, 62, 320], [53, 99, 320], [53, 136, 155], [218, 136, 155]][index];
      expect(button.x).toBeCloseTo(geometry.canvas.x + x * scale, 0);
      expect(button.y).toBeCloseTo(geometry.canvas.y + y * scale, 0);
      expect(button.width).toBeCloseTo(width * scale, 0); expect(button.height).toBeCloseTo(30 * scale, 0);
    });
    // Planks are drawn inside the unchanged feedback button boxes.
    for (const control of geometry.controls) expect(control.image).toContain('assets/interface/button.png');
    expect(geometry.controls.map(({ width, height }) => [width >= 64 || width === 44, height])).toEqual([[true, 36]]);
    await page.screenshot({ path: info.outputPath(`illustrated-pause-${viewport.width}.png`) });
  }
});

test('approved spelling sprites have native sizes, real transparency and clear cell borders', async ({ page }) => {
  await page.goto('/?scene=foundation');
  const result = await page.evaluate(async names => {
    const samples = [];
    for (const name of names) {
      const image = new Image(); image.src = `/assets/spelling/${name}.png`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = 0, transparent = 0, border = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const alpha = pixels[(y * canvas.width + x) * 4 + 3];
        if (alpha) visible++; else transparent++;
        if (alpha && (x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1)) border++;
      }
      samples.push({ name, size: [canvas.width, canvas.height], visible, transparent, border });
    }
    return samples;
  }, ['pouch', 'tile', ...TRAIL_WORDS.map(config => `${config.id}-sticker`)]);
  expect(result.map(sample => sample.size)).toEqual([[28, 28], [42, 32], ...TRAIL_WORDS.map(() => [56, 56])]);
  for (const sample of result) {
    expect(sample.visible).toBeGreaterThan(0); expect(sample.transparent).toBeGreaterThan(0); expect(sample.border).toBe(0);
  }
});

test('ordinary gems share visible bounds and silhouette across all six trails', async ({ page }, info) => {
  await page.goto('/?scene=foundation');
  await page.addScriptTag({ content: `window.gemUnderTest = ${drawGem.toString()}; window.starUnderTest = ${drawSpecial.toString()};` });
  const samples = await page.evaluate(async (atlases) => {
    const gemImage = new Image(); gemImage.src = '/assets/gems/gems.png'; await gemImage.decode();
    const api = window as unknown as { gemUnderTest: typeof drawGem; starUnderTest: typeof drawSpecial };
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const sample = (): { mask: number[]; bounds: number[]; center: number[] } => {
      const pixels = ctx.getImageData(0, 0, 64, 64).data;
      const mask: number[] = [];
      let left = 64, top = 64, right = -1, bottom = -1;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const alpha = pixels[(y * 64 + x) * 4 + 3];
        mask.push(alpha);
        if (alpha) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
      }
      return { mask, bounds: [left, top, right, bottom], center: [...pixels.slice((32 * 64 + 32) * 4, (32 * 64 + 32) * 4 + 4)] };
    };
    const gems = atlases.map(atlas => { ctx.clearRect(0, 0, 64, 64); api.gemUnderTest(ctx, gemImage, 32, 48, atlas); return sample(); });
    ctx.clearRect(0, 0, 64, 64); api.starUnderTest(ctx, 32, 32);
    return { gems, star: sample() };
  }, LEVELS.map(level => level.atlas));
  for (const gem of samples.gems) {
    expect(gem.bounds).toEqual([16, 24, 47, 47]);
    expect(gem.mask).toEqual(samples.gems[0].mask);
    expect(gem.mask).not.toEqual(samples.star.mask);
  }
  expect(samples.gems[4].center).not.toEqual(samples.gems[0].center);
  expect(samples.gems[5].center).not.toEqual(samples.gems[0].center);
  await page.screenshot({ path: info.outputPath('gem-foundation.png') });
});

// Diagnostic only: preserve the existing one-shot fullscreen test above unchanged.
// Keep the raw frame history even when an existing geometry assertion fails.
test('diagnostic fullscreen frame geometry across repeated native transitions', async ({ page, browser }, info) => {
  await installTrailPilot(page);
  await openAdventure(page, '/');
  test.skip(!await page.evaluate(() => document.fullscreenEnabled), 'Fullscreen unavailable in this browser environment');
  await page.evaluate(() => {
    const samples: object[] = [];
    let cycle = 0;
    let phase = 'ready';
    let frame = 0;
    const rectangle = (element: Element | null) => element?.getBoundingClientRect().toJSON() ?? null;
    const sample = (reason: string): void => {
      const main = document.querySelector<HTMLElement>('main')!;
      const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
      const controls = document.querySelector('.feedback-controls');
      const visual = window.visualViewport;
      samples.push({ reason, cycle, phase, frame, time: performance.now(),
        fullscreen: document.fullscreenElement?.tagName ?? null,
        innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio,
        screen: { width: screen.width, height: screen.height, availWidth: screen.availWidth, availHeight: screen.availHeight },
        visual: visual ? { width: visual.width, height: visual.height, offsetLeft: visual.offsetLeft, offsetTop: visual.offsetTop, scale: visual.scale } : null,
        main: { clientWidth: main.clientWidth, clientHeight: main.clientHeight, rectangle: rectangle(main) },
        canvas: { rectangle: rectangle(canvas), style: canvas.getAttribute('style'), width: canvas.width, height: canvas.height },
        controls: rectangle(controls),
        targets: Array.from(document.querySelectorAll<HTMLButtonElement>('.trail-menu button')).map(button => {
          const bounds = button.getBoundingClientRect();
          return { label: button.getAttribute('aria-label'), rectangle: bounds.toJSON(),
            clickable: document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2) === button };
        }),
        scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      });
    };
    Object.assign(window, { fullscreenDiagnostic: { samples,
      mark(nextCycle: number, nextPhase: string): void { cycle = nextCycle; phase = nextPhase; sample('mark'); },
      sample,
    } });
    window.addEventListener('resize', () => sample('resize'));
    document.addEventListener('fullscreenchange', () => sample('fullscreenchange'));
    window.visualViewport?.addEventListener('resize', () => sample('visual-resize'));
    const observe = (): void => { frame++; sample('animation-frame'); requestAnimationFrame(observe); };
    sample('installed');
    requestAnimationFrame(observe);
  });
  const mark = async (cycle: number, phase: string): Promise<void> => page.evaluate(({ cycle, phase }) => {
    (window as unknown as { fullscreenDiagnostic: { mark(cycle: number, phase: string): void } }).fullscreenDiagnostic.mark(cycle, phase);
  }, { cycle, phase });
  const captureFrames = async (): Promise<void> => page.evaluate(() => new Promise<void>(resolve => {
    let frames = 0;
    const next = (): void => { if (++frames === 32) resolve(); else requestAnimationFrame(next); };
    requestAnimationFrame(next);
  }));
  try {
    for (let cycle = 1; cycle <= 8; cycle++) {
      await mark(cycle, 'request-enter');
      await page.locator('#pause').evaluate(button => {
        button.addEventListener('click', () => {
          const probe = (window as unknown as { fullscreenDiagnostic: { sample(reason: string): void } }).fullscreenDiagnostic;
          probe.sample('request-start');
          void document.querySelector('main')!.requestFullscreen().then(
            () => probe.sample('request-resolved'), () => probe.sample('request-rejected'));
        }, { once: true });
      });
      await page.locator('#pause').click();
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe('MAIN');
      await mark(cycle, 'after-fullscreen-element');
      await captureFrames();
      await expectClearViewport(page);
      await page.screenshot({ path: info.outputPath(`fullscreen-cycle-${cycle}-entered.png`) });
      await mark(cycle, 'request-exit');
      await page.evaluate(() => document.exitFullscreen());
      await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
      await mark(cycle, 'after-exit-element');
      await captureFrames();
      await expectClearViewport(page);
      await page.screenshot({ path: info.outputPath(`fullscreen-cycle-${cycle}-exited.png`) });
    }
  } finally {
    const samples = await page.evaluate(() =>
      (window as unknown as { fullscreenDiagnostic: { samples: object[] } }).fullscreenDiagnostic.samples,
    ).catch(error => ({ captureError: String(error) }));
    await mkdir(info.outputDir, { recursive: true });
    const path = info.outputPath('fullscreen-frames.json');
    await writeFile(path, JSON.stringify({ baseline: '42f86fb411e4370c9fed9e97e72e945579bcaf2e',
      project: info.project.name, platform: process.platform, browserVersion: browser.version(),
      cycles: 8, framesPerTransition: 32, samples }, null, 2));
    await info.attach('fullscreen-frames', { path, contentType: 'application/json' });
  }
});
async function startInputTimbers(page: Page): Promise<void> {
  await installTimberKeyboardPilot(page);
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
    const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons };
    const pilot = { controller: false };
    Object.assign(window, { trailPad: pad, trailPilot: pilot });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pilot.controller ? [pad] : [] });
  });
  await openAdventure(page, '/?debug=1');
  await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
}

test('educational bag collects independent letters without early assembly or sticker through real trail movement', async ({ page }, info) => {
  test.setTimeout(120_000);
  await startInputTimbers(page);
  await expect(page.locator('#status')).toContainText('Letter bag: 0/4');
  await page.setViewportSize({ width: 426, height: 300 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: info.outputPath('bag-native.png') });
  await page.setViewportSize({ width: 320, height: 240 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: info.outputPath('bag-small.png') });
  await page.setViewportSize({ width: 426, height: 300 });
  expect(await runTimberStages(page, [{ kind: 'walk', x: 205 }])).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Letter bag: 1/4');
  await expect(page.locator('#status')).toContainText('T → bag');
  await page.screenshot({ path: info.outputPath('pickup-flight-native.png') });
  await page.setViewportSize({ width: 320, height: 240 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: info.outputPath('pickup-flight-small.png') });
  expect(await runTimberStages(page, TIMBER_ONLY_E2_ASCENT.slice(1))).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Finish');
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Bag 3/4');
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  expect(await runTimberStages(page, [{ kind: 'walk', x: 350 }])).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
  await page.screenshot({ path: info.outputPath('word-two-es.png') });
  await page.setViewportSize({ width: 320, height: 240 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expectClearViewport(page);
  await page.screenshot({ path: info.outputPath('word-small.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Return to Trails', exact: true }).click();
  await page.getByRole('button', { name: 'Return to Trails', exact: true }).click();
  await page.getByRole('button', { name: 'Open stickers', exact: true }).click();
  await expect(page.locator('#status')).toContainText('0/6 stickers');
  await expect(page.locator('#status')).toContainText('Timbers TREE: find the letters');
  await expect(page.locator('#status')).not.toContainText(/number leaf|maths/i);
  await page.screenshot({ path: info.outputPath('stickers-word-only-small.png') });
  await page.getByRole('button', { name: 'Return to map', exact: true }).click();
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
  await reloadToMap(page);
  await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Letter bag: 0/4');
});

test('educational trail has no removed activity route at the former sign and keeps letter progress', async ({ page }, info) => {
  await startInputTimbers(page);
  expect(await runTimberStages(page, TIMBER_ONLY_E2_ASCENT.slice(0, 1))).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('Letter bag: 1/4');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Open optional|Answer |Leave activity/ })).toHaveCount(0);
  await expect(page.locator('#status')).not.toContainText(/maths|number leaf/i);
  await page.setViewportSize({ width: 320, height: 240 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expectClearViewport(page);
  await page.screenshot({ path: info.outputPath('removed-activity-small.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
});

for (const method of ['pointer', 'keyboard', 'controller'] as const) {
  test(`educational sticker collection ${method} access is optional and reload clears rewards`, async ({ page }) => {
    await installTrailPilot(page);
    await openAdventure(page, '/');
    await expect(page.getByRole('button', { name: 'Open stickers', exact: true })).toHaveAttribute('aria-description', /0 of 6/);
    if (method === 'pointer') await page.getByRole('button', { name: 'Open stickers', exact: true }).click();
    else if (method === 'keyboard') await page.keyboard.press('e');
    else {
      await page.evaluate(() => {
        (window as unknown as { trailPilot: { controller: boolean } }).trailPilot.controller = true;
        (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[12].pressed = true;
      });
    }
    const close = page.getByRole('button', { name: 'Return to map', exact: true });
    await expect(close).toBeFocused();
    await expect(page.locator('#status')).toContainText('0/6 stickers');
    await expect(page.locator('#status')).toContainText('Timbers TREE: find the letters');
    await expect(page.getByRole('dialog', { name: 'Trail stickers', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Answer |Leave activity/ })).toHaveCount(0);
    const frozenCanvas = await page.locator('canvas').screenshot();
    await page.evaluate(() => new Promise<void>(resolve => {
      let frames = 0; const tick = (): void => { if (++frames === 20) resolve(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    }));
    expect((await page.locator('canvas').screenshot()).equals(frozenCanvas)).toBe(true);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('#status')).toContainText('Paused');
    await expect(close).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(close).toBeFocused();
    await expect(page.locator('#status')).toContainText('0/6 stickers');
    if (method === 'controller') {
      await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[12].pressed = false; });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = true; });
    } else if (method === 'keyboard') await page.keyboard.press('Enter');
    else await close.click();
    await expect(close).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Play PLAINS', exact: true })).toBeVisible();
    await reloadToMap(page);
    await expect(page.getByRole('button', { name: 'Open stickers', exact: true })).toHaveAttribute('aria-description', /0 of 6/);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  });
}


for (const { method, placementKey } of [
  { method: 'pointer', placementKey: 'Space' },
  { method: 'keyboard', placementKey: 'Space' },
  { method: 'keyboard', placementKey: 'Enter' },
  { method: 'controller', placementKey: 'Space' },
] as const) {
  test(`educational manual assembly ${method} ${placementKey} places actual letters and earns only after TREE`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await startInputTimbers(page);
    expect(await runTimberStages(page, TIMBER_ONLY_E2_ASCENT)).toMatchObject({ done: true, error: '' });
    await expectResultsFirst(page, 'Next trail', 25_000);
    await page.getByRole('button', { name: 'Build your word', exact: true }).click();
    await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
    expect(await runTimberStages(page, [{ kind: 'walk', x: 350 }, { kind: 'walk', x: 290 }, { kind: 'finish' }])).toMatchObject({ done: true, error: '' });
    await expectResultsFirst(page, 'Next trail', 25_000);
    await openWordActivity(page, method);
    await expect(page.locator('#status')).toContainText('Build TREE · _ _ _ _ · Bag 4/4');
    await expect(page.getByRole('button', { name: /^Letter / })).toHaveCount(4);
    await page.setViewportSize({ width: 426, height: 300 });
    const frames = async () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await frames();
    const capture = async (name: string) => { await page.screenshot({ path: info.outputPath(`${method}-${name}.png`) }); };
    await capture('assembly-native');
    await page.setViewportSize({ width: 320, height: 240 }); await frames();
    await expectClearViewport(page); await capture('assembly-small');
    await page.setViewportSize({ width: 426, height: 300 }); await frames();
    const frozen = await page.locator('canvas').screenshot();
    await frames(); await frames();
    expect((await page.locator('canvas').screenshot()).equals(frozen)).toBe(true);
    const activate = async (name: string, hold = false) => {
      if (method === 'pointer') { await page.getByRole('button', { name, exact: true }).click(); return; }
      if (method === 'keyboard') {
        for (let i = 0; i < 12 && !await page.getByRole('button', { name, exact: true }).evaluate(button => button === document.activeElement); i++) await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
        if (hold) await page.keyboard.down(placementKey);
        else await page.keyboard.press(name.startsWith('Space ') ? 'Space' : 'Enter');
      } else {
        await page.evaluate(() => { (window as unknown as { trailPilot: { controller: boolean } }).trailPilot.controller = true; });
        for (let i = 0; i < 12 && !await page.getByRole('button', { name, exact: true }).evaluate(button => button === document.activeElement); i++) {
          await page.evaluate(() => { (window as unknown as { trailPad: { axes: number[] } }).trailPad.axes[0] = 1; }); await frames();
          await page.evaluate(() => { (window as unknown as { trailPad: { axes: number[] } }).trailPad.axes[0] = 0; }); await frames();
        }
        await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
        await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = true; }); await frames();
        if (!hold) await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = false; }); await frames();
      }
    };
    const drag = async (letter: string, destination: string | { x: number; y: number }) => {
      const from = (await page.getByRole('button', { name: `Letter ${letter}`, exact: true }).boundingBox())!;
      const to = typeof destination === 'string' ? (await page.getByRole('button', { name: destination, exact: true }).boundingBox())! : { ...destination, width: 0, height: 0 };
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 }); await page.mouse.up();
    };
    if (method === 'pointer') {
      await drag('E 2', 'Space 1: empty');
      await expect(page.locator('#status')).toContainText('_ _ _ _');
      await drag('E 2', { x: 2, y: 2 });
      await expect(page.getByRole('button', { name: 'Letter E 2', exact: true })).toBeVisible();
    }
    for (const [slot, letter] of ['T', 'R', 'E 2', 'E 1'].entries()) {
      if (method === 'pointer') await drag(letter, `Space ${slot + 1}: empty`);
      else { await activate(`Letter ${letter}`); await activate(`Space ${slot + 1}: empty`, slot === 3); }
      if (slot < 3) await expect(page.getByRole('button', { name: `Space ${slot + 1}: ${letter[0]}`, exact: true })).toBeVisible();
      else await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
      if (slot < 3) await expect(page.locator('#status')).not.toContainText('Tree sticker earned!');
    }
    await expect(page.locator('#status')).toContainText('Tree sticker earned!');
    await expect(page.locator('#status')).toContainText('T R E E');
    for (let frame = 0; frame < 8; frame++) {
      if (method === 'keyboard') await page.keyboard.down(placementKey);
      await frames();
      await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
    }
    if (method === 'keyboard') await page.keyboard.up(placementKey);
    if (method === 'controller') await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = false; });
    await frames();
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
    const success = await page.locator('canvas').screenshot();
    await frames(); await frames();
    expect((await page.locator('canvas').screenshot()).equals(success)).toBe(true);
    await expect(page.getByRole('button', { name: /^Letter / })).toHaveCount(0);
    await capture('earned-sticker-native');
    await page.setViewportSize({ width: 320, height: 240 }); await frames();
    await expectClearViewport(page); await capture('earned-sticker-small');
    await activate('Done', method !== 'pointer');
    for (let frame = 0; frame < 8; frame++) {
      if (method === 'keyboard') await page.keyboard.down(placementKey);
      await frames();
      await expect(page.getByRole('button', { name: 'Next trail', exact: true })).toBeFocused();
    }
    if (method === 'keyboard') await page.keyboard.up(placementKey);
    if (method === 'controller') await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[0].pressed = false; });
    await frames();
    await expect(page.getByRole('button', { name: 'Next trail', exact: true })).toBeFocused();
    // Leaving restores the default onward action, never Replay.
    await expectResultsFirst(page);
    await openWordActivity(page, 'pointer');
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expectResultsFirst(page);
    await expect(page.getByRole('button', { name: 'Next trail', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.getByRole('button', { name: 'Open stickers', exact: true }).click();
    await expect(page.locator('#status')).toContainText('1/6 stickers');
  });
}


test('educational missing-letter return preserves partial work and clears held actions and clock debt', async ({ page }, info) => {
  test.setTimeout(120_000);
  await startInputTimbers(page);
  // The real ascent takes T, R and E1, deliberately skirts the summit E2.
  expect(await runTimberStages(page, TIMBER_ONLY_E2_ASCENT)).toMatchObject({ done: true, error: '' });
  await expectResultsFirst(page, 'Next trail', 25_000);
  await openWordActivity(page, 'pointer');
  await expect(page.getByRole('dialog', { name: 'Build TREE', exact: true })).toBeVisible();
  await expect(page.locator('#status')).toContainText('Bag 3/4');
  await expect(page.getByRole('button', { name: 'Letter E 2', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Letter R', exact: true }).click();
  await page.getByRole('button', { name: 'Space 2: empty', exact: true }).click();
  await expect(page.locator('#status')).toContainText('_ R _ _');
  const frames = async (count = 3) => page.evaluate(count => new Promise<void>(resolve => {
    let frame = 0; const next = () => { if (++frame >= count) resolve(); else requestAnimationFrame(next); }; requestAnimationFrame(next);
  }), count);
  await page.setViewportSize({ width: 426, height: 300 }); await frames();
  await page.screenshot({ path: info.outputPath('missing-assembly-native.png') });
  const frozen = await page.locator('canvas').screenshot();
  const status = await page.locator('#status').innerText();
  await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { advanceMs: number } }).timberKeyboardPilot.advanceMs = 60_000; });
  await frames(15);
  expect((await page.locator('canvas').screenshot()).equals(frozen)).toBe(true);
  expect(await page.locator('#status').innerText()).toBe(status);
  // Cancel a real in-progress drag on focus loss, keeping every collected letter.
  const from = (await page.getByRole('button', { name: 'Letter E 1', exact: true }).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(from.x + 20, from.y - 20);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.mouse.up();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('dialog', { name: 'Build TREE', exact: true })).toBeVisible();
  await expect(page.locator('#status')).toContainText('_ R _ _');
  await expect(page.getByRole('button', { name: /^Letter E/ })).toHaveCount(1);
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('Space');
  await frames();
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#status')).toContainText('Playing · Letter bag: 3/4');
  const playerStatus = async (page: Page) => {
    const text = await page.locator('#status').innerText();
    const match = text.match(/X (\d+) Y (-?\d+)/)!;
    return { x: Number(match[1]), y: Number(match[2]) };
  };
  const returned = await playerStatus(page);
  expect(returned.x).toBe(LEVELS[2].retrace!.x);
  await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { advanceMs: number } }).timberKeyboardPilot.advanceMs = 60_000; });
  await frames(20);
  const after = await playerStatus(page);
  expect(after.x).toBe(returned.x); expect(after.y).toBe(returned.y);
  await page.screenshot({ path: info.outputPath('missing-return-native.png') });
  await page.setViewportSize({ width: 320, height: 240 }); await frames();
  await expectClearViewport(page); await page.screenshot({ path: info.outputPath('missing-return-small.png') });
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('Space');
  // Brake on the lookout before reversing; an abrupt turn at its edge is a real fall.
  expect(await runTimberStages(page, [{ kind: 'walk', x: 290 }, { kind: 'finish' }])).toMatchObject({ done: true, error: '' });
  // Re-entering shows the normal results; the run input does not open the activity.
  await expectResultsFirst(page);
  await frames(10);
  await expectResultsFirst(page);
  await openWordActivity(page, 'keyboard');
  await expect(page.getByRole('dialog', { name: 'Build TREE', exact: true })).toBeVisible();
  await expect(page.locator('#status')).toContainText('_ R _ _');
  await page.getByRole('button', { name: 'Leave activity', exact: true }).click();
  await expectResultsFirst(page);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true })).toHaveAttribute('aria-description', /Session best:/);
});

for (const index of [0, LEVELS.length - 1]) {
  const level = LEVELS[index], defaultAction = index < LEVELS.length - 1 ? 'Next trail' : 'Map';
  test(`leaving ${level.name} word building restores native focus to ${defaultAction} without held activation`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await installTrailPilot(page);
    await openAdventure(page, '/?debug=1');
    await page.getByRole('button', { name: level.name, exact: true }).click();
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await page.evaluate(dangers => Object.assign((window as unknown as { trailPilot: object }).trailPilot, { active: true, dangers }), dangerXs(level));
    await expectResultsFirst(page, defaultAction, 35_000);
    await page.evaluate(() => Object.assign((window as unknown as { trailPilot: object }).trailPilot, { active: false, lastActive: false }));
    await page.keyboard.up('ArrowRight');
    const status = page.locator('#status'), dialog = page.getByRole('dialog');
    const target = page.getByRole('button', { name: defaultAction, exact: true });
    const record: unknown[] = [];
    const observe = async (step: string): Promise<void> => { record.push(await page.evaluate(step => ({ step,
      focus: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName,
      selected: document.querySelector('.trail-menu button[aria-pressed="true"]')?.getAttribute('aria-label'),
      status: document.querySelector('#status')!.textContent!.split(' · ').slice(0, 2).join(' · ') }), step)); };
    const tabTo = async (name: string): Promise<void> => {
      const button = page.getByRole('button', { name, exact: true });
      for (let step = 0; step < 12 && !await button.evaluate(element => element === document.activeElement); step++) await page.keyboard.press('Tab');
      await expect(button).toBeFocused();
    };
    const enterActivity = async (): Promise<void> => {
      await tabTo('Build your word'); await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible();
      await tabTo('Leave activity');
    };
    const expectRestored = async (step: string): Promise<void> => {
      await expect(dialog).toHaveCount(0);
      await expect(target).toBeFocused();
      await expect(target).toHaveAttribute('aria-pressed', 'true');
      await expect(status).toContainText('Finish');
      await observe(step);
    };
    try {
      const resultStatus = await status.innerText();
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
      await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Sound', exact: true }).click();
      await page.getByRole('button', { name: 'Sound', exact: true }).click();
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await expect(target).toBeFocused();
      await expect(status).toHaveText(resultStatus);
      await info.attach('results-settings-return', { body: await page.screenshot(), contentType: 'image/png' });
      // Held Enter: the repeats that follow focus onto the default action never activate it.
      await enterActivity(); await observe('before held Enter on Leave activity');
      await page.keyboard.down('Enter');
      await expectRestored('after Enter keydown on Leave activity');
      for (let repeat = 0; repeat < 3; repeat++) { await page.keyboard.down('Enter'); await releasedFrames(page); }
      await page.keyboard.up('Enter'); await releasedFrames(page);
      await expectRestored('after Enter repeats and release');
      // Held Space, then its keyup on the newly focused default.
      await enterActivity(); await observe('before held Space on Leave activity');
      await page.keyboard.down('Space');
      await expectRestored('after Space keydown on Leave activity');
      for (let repeat = 0; repeat < 3; repeat++) { await page.keyboard.down('Space'); await releasedFrames(page); }
      await page.keyboard.up('Space'); await releasedFrames(page);
      await expectRestored('after Space repeats and release');
      // Escape also returns focus to the default.
      await enterActivity();
      await page.keyboard.press('Escape');
      await expectRestored('after Escape');
      // Pointer Leave has the same native focus destination.
      await enterActivity();
      await page.getByRole('button', { name: 'Leave activity', exact: true }).click();
      await expectRestored('after pointer Leave activity');
      // Tab only moves focus; Shift+Tab returns without acting.
      await page.keyboard.press('Tab'); await releasedFrames(page);
      await expect(target).not.toBeFocused(); await expect(status).toContainText('Finish'); await observe('after Tab');
      await page.keyboard.press('Shift+Tab'); await releasedFrames(page);
      await expectRestored('after Shift+Tab');
      // Held standard-gamepad confirmation on Leave activity.
      await enterActivity();
      await page.evaluate(() => { (window as unknown as { trailPilot: { controller: boolean } }).trailPilot.controller = true; });
      const pad = (pressed: boolean, button = 0) => page.evaluate(({ pressed, button }) => {
        (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[button].pressed = pressed;
      }, { pressed, button });
      await releasedFrames(page);
      await pad(true);
      await expectRestored('after held controller confirmation on Leave activity');
      await releasedFrames(page); await releasedFrames(page);
      await expectRestored('while controller confirmation is still held');
      await pad(false); await releasedFrames(page);
      await expectRestored('after controller release');
      // Start closes the activity; keeping Start held must not open Pause on the results.
      await enterActivity(); await releasedFrames(page);
      await pad(true, 9);
      await expectRestored('after controller Start');
      await releasedFrames(page); await releasedFrames(page);
      await expectRestored('while controller Start is still held');
      await pad(false, 9); await releasedFrames(page);
      await expectRestored('after controller Start release');
      // A fresh Enter acts once, including its repeats and release on the next screen.
      const expectDestination = async (): Promise<void> => {
        if (defaultAction === 'Next trail') {
          const next = LEVELS[index + 1];
          expect(hasFixedSupport(next, next.start)).toBe(true);
          await expect(status).toContainText(`Playing · Letter bag: 0/4 · X ${next.start.x} Y ${next.start.y - DEFAULT_MOVEMENT.height} V 0`);
        } else {
          await expect(page.getByRole('button', { name: `Play ${level.name}`, exact: true })).toBeVisible();
          await expect(status).toContainText('Title');
        }
      };
      await page.keyboard.down('Enter'); await expectDestination();
      for (let repeat = 0; repeat < 3; repeat++) { await page.keyboard.down('Enter'); await releasedFrames(page); }
      await expectDestination();
      await page.keyboard.up('Enter'); await releasedFrames(page);
      await expectDestination(); await observe('after fresh Enter, repeats and release');
    } finally {
      const path = info.outputPath('focus-record.json');
      await writeFile(path, JSON.stringify(record, null, 2));
      await info.attach('focus-record', { path, contentType: 'application/json' });
    }
    expect(errors).toEqual([]);
  });
}

/** Real keyboard input and rendered debug observations, with accelerated presentation time.
 * Never reads or writes the scene, player, run or education session. */
async function installRetracePilot(page: Page, level: typeof PLAINS_LEVEL): Promise<void> {
  await page.addInitScript(installRetracePilotScript, level);
}

// Timbers' input-only TREE return and assembly live in timbers-ascent.spec.ts.
for (const [index, level] of LEVELS.entries()) {
  if (level.id === 'timbers') continue;
  test(`all-trail spelling ${level.id}: input-only missing-letter retrace, manual assembly and session sticker`, async ({ page }, info) => {
    test.setTimeout(120_000);
    if (level.id === 'quarry') {
      await startQuarryPilot(page); await driveQuarry(page, QUARRY_DESCENT); await quarryFinish(page);
      await page.getByRole('button', { name: 'Build your word', exact: true }).click();
      await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
      await expect(page.locator('#status')).toContainText('Playing · Letter bag: 0/4 · X 470 Y 946 V 0');
      await twoFrames(page); // Let the finish screen's last RAF and held input settle before piloting the return.
      await driveQuarry(page, QUARRY_RETURN); await driveQuarry(page, QUARRY_DESCENT); await quarryFinish(page);
      await page.getByRole('button', { name: 'Build your word', exact: true }).click();
      for (const [slot, letter] of [...'ROCK'].entries()) {
        await page.getByRole('button', { name: `Letter ${letter}`, exact: true }).click();
        await page.getByRole('button', { name: `Space ${slot + 1}: empty`, exact: true }).click();
      }
      await expect(page.locator('#status')).toContainText('ROCK sticker earned!');
      return;
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const config = TRAIL_WORDS[index];
    await observeSpellingArtwork(page);
    await observeKitTextClearance(page);
    // Miss I on its clear descent; the compact Plains H is now beyond the rollers.
    const skippedSlot = index === 0 ? 1 : 0;
    const labelFor = (slot: number): string => {
      const pickup = config.pickups[slot], duplicates = config.pickups.filter(p => p.letter === pickup.letter);
      return `Letter ${pickup.letter}${duplicates.length > 1 ? ` ${duplicates.indexOf(pickup) + 1}` : ''}`;
    };
    // These evidence routes exercise native/small play; the viewport suite covers large sizes.
    await page.setViewportSize({ width: 426, height: 300 });
    if (level.id === 'cove') await installCovePilot(page);
    else if (level.id === 'sunset' || level.id === 'frost') await installTimberKeyboardPilot(page);
    else await installRetracePilot(page, level);
    // The existing helper provides the same standard Gamepad API used by pilot regressions.
    await page.addInitScript(() => {
      const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
      Object.assign(window, { spellingPad: pad });
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    });
    await openAdventure(page, '/?debug=1');
    expect((await page.locator('canvas').boundingBox())!.width).toBe(426);
    await page.getByRole('button', { name: level.name, exact: true }).click();
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await expect(page.locator('#game')).toHaveAttribute('data-spelling-draws', /pouch\.png/);
    const drive = async (direction: number, collectAt: number[] = [], initialCount = 0): Promise<void> => {
      if (level.id === 'cove') {
        await driveCove(page,direction<0?COVE_RETURN:initialCount?COVE_LOWER:[coveWalk(235),coveJump(340,312),coveWalk(4030),{kind:'finish'}]);
        return;
      }
      if (level.id === 'frost') {
        await driveSunset(page, direction < 0 ? FROST_RETURN : initialCount ? FROST_REASCENT : FROST_MISS_S);
        return;
      }
      if (level.id === 'sunset') {
        await driveSunset(page, direction < 0 ? SUNSET_RETURN : initialCount ? SUNSET_REASCENT : SUNSET_MISS_B);
        return;
      }
      const targets: number[] = [];
      if (direction > 0 && !initialCount) targets.unshift(config.pickups[skippedSlot].x); // Intentionally miss a real letter.
      await page.evaluate(({ direction, targets, collectAt, initialCount }) => {
        const text = document.querySelector('#status')!.textContent!;
        Object.assign((window as unknown as { retracePilot: object }).retracePilot, { direction, targets, triggered: [], collectAt,
          expectedCount: initialCount + 1, stopAt: direction < 0 ? 310 : 0, stopped: false,
          lastX: Number(text.match(/X (\d+)/)?.[1] ?? 0), jumpUntil: 0 });
      }, { direction, targets, collectAt, initialCount });
    };
    const frames = async (): Promise<void> => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const capture = async (state: string): Promise<void> => {
      for (const width of state === 'earned' ? [426, 320, 1366] : [426, 320]) {
        await page.setViewportSize({ width, height: width === 1366 ? 768 : width === 426 ? 300 : 240 }); await frames();
        await expectClearViewport(page);
        const artwork = JSON.parse((await page.locator('#game').getAttribute('data-spelling-draws'))!);
        if (state === 'missing-assembly' || state === 'earned' || state === 'reentry') expect(artwork['tile.png']).toBeDefined();
        const stickers = Object.keys(artwork).filter(name => name.endsWith('-sticker.png'));
        if (state === 'earned' || state === 'reentry') {
          expect(stickers).toEqual([`${level.id}-sticker.png`]);
          expect(artwork[`${level.id}-sticker.png`]).toMatchObject({ rect: [185, 102, 56, 56], alpha: 1 });
        } else if (state === 'collection') {
          expect(stickers.sort()).toEqual(TRAIL_WORDS.map(word => `${word.id}-sticker.png`).sort());
          // Firefox exposes Canvas alpha as float32 (0.3000000119 for 0.3).
          for (const word of TRAIL_WORDS) expect(artwork[`${word.id}-sticker.png`].alpha).toBeCloseTo(word.id === level.id ? 1 : 0.3, 7);
        } else expect(stickers).toEqual([]);
        for (const sprite of Object.values(artwork) as { smoothing: boolean }[]) expect(sprite.smoothing).toBe(false);
        const path = info.outputPath(`${level.id}-${state}-${width}.png`);
        await page.screenshot({ path }); await info.attach(`${state}-${width}`, { path, contentType: 'image/png' });
      }
      if (level.id === 'plains') {
        await page.setViewportSize({ width: 426, height: 300 }); await frames();
        expect((await page.locator('#game').boundingBox())!.width).toBe(426);
        expect((await page.locator('#game').boundingBox())!.height).toBe(240);
      }
    };
    const method = (['pointer', 'keyboard', 'controller'] as const)[index % 3];
    const defaultAction = index < LEVELS.length - 1 ? 'Next trail' : 'Map';
    await drive(1);
    await expectResultsFirst(page, defaultAction, 35_000);
    // The retrace pilot releases arrows every frame, so keyboard entry uses Tab focus and Enter like its letter activation.
    await openWordActivity(page, method, { pad: 'spellingPad', keyboard: 'tab' });
    await expect(page.getByRole('dialog', { name: `Build ${config.word}`, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: labelFor(skippedSlot), exact: true })).toHaveCount(0);
    const initialStatus = await page.locator('#status').innerText();
    const missing: number[] = [];
    const available: number[] = [];
    for (let slot = 0; slot < 4; slot++) (await page.getByRole('button', { name: labelFor(slot), exact: true }).count() ? available : missing).push(slot);
    expect(available.length).toBeGreaterThan(0);
    const partial = available[0];
    await page.getByRole('button', { name: labelFor(partial), exact: true }).click();
    await page.getByRole('button', { name: `Space ${partial + 1}: empty`, exact: true }).click();
    await capture('missing-assembly');
    await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
    await expect(page.locator('#status')).toContainText(`X ${level.retrace?.x ?? level.finish.x - 28}`);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await capture('beside-finish');
    await drive(-1, missing.map(slot => config.pickups[slot].x).sort((a, b) => b - a), available.length);
    if (level.id !== 'sunset' && level.id !== 'frost' && level.id !== 'cove') await page.waitForFunction(() => (window as unknown as { retracePilot: { stopped: boolean } }).retracePilot.stopped, undefined, { timeout: 35_000 });
    await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
    const collectedStatus = await page.locator('#status').innerText();
    await drive(1, [], 4);
    // The same run's finish shows results again; only the explicit action re-enters the activity.
    await expectResultsFirst(page, defaultAction, 35_000);
    // The retrace pilot releases arrows every frame, so keyboard entry uses Tab focus and Enter like its letter activation.
    await openWordActivity(page, method, { pad: 'spellingPad', keyboard: 'tab' });
    await expect(page.getByRole('dialog', { name: `Build ${config.word}`, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `Space ${partial + 1}: ${config.word[partial]}`, exact: true })).toBeVisible();
    const activate = async (name: string): Promise<void> => {
      await frames();
      const target = page.getByRole('button', { name, exact: true });
      await expect(target).toBeVisible();
      if (method === 'keyboard') {
        for (let step = 0; step < 12 && !await target.evaluate(button => button === document.activeElement); step++) { await page.keyboard.press('Tab'); await frames(); }
        await expect(target).toBeFocused(); await page.keyboard.press('Enter'); await frames();
      } else {
        for (let step = 0; step < 12 && !await target.evaluate(button => button === document.activeElement); step++) {
          await page.evaluate(() => { (window as unknown as { spellingPad: { axes: number[] } }).spellingPad.axes[0] = 1; }); await frames();
          await page.evaluate(() => { (window as unknown as { spellingPad: { axes: number[] } }).spellingPad.axes[0] = 0; }); await frames();
        }
        await expect(target).toBeFocused();
        await page.evaluate(() => { (window as unknown as { spellingPad: { buttons: { pressed: boolean }[] } }).spellingPad.buttons[0].pressed = true; }); await frames();
        await page.evaluate(() => { (window as unknown as { spellingPad: { buttons: { pressed: boolean }[] } }).spellingPad.buttons[0].pressed = false; }); await frames();
      }
    };
    for (let slot = 0; slot < 4; slot++) {
      if (slot === partial) continue;
      await frames();
      if (method === 'pointer') {
        const from = (await page.getByRole('button', { name: labelFor(slot), exact: true }).boundingBox())!;
        const to = (await page.getByRole('button', { name: `Space ${slot + 1}: empty`, exact: true }).boundingBox())!;
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
        await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 5 }); await page.mouse.up();
      } else { await activate(labelFor(slot)); await activate(`Space ${slot + 1}: empty`); }
      if (slot < 3) await expect(page.getByRole('button', { name: `Space ${slot + 1}: ${config.word[slot]}`, exact: true })).toBeVisible();
      else await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
      await frames();
    }
    await expect(page.locator('#status')).toContainText(`${config.word === 'TREE' ? 'Tree' : config.word} sticker earned!`);
    await expect(page.locator('#status')).toContainText([...config.word].join(' '));
    await capture('earned');
    const clearance = await kitTextProbe(page);
    for (const key of ['Done|button-selected', 'WORD COMPLETE!|canvas', 'Done: return to trail results|canvas', `${config.word === 'TREE' ? 'Tree' : config.word} sticker earned!|canvas`]) expect(clearance.checked).toContain(key);
    expect(clearance.violations).toEqual([]);
    await writeFile(info.outputPath('success-glyph-clearance.json'), JSON.stringify(clearance, null, 2));
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('button', { name: defaultAction, exact: true })).toBeFocused();
    await capture('done-results');
    await openWordActivity(page, 'pointer');
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
    await capture('reentry');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('button', { name: defaultAction, exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeVisible();
    await expectResultsFirst(page, defaultAction);
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-description', /Session best:/);
    await page.getByRole('button', { name: 'Open stickers', exact: true }).click();
    await expect(page.locator('#status')).toContainText('1/6 stickers');
    await expect(page.locator('#status')).toContainText(`${config.name} ${config.word}: earned`);
    for (const other of TRAIL_WORDS.filter(word => word.id !== config.id)) await expect(page.locator('#status')).toContainText(`${other.name} ${other.word}: find the letters`);
    await capture('collection');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
    const recoveries = await page.evaluate(sunset => sunset
      ? (window as unknown as { timberKeyboardPilot: { recoveries: string[] } }).timberKeyboardPilot.recoveries
      : (window as unknown as { retracePilot: { recoveries: string[] } }).retracePilot.recoveries, level.id === 'sunset' || level.id === 'frost' || level.id === 'cove');
    const recoveryPath = info.outputPath('recovery-history.json');
    await writeFile(recoveryPath, JSON.stringify(await page.evaluate(sunset => sunset
      ? (window as unknown as { timberKeyboardPilot: { history: unknown[] } }).timberKeyboardPilot.history
      : (window as unknown as { retracePilot: { recoveryHistory: unknown[] } }).retracePilot.recoveryHistory, level.id === 'sunset' || level.id === 'frost' || level.id === 'cove'), null, 2));
    await info.attach('recovery-history', { path: recoveryPath, contentType: 'application/json' });
    expect(recoveries).toEqual([]);
    await reloadToMap(page);
    await page.getByRole('button', { name: level.name, exact: true }).click();
    await page.getByRole('button', { name: `Play ${level.name}`, exact: true }).click();
    await expect(page.locator('#status')).toContainText('Letter bag: 0/4');
    expect(errors).toEqual([]);
    const resultPath = info.outputPath('route-result.json');
    await writeFile(resultPath, JSON.stringify({ initialStatus, collectedStatus, method, recoveries, errors }, null, 2));
    await info.attach('route-result', { path: resultPath, contentType: 'application/json' });
  });
}

/** Observe final-frame artwork only; never reads or modifies scene/session state. */
async function observeSpellingArtwork(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const frames = new WeakMap<HTMLCanvasElement, Record<string, { rect: number[]; alpha: number; smoothing: boolean }>>();
    const queued = new WeakSet<HTMLCanvasElement>();
    const publish = (canvas: HTMLCanvasElement): void => {
      if (queued.has(canvas)) return;
      queued.add(canvas);
      queueMicrotask(() => { queued.delete(canvas); canvas.dataset.spellingDraws = JSON.stringify(frames.get(canvas) ?? {}); });
    };
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (this.canvas.id === 'game' && x === 0 && y === 0 && width === 426 && height === 240) {
        frames.set(this.canvas, {}); publish(this.canvas);
      }
      return fill.call(this, x, y, width, height);
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image: CanvasImageSource, ...coordinates: number[]) {
      if (this.canvas.id === 'game' && image instanceof HTMLImageElement && image.src.includes('/assets/spelling/')) {
        const frame = frames.get(this.canvas) ?? {};
        frame[image.src.split('/').at(-1)!] = { rect: coordinates, alpha: this.globalAlpha, smoothing: this.imageSmoothingEnabled };
        frames.set(this.canvas, frame); publish(this.canvas);
      }
      return Reflect.apply(draw, this, [image, ...coordinates]);
    };
  });
}

test('builder-kit reduced-motion pickup stays beside its pouch at native and small viewports', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 426, height: 300 });
  await observeSpellingArtwork(page); await startInputTimbers(page);
  expect(await runTimberStages(page, [{ kind: 'walk', x: 205 }])).toMatchObject({ done: true, error: '' });
  await expect(page.locator('#status')).toContainText('T → bag');
  await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = true; });
  for (const width of [426, 320]) {
    await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const art = JSON.parse((await page.locator('#game').getAttribute('data-spelling-draws'))!);
    expect(art['pouch.png'].rect).toEqual([330, 33, 24, 24]);
    expect(art['tile.png'].rect).toEqual([331, 56, 22, 24]);
    await expectClearViewport(page);
    await info.attach(`reduced-motion-${width}`, { body: await page.screenshot({ path: info.outputPath(`reduced-motion-${width}.png`) }), contentType: 'image/png' });
  }
});

test('builder-kit visual fixture renders all six words and generated stickers at native and small sizes', async ({ page }, info) => {
  // Exercise the shipped renderers and native controls with explicit collected
  // letter fixtures. Route completion is tested separately; no game hook ships.
  const source = (name: string): string => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
  const declarations = (name: string, text: string): string => transformSync(name,
    text.replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code;
  const tile = source('art/spelling.ts');
  const tileStart = tile.indexOf('export function drawLetterTile');
  expect(tileStart).toBeGreaterThan(0);
  const henry = source('art/henry.ts');
  const loaderStart = henry.indexOf('export async function loadImage');
  expect(loaderStart).toBeGreaterThan(0);
  // The shipped kit module, with Vite's build-time base substituted as the bundle does.
  const kitSource = source('art/interface-kit.ts');
  expect(kitSource.split('import.meta.env.BASE_URL')).toHaveLength(2);
  const modules: Record<string, string> = {
    'game/movement.ts': source('game/movement.ts'),
    'game/education.ts': source('game/education.ts'),
    'art/interface-kit.ts': kitSource.replace('import.meta.env.BASE_URL', JSON.stringify('./')),
    'game/education-overlay.ts': source('game/education-overlay.ts'),
    'game/menu-overlay.ts': source('game/menu-overlay.ts'),
  };
  const fixture = [
    declarations('movement.ts', modules['game/movement.ts']),
    declarations('education.ts', modules['game/education.ts']),
    declarations('tile.ts', tile.slice(tileStart)),
    declarations('loader.ts', henry.slice(loaderStart, henry.indexOf('\n}\n', loaderStart) + 3)),
    declarations('interface-kit.ts', modules['art/interface-kit.ts']),
    declarations('overlay.ts', modules['game/education-overlay.ts']),
    declarations('menu.ts', modules['game/menu-overlay.ts']),
  ].join('\n');
  expect(fixture).not.toContain('import.meta');
  // Keep dependency drift visible: every runtime import of a concatenated module must be declared.
  const runtimeImports = [...new Set(Object.values(modules).flatMap(text => [...text.matchAll(/^import (?!type )\{([^}]*)\} from .*;$/gm)]
    .flatMap(([, names]) => names.split(',').map(name => name.trim()).filter(name => name && !name.startsWith('type ')))))];
  expect(runtimeImports).toEqual(expect.arrayContaining(['drawKitButton', 'drawKitFrame', 'drawLetterTile', 'loadImage', 'TRAIL_WORDS', 'surfaceY']));
  await page.setViewportSize({ width: 426, height: 300 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await observeSpellingArtwork(page);
  await openAdventure(page, '/');
  await page.addScriptTag({ content: `(() => {
    ${fixture}
    window.spellingFixtureMissing = [${runtimeImports.map(name => `typeof ${name} === 'undefined' && ${JSON.stringify(name)}`).join(', ')}].filter(Boolean);
    window.createSpellingFixture = async () => {
      const load = async name => { const image = new Image(); image.src = '/assets/spelling/' + name + '.png'; await image.decode(); return image; };
      const stickers = {};
      for (const config of TRAIL_WORDS) stickers[config.id] = await load(config.id + '-sticker');
      const artwork = { pouch: await load('pouch'), tile: await load('tile'), stickers };
      const session = new EducationSession();
      const ui = await loadInterfaceKit();
      const overlay = new EducationOverlay(session, artwork, ui);
      const canvas = document.querySelector('#game');
      document.querySelector('.trail-menu').remove();
      const menu = new MenuOverlay(canvas);
      const scene = { screenState: 'finish', educationOverlay: overlay, get menuTargets() { return overlay.open ? overlay.targets : []; } };
      // Record kit pieces drawn by the overlay alone, not the live game frame beneath it.
      const ctx = canvas.getContext('2d'), drawImage = ctx.drawImage, kitDraws = new Set();
      let recording = false;
      ctx.drawImage = function (image, ...rest) {
        if (recording && Object.values(ui).includes(image)) kitDraws.add(image.src.split('/').at(-1));
        return drawImage.call(this, image, ...rest);
      };
      const draw = () => { kitDraws.clear(); recording = true; try { overlay.draw(ctx); } finally { recording = false; } menu.update(scene, false); };
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => raf(time => { callback(time); draw(); });
      const kit = Object.entries(ui).map(([piece, image]) => ({ piece, file: image.src.split('/').at(-1), complete: image.complete,
        size: [image.naturalWidth, image.naturalHeight], declared: [INTERFACE_PIECES[piece].width, INTERFACE_PIECES[piece].height] }));
      window.spellingFixture = { overlay, kit, kitDraws: () => [...kitDraws].sort(), reset(id) {
        session.selectTrail(id); session.pickups.forEach(pickup => session.collect(pickup.id));
        overlay.showAssembly(() => {}); draw();
      } };
    };
  })();` });
  expect(await page.evaluate(() => (window as unknown as { spellingFixtureMissing: string[] }).spellingFixtureMissing)).toEqual([]);
  await page.evaluate(() => (window as unknown as { createSpellingFixture(): Promise<void> }).createSpellingFixture());
  type KitPiece = { piece: string; file: string; complete: boolean; size: number[]; declared: number[] };
  const fixtureKit = (): Promise<{ kit: KitPiece[]; kitDraws: string[] }> => page.evaluate(() => {
    const fixture = (window as unknown as { spellingFixture: { kit: KitPiece[]; kitDraws(): string[] } }).spellingFixture;
    return { kit: fixture.kit, kitDraws: fixture.kitDraws() };
  });
  const { kit } = await fixtureKit();
  expect(kit.map(entry => entry.file).sort()).toEqual(['button-selected.png', 'button.png', 'panel.png', 'plaque.png']);
  for (const entry of kit) expect(entry).toMatchObject({ file: `${entry.piece}.png`, complete: true, size: entry.declared });
  const capture = async (trail: string, state: string): Promise<void> => {
    for (const width of [426, 320]) {
      await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expectClearViewport(page);
      const file = info.outputPath(`fixture-${trail}-${state}-${width}.png`);
      await page.screenshot({ path: file }); await info.attach(`${trail}-${state}-${width}`, { path: file, contentType: 'image/png' });
    }
  };
  for (const config of TRAIL_WORDS) {
    await page.evaluate(id => (window as unknown as { spellingFixture: { reset(id: string): void } }).spellingFixture.reset(id), config.id);
    await expect(page.getByRole('dialog', { name: `Build ${config.word}`, exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { spellingFixture: { overlay: EducationOverlay } }).spellingFixture.overlay.description)).not.toContain('sticker earned!');
    expect((await fixtureKit()).kitDraws).toContain('button.png');
    if (config.id === 'timbers') await capture(config.id, 'mixed-pile');
    for (const [slot, pickup] of config.pickups.entries()) {
      const duplicates = config.pickups.filter(letter => letter.letter === pickup.letter);
      const label = `Letter ${pickup.letter}${duplicates.length > 1 ? ` ${duplicates.indexOf(pickup) + 1}` : ''}`;
      await page.getByRole('button', { name: label, exact: true }).focus(); await page.keyboard.press('Enter');
      await page.getByRole('button', { name: `Space ${slot + 1}: empty`, exact: true }).focus();
      if (config.id === 'sunset' && slot === 0) await capture(config.id, 'held');
      await page.keyboard.press('Enter');
      if (slot < 3) await expect(page.getByRole('button', { name: `Space ${slot + 1}: ${pickup.letter}`, exact: true })).toBeVisible();
      else await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
    }
    const art = JSON.parse((await page.locator('#game').getAttribute('data-spelling-draws'))!);
    expect(art['tile.png']).toBeDefined();
    expect(Object.keys(art).filter(name => name.endsWith('-sticker.png'))).toEqual([`${config.id}-sticker.png`]);
    expect(art[`${config.id}-sticker.png`]).toMatchObject({ rect: [185, 102, 56, 56], alpha: 1 });
    await capture(config.id, 'earned');
  }
  await page.evaluate(() => (window as unknown as { spellingFixture: { overlay: EducationOverlay } }).spellingFixture.overlay.showStickers());
  await expect(page.getByRole('dialog', { name: 'Trail stickers', exact: true })).toBeVisible();
  const collection = JSON.parse((await page.locator('#game').getAttribute('data-spelling-draws'))!);
  for (const config of TRAIL_WORDS) expect(collection[`${config.id}-sticker.png`].alpha).toBe(1);
  expect((await fixtureKit()).kitDraws).toEqual(expect.arrayContaining(['button-selected.png', 'plaque.png']));
  await capture('all', 'collection');
});


for (const level of LEVELS) test(`compact HUD renderer fixture: ${level.id} identity marks and real glyph clearance`, async ({ page }, info) => {
  // Explicit layout states, not scene mutation or a claim of input-driven gameplay.
  const names = ['world/camera.ts', 'game/platforms.ts', 'game/movement.ts', 'game/education.ts', 'art/interface-kit.ts', 'game/hud.ts', 'world/scenery.ts',
    'world/cove-terrain.ts', 'world/surface-materials.ts', 'world/assets.ts', 'world/trail-presentation.ts', 'world/ambient-weather.ts', 'world/renderer.ts'];
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const modules = names.map(name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8'));
  const runtimeImports = [...new Set(modules.flatMap(source => [...source.matchAll(/^import (?!type )\{([^}]*)\} from .*;$/gm)]
    .flatMap(([, names]) => names.split(',').map(name => name.trim()).filter(name => name && !name.startsWith('type ')))))];
  const fixture = modules.map((source, index) => transformSync(names[index], source.replace(/^import .*;\n/gm, '')
    .replace(/\bexport /g, '').replaceAll('import.meta.env.BASE_URL', JSON.stringify('./')), {}).code).join('\n');
  expect(runtimeImports).toEqual(expect.arrayContaining(['MAX_HEALTH', 'drawKitFrame', 'loadImage', 'validateScenery', 'drawSceneryBackground', 'drawSurfaceMaterials']));
  await observeKitTextClearance(page);
  await openAdventure(page, '/');
  await page.addScriptTag({ content: `(() => {
    const MAX_HEALTH = ${MAX_HEALTH};
    ${fixture}
    window.hudFixtureMissing = [${[...runtimeImports, 'drawTimberTrunk', 'drawSiteFrame'].map(name => `typeof ${name} === 'undefined' && ${JSON.stringify(name)}`).join(', ')}].filter(Boolean);
    window.createHudFixture = async (level, runTemplate) => {
      const assets = await loadWorldAssets(level.atlas), ui = await loadInterfaceKit();
      const pouch = await loadImage('/assets/spelling/pouch.png');
      const manifest = await (await fetch('/assets/henry/manifest.json')).json();
      const henry = await loadImage('/assets/henry/' + manifest.image), frame = manifest.frames[manifest.animations.idle.frames[0]];
      const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
      const fillRect = ctx.fillRect.bind(ctx), fillText = ctx.fillText.bind(ctx), drawImage = ctx.drawImage.bind(ctx);
      let recording = false, fills = [], texts = [], pouchRect;
      ctx.drawImage = (image, ...args) => { if (recording && image === pouch) pouchRect = args; drawImage(image, ...args); };
      ctx.fillRect = (x, y, width, height) => { if (recording) fills.push({ x, y, width, height, color: ctx.fillStyle }); fillRect(x, y, width, height); };
      ctx.fillText = (text, x, y) => {
        if (recording) { const m = ctx.measureText(text); texts.push({ text, left: x - m.actualBoundingBoxLeft,
          right: x + m.actualBoundingBoxRight, top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent }); }
        fillText(text, x, y);
      };
      let state = 0, hint = '', notice = '', ribbonBandPose = false;
      const draw = () => {
        const session = new EducationSession(); session.selectTrail(level.id);
        session.pickups.slice(0, state).forEach(pickup => session.collect(pickup.id));
        const run = { ...runTemplate, collectedGems: new Set(Array.from({ length: [0, 1, 10, 99, 44][state] }, (_, i) => 'g' + i)),
          specialTotal: [0, 3, 12, 3, 3][state], collectedSpecials: new Set(Array.from({ length: [0, 1, 10, 3, 3][state] }, (_, i) => 's' + i)),
          health: [3, 2, 1, 0, 3][state], healthFlashPip: state === 1 ? 2 : null, healthFlashSeconds: state === 1 ? 1 : 0 };
        ctx.imageSmoothingEnabled = false;
        const camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height, vertical: level.verticalCamera || level.progressAxis === 'y', lead: level.cameraLead });
        const ground = level.verticalCamera || level.progressAxis === 'y' ? level.start.y : surfaceY(level, level.start.x);
        camera.update(level.start.x, ground - 34);
        drawWorld(ctx, assets, level, camera, undefined, undefined, platformBodiesAt(level.platforms, 0), 0, true);
        const henryRect = { x: level.start.x - camera.position.x - manifest.anchor.x, y: ground - camera.position.y - manifest.anchor.y, width: 48, height: 48 };
        if (ribbonBandPose) { henryRect.x = 110 - manifest.anchor.x; henryRect.y = 230 - manifest.anchor.y; }
        ctx.drawImage(henry, frame.x, frame.y, frame.width, frame.height, henryRect.x, henryRect.y, 48, 48);
        drawWorldForeground(ctx, assets, level, camera);
        const hud = new HudPresentation(); if (state > 0) hud.consume([{ type: 'checkpoint', entityId: level.checkpoints[0].id }]);
        fills = []; texts = []; recording = true;
        drawGameplayHud(ctx, run, hint, notice, hud.progress(level, level.start.x, ground), ui);
        drawCollectionBag(ctx, session, pouch, ui); recording = false;
        const marks = fills.filter(rect => rect.width === 6 && rect.height === 6);
        const iconPixels = fills.filter(rect => rect.width <= 2 && rect.height <= 2 && rect.y < 22 && (rect.x < 24 || rect.x >= 151 && rect.x < 163));
        const overlaps = (a, b) => a.x < b.right && a.x + a.width > b.left && a.y < b.bottom && a.y + a.height > b.top;
        const mask = document.createElement('canvas'); mask.width = pouchRect[2]; mask.height = pouchRect[3];
        const ink = mask.getContext('2d'); ink.imageSmoothingEnabled = false;
        ink.drawImage(pouch, 0, 0, mask.width, mask.height);
        const rgba = ink.getImageData(0, 0, mask.width, mask.height).data, opaque = [];
        for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
          if (rgba[(y * mask.width + x) * 4 + 3] >= 128) opaque.push({ x: x + pouchRect[0], y: y + pouchRect[1] });
        }
        const quiet = { left: BAG_PLAQUE.x + PLAQUE_TEXT_SLICE.left, right: BAG_PLAQUE.x + BAG_PLAQUE.width - PLAQUE_TEXT_SLICE.right,
          top: BAG_PLAQUE.y + PLAQUE_TEXT_SLICE.top, bottom: BAG_PLAQUE.y + BAG_PLAQUE.height - PLAQUE_TEXT_SLICE.bottom };
        const clearance = {
          pouch: opaque.length > 0 && opaque.every(pixel => pixel.x >= quiet.left && pixel.x < quiet.right && pixel.y >= quiet.top && pixel.y < quiet.bottom),
          marks: marks.length === 4 && marks.filter(mark => mark.color === HUD_COLORS.hit).length === state,
          icons: iconPixels.length > 0 && iconPixels.every(pixel => !texts.some(text => overlaps(pixel, text))),
          bag: texts.every(text => text.right <= BAG_PLAQUE.x || text.bottom <= BAG_PLAQUE.y || text.top >= BAG_PLAQUE.y + BAG_PLAQUE.height),
          hintAndNotice: !hint || !notice || texts.filter(text => text.text === hint)[0].top > texts.filter(text => text.text === notice)[0].bottom,
        };
        window.hudFixtureSample = { state, count: session.letterCount, health: run.health, gems: run.collectedGems.size,
          stars: run.specialTotal ? run.collectedSpecials.size + '/' + run.specialTotal : null, henryRect, clearance, pouchQuiet: quiet, pouchBounds: {
            left: Math.min(...opaque.map(p => p.x)), right: Math.max(...opaque.map(p => p.x)) + 1,
            top: Math.min(...opaque.map(p => p.y)), bottom: Math.max(...opaque.map(p => p.y)) + 1 },
          assets: [assets.atlas, assets.gems, assets.scenery?.background, assets.scenery?.foreground, pouch, henry, ...Object.values(ui)]
            .filter(Boolean).map(image => ({ source: new URL(image.src).pathname, loaded: image.complete && image.naturalWidth > 0 })) };
      };
      window.hudFixture = { bandPose() { ribbonBandPose = true; draw(); }, set(next, nextHint, nextNotice) { state = next; hint = nextHint; notice = nextNotice; draw(); } };
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => raf(time => { callback(time); draw(); });
    };
  })();` });
  expect(await page.evaluate(() => (window as unknown as { hudFixtureMissing: string[] }).hudFixtureMissing)).toEqual([]);
  await page.evaluate(({ level, run }) => (window as unknown as { createHudFixture(level: unknown, run: unknown): Promise<void> }).createHudFixture(level, run), { level, run: createRun(level) });
  const samples = [];
  for (const viewport of [{ width: 426, height: 240 }, { width: 320, height: 240 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    for (let state = 0; state <= 4; state++) {
      const hint = ['Arrows / A-D: move', 'Buttons 1–4: jump', RIBBON_INTRO, 'Space: jump', ''][state];
      const notice = [level.name, 'Checkpoint reached!', '', areaName(level, level.checkpoints.length - 1), ''][state];
      await page.evaluate(({ state, hint, notice }) => (window as unknown as { hudFixture: { set(s: number, h: string, n: string): void } }).hudFixture.set(state, hint, notice), { state, hint, notice });
      await twoFrames(page);
      const sample = await page.evaluate(() => (window as unknown as { hudFixtureSample: { count: number; clearance: Record<string, boolean>; assets: { loaded: boolean }[]; henryRect: { x: number; y: number; width: number; height: number } } }).hudFixtureSample);
      expect(sample.count).toBe(state); expect(sample.assets.every(asset => asset.loaded)).toBe(true);
      expect(sample.clearance).toEqual({ pouch: true, marks: true, icons: true, bag: true, hintAndNotice: true });
      // The actual sprite rectangle is clear of both top lanes and the bottom ribbon.
      expect(sample.henryRect.y).toBeGreaterThan(59);
      expect(sample.henryRect.x + sample.henryRect.width).toBeLessThan(TRAIL_RIBBON.x);
      await expectClearViewport(page);
      samples.push({ viewport, ...sample, hint, notice });
      await page.screenshot({ path: info.outputPath(`fixture-${level.id}-bag${state}-${viewport.width}.png`) });
      if (viewport.width === 426) {
        const png = await page.locator('#game').evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL().split(',')[1]);
        await writeFile(info.outputPath(`fixture-${level.id}-bag${state}-logical.png`), Buffer.from(png, 'base64'));
      }
    }
  }
  // Actual Henry atlas draw + actual HUD renderer, explicitly prepositioned
  // layout fixture. Its feet occupy the rail band; horizontal clearance is
  // therefore necessary, rather than passing because the sprite is above it.
  await page.evaluate(() => (window as unknown as { hudFixture: { bandPose(): void } }).hudFixture.bandPose());
  await twoFrames(page);
  const bandRect = await page.evaluate(() => (window as unknown as {
    hudFixtureSample: { henryRect: { x: number; y: number; width: number; height: number } };
  }).hudFixtureSample.henryRect);
  const bandHenry = { top: bandRect.y, bottom: bandRect.y + bandRect.height, right: bandRect.x + bandRect.width };
  expect(bandHenry.bottom).toBeGreaterThan(TRAIL_RIBBON.y);
  expect(bandHenry.top).toBeLessThan(TRAIL_RIBBON.y + TRAIL_RIBBON.height);
  expect(bandHenry.right).toBeLessThanOrEqual(TRAIL_RIBBON.x);
  await info.attach('actual-renderer-ribbon-band-pose', { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  await info.attach('ribbon-band-fixture-bounds', { body: JSON.stringify({ kind: 'actual renderer layout fixture, not input gameplay', bandHenry, ribbon: TRAIL_RIBBON }), contentType: 'application/json' });
  const glyphs = await kitTextProbe(page);
  expect(glyphs.checked).toContain(`${RIBBON_INTRO}|plaque`);
  for (const count of ['0', '1', '10', '99', '44', '1/3', '10/12', '3/3']) expect(glyphs.checked).toContain(`${count}|plaque`);
  expect(glyphs.violations).toEqual([]); expect(errors).toEqual([]);
  await writeFile(info.outputPath('fixture-provenance.json'), JSON.stringify({ kind: 'renderer layout fixture; no scene/run gameplay claims', level: level.id, samples, glyphs, runtimeImports }, null, 2));
});


test('compact HUD ribbon introduction follows real input and freezes during pause', async ({ page }, info) => {
  await observeKitTextClearance(page);
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.id === 'game') {
        if (x === 28 && y === 20) this.canvas.dataset.hudHint = '';
        if (x === 10 && y === 44) this.canvas.dataset.hudHint = text;
      }
      if (maxWidth === undefined) draw.call(this, text, x, y); else draw.call(this, text, x, y, maxWidth);
    };
  });
  await openAdventure(page, '/?debug=1');
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  const canvas = page.locator('#game');
  await expect(canvas).toHaveAttribute('data-hud-hint', 'Arrows / A-D: move');
  await page.keyboard.down('ArrowRight'); await twoFrames(page); await page.keyboard.up('ArrowRight');
  await expect(canvas).toHaveAttribute('data-hud-hint', 'Space: jump');
  await page.keyboard.press('Space');
  await expect(canvas).toHaveAttribute('data-hud-hint', RIBBON_INTRO);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.waitForTimeout(4300); // Longer than the cue's entire active-play lifetime.
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-hud-hint', RIBBON_INTRO);
  const captures = [];
  for (const viewport of [{ width: 426, height: 240 }, { width: 320, height: 240 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport); await twoFrames(page); await expectClearViewport(page);
    await expect(canvas).toHaveAttribute('data-hud-hint', RIBBON_INTRO);
    await page.screenshot({ path: info.outputPath(`gameplay-ribbon-intro-${viewport.width}.png`) });
    captures.push({ viewport, status: await page.locator('#status').innerText() });
  }
  await expect(canvas).toHaveAttribute('data-hud-hint', '');
  const glyphs = await kitTextProbe(page); expect(glyphs.violations).toEqual([]);
  await writeFile(info.outputPath('gameplay-provenance.json'), JSON.stringify({ kind: 'keyboard-driven gameplay; no scene/run mutation or clock acceleration', captures, glyphs }, null, 2));
});

/** Observe actual map glyph extents and loaded art without changing scene state. */
async function observeLandmarkLabels(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe = { labels: [] as { text: string; left: number; top: number; right: number; bottom: number }[],
      panel: [] as string[], assets: [] as string[] };
    Object.assign(window, { landmarkLabelProbe: probe });
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.id === 'game') {
        if (text === 'PATCHWORK VALE') { probe.labels = []; probe.panel = []; }
        if (['Plains', 'Quarry', 'Timbers', 'Sunset', 'Frost', 'Cove'].includes(text)) {
          const m = this.measureText(text);
          probe.labels.push({ text, left: x - m.actualBoundingBoxLeft, top: y - m.actualBoundingBoxAscent,
            right: x + m.actualBoundingBoxRight, bottom: y + m.actualBoundingBoxDescent });
          this.canvas.dataset.landmarkLabels = JSON.stringify(probe.labels.map(label => label.text));
        }
        if (x === 350 && (y === 63 || y === 76)) probe.panel.push(text);
        if (x === 415 && y === 20) this.canvas.dataset.gameplayTrail = text;
      }
      if (maxWidth === undefined) fillText.call(this, text, x, y); else fillText.call(this, text, x, y, maxWidth);
    };
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image: CanvasImageSource, ...args: number[]) {
      if (image instanceof HTMLImageElement && image.complete && !probe.assets.includes(image.src)) probe.assets.push(image.src);
      return Reflect.apply(drawImage, this, [image, ...args]);
    };
  });
}

for (const viewport of [{ width: 426, height: 240 }, { width: 320, height: 240 }, { width: 1366, height: 768 }]) {
  test(`landmark labels: real pointer, keyboard and native targets at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await observeLandmarkLabels(page);
    await installTrailPilot(page);
    await openAdventure(page, '/?debug=1');
    const canvas = page.locator('#game');
    const names = ['Plains', 'Quarry', 'Timbers', 'Sunset', 'Frost', 'Cove'];
    await expect(canvas).toHaveAttribute('data-landmark-labels', JSON.stringify(names));
    await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
    for (const [index, level] of LEVELS.entries()) {
      const target = page.getByRole('button', { name: level.name, exact: true });
      const box = (await canvas.boundingBox())!;
      const [x, y] = [[48, 88], [140, 88], [232, 88], [232, 176], [140, 176], [48, 176]][index];
      // The visible label sits in the added strip, below every old target.
      await page.mouse.click(box.x + (x + 11) * box.width / 426, box.y + (y + 38) * box.height / 240);
      await expect(target).toHaveAttribute('aria-pressed', 'true');
      await expect(target).toBeFocused();
      await expect(page.getByRole('button', { name: `Play ${level.name}`, exact: true })).toBeVisible();
      const measured = await page.evaluate(() => (window as unknown as { landmarkLabelProbe: { labels: { text: string; left: number; top: number; right: number; bottom: number }[]; panel: string[]; assets: string[] } }).landmarkLabelProbe);
      expect(measured.panel.join(' ')).toBe(level.name);
      expect(measured.labels.map(label => label.text)).toEqual(names);
      measured.labels.forEach((label, i) => {
        const [cx, cy] = [[48, 88], [140, 88], [232, 88], [232, 176], [140, 176], [48, 176]][i];
        expect(label.left).toBeGreaterThanOrEqual(cx - 10);
        expect(label.right).toBeLessThanOrEqual(cx + 32);
        expect(label.top).toBeGreaterThan(cy + 32);
        expect(label.bottom).toBeLessThanOrEqual(cy + 43);
      });
      expect(measured.assets.some(url => url.endsWith('/assets/overworld/landmarks.png'))).toBe(true);
      await info.attach(`${level.id}-window`, { body: await page.screenshot({ path: info.outputPath(`${level.id}-window.png`) }), contentType: 'image/png' });
      if (viewport.width === 426) await writeFile(info.outputPath(`${level.id}-logical.png`), Buffer.from((await canvas.evaluate(element => (element as HTMLCanvasElement).toDataURL())).split(',')[1], 'base64'));
      // Real key input selects the next destination, with the existing repeat guard.
      await page.keyboard.down('ArrowRight');
      await expect(page.getByRole('button', { name: LEVELS[(index + 1) % 6].name, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await releasedFrames(page);
      await expect(page.getByRole('button', { name: LEVELS[(index + 1) % 6].name, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.up('ArrowRight');
      await releasedFrames(page);
      const next = LEVELS[(index + 1) % 6];
      await page.getByRole('button', { name: `Play ${next.name}`, exact: true }).click();
      await expect(page.locator('#status')).toContainText('Playing');
      const openingArea = next.checkpoints.reduce((area, point, i) =>
        (next.progressAxis === 'y'
          ? (next.finish.y < next.start.y ? next.start.y <= point.y + 35 : next.start.y >= point.y - 35)
          : next.start.x >= point.x - 180) ? i : area, -1);
      const openingSection = next.sections?.filter(section => next.start.x >= section.x
        && next.start.y >= (section.minY ?? -Infinity) && next.start.y <= (section.maxY ?? Infinity)).at(-1);
      const openingLabel = next.sections ? openingSection?.name ?? next.name : (openingArea < 0 ? next.name : areaName(next, openingArea));
      if (next.id === 'frost') expect(openingLabel).toBe('FIRST SLIDE');
      await expect(canvas).toHaveAttribute('data-gameplay-trail', openingLabel);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Return to Trails', exact: true }).click();
      await page.getByRole('button', { name: 'Return to Trails', exact: true }).click();
      await expect(page.getByRole('button', { name: next.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
    await expect(page.getByRole('button', { name: /story|replay|view/i })).toHaveCount(0);
    await expectClearViewport(page);
    // Tab enters the next native target and selects it via real focus navigation.
    await page.getByRole('button', { name: 'PLAINS', exact: true }).click();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'QUARRY RUN', exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: 'QUARRY RUN', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(page.locator('#status')).toContainText('Title');
    await page.getByRole('button', { name: 'Play QUARRY RUN', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Playing');
    await expect(canvas).toHaveAttribute('data-gameplay-trail', 'QUARRY RUN');
    await page.reload(); await waitForMap(page);
    await expect(page.getByRole('button', { name: 'PLAINS', exact: true })).toHaveAttribute('aria-pressed', 'true');
    for (const level of LEVELS) await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-description', 'Ready to explore');
  });
}

for (const [selection, trail] of LEVELS.entries()) test(`landmark labels: renderer fixture ${trail.id} clears real art, paths, frames, badges and Henry in every completion state`, async ({ page }, info) => {
  // Use the actual map method and its complete renderer dependency graph. These
  // explicit presentation states are not completed gameplay or scene mutations.
  const names = ['world/camera.ts', 'game/platforms.ts', 'game/movement.ts', 'art/henry.ts', 'art/animation.ts', 'art/interface-kit.ts', 'game/education.ts',
    'world/scenery.ts', 'world/cove-terrain.ts', 'world/surface-materials.ts', 'world/assets.ts', 'world/trail-presentation.ts', 'world/ambient-weather.ts',
    'world/renderer.ts', 'game/reward-result.ts', 'game/overworld.ts'];
  const modules = names.map(name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8'));
  const runtimeImports = [...new Set(modules.flatMap(source => [...source.matchAll(/^import (?!type )\{([^}]*)\} from .*;$/gm)]
    .flatMap(([, names]) => names.split(',').map(name => name.trim()).filter(name => name && !name.startsWith('type ')))))];
  const declarations = (name: string, source: string) => transformSync(name, source.replace(/^import .*;\n/gm, '')
    .replace(/\bexport /g, '').replaceAll('import.meta.env.BASE_URL', JSON.stringify('./')), {}).code;
  const scene = readFileSync(new URL('../src/game/adventure-scene.ts', import.meta.url), 'utf8');
  const start = scene.indexOf('  private drawMap('), end = scene.indexOf('\n  selectDestination(', start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  const method = declarations('draw-map.ts', scene.slice(start, end).replace('private drawMap(', 'function drawMap('));
  expect(runtimeImports).toEqual(expect.arrayContaining(['loadImage', 'drawGem', 'drawSpecial', 'drawRewardResult', 'drawKitButton', 'drawKitFrame']));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openAdventure(page, '/');
  await page.addScriptTag({ content: `(() => {
    ${modules.map((source, i) => declarations(names[i], source)).join('\n')}
    const LEVELS = ${JSON.stringify(LEVELS)};
    ${method}
    window.mapFixtureMissing = [${[...runtimeImports, 'animationFrame', 'advanceMapMarker', 'TRAIL_WORDS', 'drawOverworld', 'drawWorld', 'drawMap', 'platformBodiesAt', 'drawTimberTrunk', 'drawSiteFrame'].map(name => `typeof ${name} === 'undefined' && ${JSON.stringify(name)}`).join(', ')}].filter(Boolean);
    window.createMapFixture = async () => {
      const [titleArtwork, landmarks, mapBackground, gems, ui, henry] = await Promise.all([
        loadImage('/assets/title/tiny-turbo-trails-v2.png'), loadImage('/assets/overworld/landmarks.png'),
        loadImage('/assets/overworld/background.png'), loadImage('/assets/gems/gems.png'), loadInterfaceKit(), loadHenry()]);
      const previews = await Promise.all(LEVELS.map(async level => {
        const assets = await loadWorldAssets(level.atlas), canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
        const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
        const camera = new Camera({ width: 426, height: 240, worldWidth: level.width,
          worldHeight: level.height, vertical: level.verticalCamera || level.progressAxis === 'y', lead: level.cameraLead });
        if (level.verticalCamera || level.progressAxis === 'y') camera.update(level.start.x, level.start.y - 34);
        drawWorld(ctx, assets, level, camera, undefined, undefined,
          level.verticalCamera || level.progressAxis === 'y' ? platformBodiesAt(level.platforms, 0) : [], 0, true);
        drawWorldForeground(ctx, assets, level, camera);
        return canvas;
      }));
      const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
      const ink = document.createElement('canvas'); ink.width = 426; ink.height = 240;
      const mask = ink.getContext('2d', { willReadFrequently: true }); mask.imageSmoothingEnabled = false;
      const pathCanvas = document.createElement('canvas'); pathCanvas.width = 426; pathCanvas.height = 240;
      const pathMask = pathCanvas.getContext('2d', { willReadFrequently: true });
      const drawImage = ctx.drawImage.bind(ctx), fillText = ctx.fillText.bind(ctx), fillRect = ctx.fillRect.bind(ctx), strokeRect = ctx.strokeRect.bind(ctx);
      let recording = false, glyphs = [], selected = 0, completed = 0, marker = { x: 48, y: 88 };
      ctx.drawImage = (image, ...args) => {
        if (recording && (image === landmarks || image === henry.atlas)) mask.drawImage(image, ...args);
        drawImage(image, ...args);
      };
      ctx.fillRect = (x, y, w, h) => {
        if (recording && ctx.fillStyle === '#788c63') pathMask.fillRect(x, y, w, h);
        // The narrow backing intentionally bridges one dotted segment below
        // Timbers. It clears path ink only, never landmark or marker pixels.
        if (recording && ctx.fillStyle === '#e9f2df' && w === 44 && h === 10) pathMask.clearRect(x, y, w, h);
        if (recording && w === 15 && h === 14) mask.fillRect(x, y, w, h);
        fillRect(x, y, w, h);
      };
      ctx.strokeRect = (x, y, w, h) => {
        if (recording && w === 70 && h === 60) { mask.lineWidth = ctx.lineWidth; mask.strokeRect(x, y, w, h); }
        strokeRect(x, y, w, h);
      };
      ctx.fillText = (text, x, y) => {
        if (recording && LANDMARK_LABELS.includes(text)) {
          const m = ctx.measureText(text); glyphs.push({ text, left: x - m.actualBoundingBoxLeft, right: x + m.actualBoundingBoxRight,
            top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent });
        }
        fillText(text, x, y);
      };
      const adapter = { selectedIndex: 0, session: new TrailSession(), titleArtwork, landmarks, mapBackground, ui, world: { gems }, henry,
        preview: () => previews[selected], marker, reducedMotion: false, elapsed: 0, inputSource: 'keyboard', education: { stickers: [] } };
      const draw = () => {
        adapter.selectedIndex = selected; adapter.session.results.clear();
        LEVELS.forEach((level, i) => { if (completed & (1 << i)) adapter.session.mark(level, 2, 1); });
        adapter.session.returnedSeconds = completed ? 1 : 0;
        mask.clearRect(0, 0, 426, 240); pathMask.clearRect(0, 0, 426, 240);
        glyphs = []; recording = true; drawMap.call(adapter, ctx); recording = false;
      };
      window.mapFixture = {
        set(next, completion, from = next, blend = 1) {
          selected = next; completed = completion;
          marker.x = MAP_POINTS[from][0]; marker.y = MAP_POINTS[from][1];
          for (let frame = 0; frame < Math.round(blend * 80); frame++) advanceMapMarker(marker, MAP_POINTS[next], 1 / 60, false);
          draw();
          const pixels = mask.getImageData(0, 0, 426, 240).data;
          const pathPixels = pathMask.getImageData(0, 0, 426, 240).data;
          const collisions = [];
          for (const glyph of glyphs) for (let y = Math.floor(glyph.top); y < Math.ceil(glyph.bottom); y++)
            for (let x = Math.floor(glyph.left); x < Math.ceil(glyph.right); x++) if (pixels[(y * 426 + x) * 4 + 3] || pathPixels[(y * 426 + x) * 4 + 3]) collisions.push({ text: glyph.text, x, y });
          return { selected, completed, marker: { ...marker }, glyphs, collisions, assets: [titleArtwork, landmarks, mapBackground, gems, henry.atlas, ...Object.values(ui)]
            .map(image => ({ source: new URL(image.src).pathname, loaded: image.complete && image.naturalWidth > 0 })) };
        }
      };
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => raf(time => { callback(time); draw(); });
    };
  })();` });
  expect(await page.evaluate(() => (window as unknown as { mapFixtureMissing: string[] }).mapFixtureMissing)).toEqual([]);
  await page.evaluate(() => (window as unknown as { createMapFixture(): Promise<void> }).createMapFixture());
  const set = (selected: number, mask: number, from = selected, blend = 1) => page.evaluate(args =>
    (window as unknown as { mapFixture: { set(s: number, m: number, f: number, b: number): { collisions: unknown[]; glyphs: unknown[]; assets: { loaded: boolean }[] } } }).mapFixture.set(...args as [number, number, number, number]), [selected, mask, from, blend]);
  // All 64 badge combinations with every selected frame, not just a mock rectangle.
  const samples = await page.evaluate(selected => {
    const fixture = (window as unknown as { mapFixture: { set(s: number, m: number): { selected: number; completed: number; glyphs: unknown[]; assets: { loaded: boolean }[]; collisions: unknown[] } } }).mapFixture;
    return Array.from({ length: 64 }, (_, mask) => fixture.set(selected, mask));
  }, selection);
  for (const sample of samples) {
    expect(sample.glyphs).toHaveLength(6); expect(sample.assets.every(asset => asset.loaded)).toBe(true);
    expect(sample.collisions, `selection ${sample.selected}, completion ${sample.completed}`).toEqual([]);
  }
  // Arbitrary pointer jumps can cross rows as well as adjacent destinations.
  const transitions = await page.evaluate(selected => {
    const fixture = (window as unknown as { mapFixture: { set(s: number, m: number, f: number, b: number): { collisions: unknown[] } } }).mapFixture;
    const samples = [];
    for (let from = 0; from < 6; from++) for (let frame = 0; frame <= 80; frame++) {
      samples.push({ from, selected, frame, ...fixture.set(selected, 63, from, frame / 80) });
    }
    return samples;
  }, selection);
  for (const sample of transitions) {
    expect(sample.collisions, `Henry ${sample.from} -> ${sample.selected} at frame ${sample.frame}`).toEqual([]);
  }
  for (const viewport of [{ width: 426, height: 240 }, { width: 320, height: 240 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await set(selection, 63);
    await twoFrames(page);
    await page.screenshot({ path: info.outputPath(`fixture-${trail.id}-completed-${viewport.width}.png`) });
    if (viewport.width === 426) await writeFile(info.outputPath(`fixture-${trail.id}-completed-logical.png`), Buffer.from((await page.locator('#game').evaluate(element => (element as HTMLCanvasElement).toDataURL())).split(',')[1], 'base64'));
  }
  expect(errors).toEqual([]);
  await writeFile(info.outputPath('fixture-provenance.json'), JSON.stringify({ kind: 'actual renderer fixture; no scene/run gameplay claims', selection, trail: trail.id, names, runtimeImports, samples, transitions }, null, 2));
});

test('landmark labels: native label hits and controller selection survive resize and browser fullscreen', async ({ page }, info) => {
  await observeLandmarkLabels(page);
  await installTrailPilot(page);
  await openAdventure(page, '/');
  const state = () => page.evaluate(() => document.fullscreenElement?.tagName ?? null);
  const verify = async (phase: string): Promise<void> => {
    await twoFrames(page);
    await expectClearViewport(page);
    for (const [index, level] of LEVELS.entries()) {
      const canvas = (await page.locator('#game').boundingBox())!;
      const [x, y] = [[48, 88], [140, 88], [232, 88], [232, 176], [140, 176], [48, 176]][index];
      const target = page.getByRole('button', { name: level.name, exact: true });
      const bounds = (await target.boundingBox())!;
      expect(bounds.x).toBeCloseTo(canvas.x + (x - 35) * canvas.width / 426, 1);
      expect(bounds.y).toBeCloseTo(canvas.y + (y - 30) * canvas.height / 240, 1);
      expect(bounds.width).toBeCloseTo(70 * canvas.width / 426, 1);
      expect(bounds.height).toBeCloseTo(73 * canvas.height / 240, 1);
      await page.mouse.click(canvas.x + (x + 11) * canvas.width / 426, canvas.y + (y + 38) * canvas.height / 240);
      await expect(target).toBeFocused(); await expect(target).toHaveAttribute('aria-pressed', 'true');
    }
    await acknowledgeTrailNeutral(page);
    for (const level of LEVELS) {
      await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[15].pressed = true; });
      await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await releasedFrames(page);
      await expect(page.getByRole('button', { name: level.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.evaluate(() => { (window as unknown as { trailPad: { buttons: { pressed: boolean }[] } }).trailPad.buttons[15].pressed = false; });
      await releasedFrames(page);
    }
    await info.attach(phase, { body: await page.screenshot({ path: info.outputPath(`${phase}.png`) }), contentType: 'image/png' });
  };
  await page.setViewportSize({ width: 320, height: 240 }); await verify('resized-small');
  await page.setViewportSize({ width: 1366, height: 768 }); await verify('resized-desktop');
  const supported = await page.evaluate(() => document.fullscreenEnabled);
  await info.attach('fullscreen-capability', { body: JSON.stringify({ supported }), contentType: 'application/json' });
  if (supported) {
    await page.locator('#pause').evaluate(button => button.addEventListener('click', () => { void document.querySelector('main')!.requestFullscreen(); }, { once: true }));
    await page.locator('#pause').click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect.poll(state).toBe('MAIN'); await verify('fullscreen');
    await page.evaluate(() => document.exitFullscreen());
    await expect.poll(state).toBeNull(); await verify('fullscreen-exit');
  }
  await page.getByRole('button', { name: 'PLAINS', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'QUARRY RUN', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'QUARRY RUN', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('visible Pause exposes independent settings with native focus and no held activation leak', async ({ page }, info) => {
  await openAdventure(page, '/?debug=1');
  const pause = page.getByRole('button', { name: 'Pause', exact: true });
  const resume = page.getByRole('button', { name: 'Resume', exact: true });
  const sound = page.getByRole('button', { name: 'Sound', exact: true });
  const rumble = page.getByRole('button', { name: 'Controller rumble', exact: true });
  await expect(pause).toBeVisible();
  await pause.click();
  await expect(resume).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Pause navigation' })).toHaveAttribute('aria-description', /Space\/Enter.*M: sound/);
  await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toHaveCount(0);
  for (const [s, r] of [[true, true], [false, true], [false, false], [true, false]]) {
    await expect(sound).toHaveAttribute('aria-pressed', String(s));
    await expect(rumble).toHaveAttribute('aria-pressed', String(r));
    await sound.focus(); await expect(sound).toBeFocused();
    await rumble.focus(); await expect(rumble).toBeFocused();
    await expect(sound).toHaveAttribute('aria-pressed', String(s));
    await expect(rumble).toHaveAttribute('aria-pressed', String(r));
    const toggle = s === r ? sound : rumble;
    await toggle.focus(); await page.keyboard.down('Space');
    await page.keyboard.down('Space');
    await expect(resume).toBeVisible();
    await page.keyboard.up('Space');
  }
  await page.keyboard.press('m');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await expect(rumble).toHaveAttribute('aria-pressed', 'true');
  await resume.click();
  await expect(page.getByRole('button', { name: 'Play PLAINS', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  await page.waitForTimeout(250);
  const standing = (await page.locator('#status').innerText()).match(/X \d+ Y \d+/)![0];
  for (const width of [426, 320, 1366]) {
    await page.emulateMedia({ reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 240 });
    const geometry = await pause.evaluate(button => {
      const bounds = button.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(button);
      const glyphs = range.getBoundingClientRect();
      return { quiet: glyphs.left >= bounds.left + 6 && glyphs.right <= bounds.right - 6
        && glyphs.top >= bounds.top + 6 && glyphs.bottom <= bounds.bottom - 6,
        hit: button.contains(document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)) };
    });
    expect(geometry).toEqual({ quiet: true, hit: true });
    await pause.focus(); await page.keyboard.down('Enter');
    await expect(resume).toBeFocused();
    await page.keyboard.down('Enter');
    await expect(resume).toBeVisible();
    await page.keyboard.up('Enter');
    await expectClearViewport(page);
    await info.attach(`visible-pause-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    await resume.focus(); await page.keyboard.down('Space');
    await expect(page.locator('#game')).toBeFocused();
    await page.keyboard.down('Space'); await page.keyboard.up('Space');
    await expect(page.locator('#status')).toContainText(standing);
  }
  await pause.click();
  await page.evaluate(() => {
    for (const [type, code] of [['keydown', 'Escape'], ['keydown', 'ArrowRight'], ['keyup', 'ArrowRight'], ['keyup', 'Escape']])
      window.dispatchEvent(new KeyboardEvent(type, { code }));
  });
  await expect(page.locator('#status')).toContainText('Playing');
  await page.waitForTimeout(200);
  await expect(page.locator('#status')).toContainText(standing);
});

test('pause settings controller states survive navigation, disconnect, visibility and word return', async ({ page }, info) => {
  await observeKitTextClearance(page);
  await page.addInitScript(() => {
    const pad = { connected: true, mapping: 'standard', index: 0, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pad.connected ? [pad] : [] });
    Object.assign(window, { settingsPad: pad });
  });
  const edge = async (index: number, pressed: boolean) => {
    await page.evaluate(({ index, pressed }) => { (window as unknown as { settingsPad: { buttons: { pressed: boolean }[] } }).settingsPad.buttons[index].pressed = pressed; }, { index, pressed });
    await twoFrames(page);
  };
  const tap = async (index: number) => { await edge(index, true); await edge(index, false); };
  const sound = page.getByRole('button', { name: 'Sound', exact: true });
  const rumble = page.getByRole('button', { name: 'Controller rumble', exact: true });
  const resume = page.getByRole('button', { name: 'Resume', exact: true });
  await openAdventure(page, '/?debug=1');
  await tap(9); await expect(resume).toBeFocused();
  await tap(15); await expect(sound).toBeFocused();
  await edge(0, true); await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await twoFrames(page); await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await edge(0, false);
  await tap(15); await expect(rumble).toBeFocused();
  await expect(rumble).toHaveAttribute('aria-pressed', 'true');
  await tap(0); await expect(rumble).toHaveAttribute('aria-pressed', 'false');
  await tap(14); await expect(sound).toBeFocused();
  await tap(0); await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await expect(rumble).toHaveAttribute('aria-pressed', 'false');
  await tap(15); await tap(0);
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await expect(rumble).toHaveAttribute('aria-pressed', 'true');
  await info.attach('controller-settings', { body: await page.screenshot(), contentType: 'image/png' });
  await page.evaluate(() => {
    (window as unknown as { settingsPad: { connected: boolean } }).settingsPad.connected = false;
    window.dispatchEvent(new Event('gamepaddisconnected'));
  });
  await page.keyboard.press('m');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await expect(rumble).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(resume).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus'));
  });
  await expect(resume).toBeFocused();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await resume.click();
  await page.getByRole('button', { name: 'Open stickers', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Play PLAINS', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(resume).toBeFocused();
  await expect(page.getByRole('button', { name: 'Return to Trails', exact: true })).toHaveCount(0);
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await expect(rumble).toHaveAttribute('aria-pressed', 'true');
  const glyphs = await kitTextProbe(page);
  expect(glyphs.checked).toEqual(expect.arrayContaining(['Sound: On|button', 'Sound: Off|button-selected', 'Rumble: Off|button-selected']));
  expect(glyphs.violations).toEqual([]);
});

/** Observe the real app after each rendered frame, without changing its clock/input/scene. */
async function pauseCharacterizationFrames(page: Page, count: number) {
  return page.evaluate(count => new Promise<{ status: string; x: number | null; y: number | null; velocity: number | null; focus: string | null }[]>(resolve => {
    const frames: { status: string; x: number | null; y: number | null; velocity: number | null; focus: string | null }[] = [];
    const sample = () => {
      const status = document.querySelector('#status')!.textContent!;
      const position = status.match(/X (-?\d+) Y (-?\d+) V (-?\d+)/);
      frames.push({ status, x: position ? Number(position[1]) : null, y: position ? Number(position[2]) : null,
        velocity: position ? Number(position[3]) : null, focus: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.id ?? null });
      if (frames.length === count) resolve(frames);
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }), count);
}

async function installPauseCharacterizationKeys(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const events: { type: string; code: string; repeat: boolean; target: string | null }[] = [];
    Object.assign(window, { pauseCharacterizationKeys: events });
    for (const type of ['keydown', 'keyup']) window.addEventListener(type, event => {
      const key = event as KeyboardEvent;
      const target = key.target instanceof Element ? key.target : null;
      events.push({ type, code: key.code, repeat: key.repeat, target: target?.getAttribute('aria-label') ?? target?.id ?? null });
    }, true);
  });
}

for (const key of ['Space', 'Enter'] as const) {
  test(`pause characterization: real Tab and held ${key} enter Pause without activating Resume or settings`, async ({ page, browser }, info) => {
    await installPauseCharacterizationKeys(page);
    await openAdventure(page, '/?debug=1');
    await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
    const canvas = page.locator('#game');
    const pause = page.getByRole('button', { name: 'Pause', exact: true });
    const resume = page.getByRole('button', { name: 'Resume', exact: true });
    const sound = page.getByRole('button', { name: 'Sound', exact: true });
    const rumble = page.getByRole('button', { name: 'Controller rumble', exact: true });
    const standing = (await pauseCharacterizationFrames(page, 30)).at(-1)!;
    expect(standing.status).toContain('Playing'); expect(standing.velocity).toBe(0);
    await canvas.focus();
    await page.keyboard.press('Tab');
    await expect(pause).toBeFocused();
    await page.keyboard.down(key);
    await expect(resume).toBeFocused();
    const paused = [];
    for (let repeat = 0; repeat < 3; repeat++) {
      await page.keyboard.down(key);
      paused.push(...await pauseCharacterizationFrames(page, 6));
      await expect(resume).toBeFocused();
      await expect(sound).toHaveAttribute('aria-pressed', 'true');
      await expect(rumble).toHaveAttribute('aria-pressed', 'true');
    }
    await page.keyboard.up(key);
    paused.push(...await pauseCharacterizationFrames(page, 6));
    for (const frame of paused) {
      expect(frame.status).toBe('Paused · Escape to resume'); expect(frame.focus).toBe('Resume');
    }
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await expect(rumble).toHaveAttribute('aria-pressed', 'true');
    // Only a fresh activation may Resume. Watch subsequent frames for transient jumps.
    await page.keyboard.press(key);
    await expect(canvas).toBeFocused();
    const resumed = await pauseCharacterizationFrames(page, 30);
    for (const frame of resumed) {
      expect(frame.status).toContain('Playing'); expect(frame.focus).toBe('Letter bag: 0/4');
      expect([frame.x, frame.y, frame.velocity]).toEqual([standing.x, standing.y, 0]);
    }
    const events = await page.evaluate(() => (window as unknown as {
      pauseCharacterizationKeys: { type: string; code: string; repeat: boolean; target: string | null }[];
    }).pauseCharacterizationKeys);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'keydown', code: key, repeat: false, target: 'Pause' }),
      expect.objectContaining({ type: 'keydown', code: key, repeat: true, target: 'Resume' }),
      expect.objectContaining({ type: 'keyup', code: key, target: 'Resume' }),
      expect.objectContaining({ type: 'keydown', code: key, repeat: false, target: 'Resume' }),
    ]));
    await writeFile(info.outputPath('native-key-events.jsonl'), events.map(event => JSON.stringify(event)).join('\n') + '\n');
    await info.attach('native-key-events', { path: info.outputPath('native-key-events.jsonl'), contentType: 'application/x-ndjson' });
    await info.attach('characterization-frames', { body: JSON.stringify({ engine: info.project.name, browser: browser.version(), key, standing, paused, resumed }), contentType: 'application/json' });
  });
}

for (const method of ['Escape', 'Enter on Resume'] as const) {
  test(`pause characterization: old held ArrowRight stays released after ${method} until a fresh press`, async ({ page, browser }, info) => {
    await installPauseCharacterizationKeys(page);
    await openAdventure(page, '/?debug=1');
    await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
    const standing = (await pauseCharacterizationFrames(page, 30)).at(-1)!;
    await page.keyboard.down('ArrowRight');
    await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1])).toBeGreaterThan(standing.x! + 5);
    // The old Right remains physically held throughout entry, Resume and repeat.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
    await pauseCharacterizationFrames(page, 6);
    await page.keyboard.press(method === 'Escape' ? 'Escape' : 'Enter');
    await expect(page.locator('#game')).toBeFocused();
    const transition = await pauseCharacterizationFrames(page, 30);
    for (const frame of transition) {
      expect(frame.status).toContain('Playing'); expect(frame.y).toBe(standing.y);
    }
    // Existing player inertia may brake after Resume; it must settle without a
    // new movement edge. The repeat itself must cause no further movement.
    const settled = transition.at(-1)!;
    expect(settled.velocity).toBe(0);
    await page.keyboard.down('ArrowRight'); // Playwright emits repeat:true, before keyup.
    const repeated = await pauseCharacterizationFrames(page, 24);
    for (const frame of repeated) expect([frame.x, frame.y, frame.velocity]).toEqual([settled.x, settled.y, 0]);
    await page.keyboard.up('ArrowRight');
    const released = await pauseCharacterizationFrames(page, 6);
    for (const frame of released) expect([frame.x, frame.y, frame.velocity]).toEqual([settled.x, settled.y, 0]);
    await page.keyboard.down('ArrowRight');
    const fresh = await pauseCharacterizationFrames(page, 12);
    await page.keyboard.up('ArrowRight');
    expect(fresh.at(-1)!.x).toBeGreaterThan(settled.x! + 5);
    expect(fresh.some(frame => frame.velocity! > 0)).toBe(true);
    const events = await page.evaluate(() => (window as unknown as {
      pauseCharacterizationKeys: { type: string; code: string; repeat: boolean; target: string | null }[];
    }).pauseCharacterizationKeys);
    const arrows = events.filter(event => event.code === 'ArrowRight');
    expect(arrows.map(({ type, repeat }) => [type, repeat])).toEqual([
      ['keydown', false], ['keydown', true], ['keyup', false], ['keydown', false], ['keyup', false],
    ]);
    await writeFile(info.outputPath('native-key-events.jsonl'), events.map(event => JSON.stringify(event)).join('\n') + '\n');
    await info.attach('native-key-events', { path: info.outputPath('native-key-events.jsonl'), contentType: 'application/x-ndjson' });
    await info.attach('characterization-frames', { body: JSON.stringify({ engine: info.project.name, browser: browser.version(), method, standing, transition, settled, repeated, released, fresh }), contentType: 'application/json' });
  });
}


test('trail pilot: sampled neutral rearms fresh controls after native Resume', async ({ page }, info) => {
  await installTrailPilot(page);
  await openAdventure(page, '/?debug=1');
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  await page.locator('#pause').click();
  const start = await page.evaluate(() => {
    const pilot = (window as unknown as { trailPilot: { polls: number; active: boolean; controller: boolean; inputEvents: object[] } }).trailPilot;
    // Deliberately activate in the same event turn after the app's native Resume handler.
    // This is a mechanism fixture, not a replay of historical CI.
    window.addEventListener('click', () => {
      Object.assign(pilot, { active: true, controller: true });
      pilot.inputEvents.push({ kind: 'forced-start', time: performance.now(), after: pilot.polls });
    }, { once: true });
    return pilot.polls;
  });
  try {
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { trailPilot: { polls: number } }).trailPilot.polls)).toBeGreaterThan(start + 30);
    await expect(page.locator('#status')).toContainText(new RegExp(`Playing.*X ${PLAINS_LEVEL.start.x} Y ${PLAINS_LEVEL.start.y - DEFAULT_MOVEMENT.height} V 0(?:\\s|$)`));
    await acknowledgeTrailNeutral(page);
    await page.evaluate(() => { (window as unknown as { trailPilot: { active: boolean } }).trailPilot.active = true; });
    await expect.poll(async () => Number((await page.locator('#status').innerText()).match(/X (\d+)/)?.[1])).toBeGreaterThan(60);
    await info.attach('pilot-rearmed', { body: await page.screenshot(), contentType: 'image/png' });
  } finally {
    await writeFile(info.outputPath('trail-pilot-input.jsonl'), await page.evaluate(() =>
      (window as unknown as { trailPilot: { inputEvents: object[] } }).trailPilot.inputEvents.map(event => JSON.stringify(event)).join('\n') + '\n'));
  }
});


test('Plains compact route: all rewards through keyboard input with five-section gameplay captures', async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 426, height: 300 });
  const targets = PLAINS_LEVEL.entities.filter(e => e.kind === 'gem' || e.kind === 'special').sort((a, b) => a.x - b.x);
  await page.addInitScript(installPlainsRewardPilot, targets);
  await observeKitTextClearance(page);
  await openAdventure(page, '/?debug=1');
  const canvas = page.locator('#game');
  expect((await canvas.boundingBox())!.width).toBe(426);
  expect((await canvas.boundingBox())!.height).toBe(240);
  await page.getByRole('button', { name: 'Play PLAINS', exact: true }).click();
  await page.evaluate(() => { (window as unknown as { plainsPilot: { active: boolean } }).plainsPilot.active = true; });
  const captures = [];
  try {
    for (const name of ['meadow-hop', 'H', 'downhill-takeoff', 'downhill-runout', 'orchard-star', 'I', 'spring-arc', 'spring-landing', 'L1', 'L2', 'final-crest']) {
      await page.waitForFunction(name => {
        const pilot = (window as unknown as { plainsPilot: { frozen: boolean; capture: string } }).plainsPilot;
        return pilot.frozen && pilot.capture === name;
      }, name, { timeout: 20_000 });
      const viewports = info.project.name === 'chromium' ?
        [{ width: 426, height: 300 }, ...(['meadow-hop', 'orchard-star', 'spring-landing', 'final-crest'].includes(name) ? [{ width: 1366, height: 768 }, { width: 320, height: 240 }] : [])] : [];
      for (const viewport of viewports) {
        await page.setViewportSize(viewport); await twoFrames(page); await expectClearViewport(page);
        const path = info.outputPath(`input-${name}-${viewport.width}.png`);
        if (viewport.width === 426) await canvas.screenshot({ path }); else await page.screenshot({ path });
        captures.push({ scenario: name, viewport, file: path, status: await page.locator('#status').innerText(), canvas: await canvas.boundingBox() });
      }
      await page.setViewportSize({ width: 426, height: 300 }); await twoFrames(page);
      expect((await canvas.boundingBox())!.width).toBe(426);
      await page.evaluate(() => { (window as unknown as { plainsPilot: { frozen: boolean } }).plainsPilot.frozen = false; });
    }
    await expectResultsFirst(page, 'Next trail', 20_000);
    await expect(canvas).toHaveAttribute('data-stars', '3/3');
    await expect(page.locator('#status')).toContainText('Gems 33/33');
    await page.getByRole('button', { name: 'Build your word', exact: true }).click();
    for (const label of ['Letter H', 'Letter I', 'Letter L 1', 'Letter L 2']) await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    const observed = await page.evaluate(() => (window as unknown as { plainsPilot: unknown }).plainsPilot);
    const glyphs = await kitTextProbe(page);
    expect(glyphs.checked.length).toBeGreaterThan(0);
    expect(glyphs.violations).toEqual([]);
    await writeFile(info.outputPath('plains-input-provenance.json'), JSON.stringify({ kind: 'keyboard input through real app; rendered observations; no scene mutation', sourceRevision: process.env.BROWSER_REPORT_SOURCE_SHA, project: info.project.name, browserVersion: browser.version(), captures, observed, glyphs, errors }, null, 2));
  }
});

async function driveQuarry(page: Page, route: QuarryWaypoint[]): Promise<void> {
  await page.evaluate(route => {
    const pilot = (window as unknown as { quarryPilot: object }).quarryPilot;
    Object.assign(pilot, { route, index: 0, stageFrames: 0, jumped: false, active: true, frozen: false, error: '' });
  }, route);
  await page.waitForFunction(() => !(window as unknown as { quarryPilot: { active: boolean } }).quarryPilot.active, undefined, { timeout: 110_000 });
  const result = await page.evaluate(() => {
    const { index, error, observations } = (window as unknown as { quarryPilot: { index: number; error: string; observations: object[] } }).quarryPilot;
    return { index, error, observations };
  });
  expect(result.error).toBe('');
  if (route.at(-1)?.tag === 'finish') await expect(page.locator('#status')).toContainText('Finish');
  else expect(result.index).toBe(route.length);
}

async function startQuarryPilot(page: Page): Promise<void> {
  await page.addInitScript(installQuarryPilotScript);
  await page.setViewportSize({ width: 426, height: 300 });
  await openAdventure(page, '/?scene=adventure&debug=1');
  await page.getByRole('button', { name: 'QUARRY RUN', exact: true }).click();
  await page.getByRole('button', { name: 'Play QUARRY RUN', exact: true }).click();
  await twoFrames(page);
  expect((await page.locator('#game').boundingBox())!.width).toBe(426);
  expect((await page.locator('#game').boundingBox())!.height).toBe(240);
}

async function quarryFinish(page: Page): Promise<void> {
  await driveQuarry(page, [{ x: 710, y: 980, tag: 'finish' }]);
}


test('Quarry vertical journey: native floor finish, actual ROCK return, all side stars and replay', { lock: 'native-route' }, async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await observeTrailRibbon(page);
  await page.addInitScript(() => {
    const text = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(value, x, y, maxWidth) {
      if (this.canvas.id === 'game' && x === 168 && y === 20 && /^\d\/3$/.test(value)) this.canvas.dataset.quarryStars = value;
      return maxWidth === undefined ? text.call(this, value, x, y) : text.call(this, value, x, y, maxWidth);
    };
  });
  await startQuarryPilot(page);
  const framingObservations: object[] = [];
  const capture = async (name: string) => {
    await page.evaluate(() => { (window as unknown as { quarryPilot: { frozen: boolean } }).quarryPilot.frozen = true; });
    for (const viewport of [{ width: 426, height: 300 }, { width: 320, height: 240 }, { width: 1366, height: 768 }]) {
      await page.setViewportSize(viewport); await twoFrames(page);
      await expectClearViewport(page);
      const frame = await page.evaluate(() => document.querySelector('#status')!.textContent!.includes('Playing')
        ? (window as unknown as { quarryPilot: { frame: { henry: { y: number; height: number }; supports: object[] } } }).quarryPilot.frame : null);
      if (frame) {
        expect(frame.supports.length).toBeGreaterThan(0);
        expect(frame.henry.y).toBeGreaterThanOrEqual(59);
        expect(frame.henry.y + frame.henry.height).toBeLessThanOrEqual(221);
        framingObservations.push({ name, viewport, ...frame });
      }
      await info.attach(`${name}-${viewport.width}`, { body: await page.screenshot({ path: info.outputPath(`${name}-${viewport.width}.png`) }), contentType: 'image/png' });
    }
    await page.setViewportSize({ width: 426, height: 300 }); await twoFrames(page);
    expect((await page.locator('#game').boundingBox())!.width).toBe(426);
    expect((await page.locator('#game').boundingBox())!.height).toBe(240);
    await page.evaluate(() => { (window as unknown as { quarryPilot: { frozen: boolean } }).quarryPilot.frozen = false; });
  };
  await capture('quarry-rim');
  for (const target of QUARRY_DESCENT) {
    await driveQuarry(page, [target]);
    if ([420,700,980].includes(target.y)) await capture(`quarry-landing-${target.y}`);
  }
  await expect(page.locator('#status')).toContainText('Letter bag: 0/4');
  await expect(page.locator('#game')).toHaveAttribute('data-quarry-stars', '0/3');
  const floorMarker = Number(await page.locator('#game').getAttribute('data-ribbon-marker'));
  await quarryFinish(page);
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  await expect(page.locator('#status')).toContainText('X 470');
  await twoFrames(page);
  await expect(page.locator('#status')).toContainText('Playing');
  await capture('quarry-floor-return');
  for (const target of QUARRY_RETURN) {
    await driveQuarry(page, [target]);
    if (/wait | up$|^R$|^O$|^C letter$/.test(target.tag)) await capture(`quarry-${target.tag.replaceAll(' ', '-')}`);
  }
  await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
  expect(Number(await page.locator('#game').getAttribute('data-ribbon-marker'))).toBeLessThan(floorMarker);
  expect(JSON.parse((await page.locator('#game').getAttribute('data-ribbon-checkpoints'))!).every((point: { filled: boolean }) => point.filled)).toBe(true);
  for (const target of QUARRY_STARS) {
    await driveQuarry(page, [target]);
    if (/star [123]$|return jump/.test(target.tag)) await capture(`quarry-${target.tag.replaceAll(' ', '-')}`);
  }
  await expect(page.locator('#game')).toHaveAttribute('data-quarry-stars', '3/3');
  await quarryFinish(page);
  await capture('quarry-finish');
  await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  for (const [index, letter] of [...'ROCK'].entries()) {
    await page.getByRole('button', { name: `Letter ${letter}`, exact: true }).click();
    await page.getByRole('button', { name: `Space ${index + 1}: empty`, exact: true }).click();
  }
  await expect(page.locator('#status')).toContainText('ROCK sticker earned!');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('#status')).toContainText('X 300 Y 106');
  await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
  expect(errors).toEqual([]);
  expect(framingObservations.length).toBeGreaterThan(40);
  await info.attach('journey-framing-observations', { body: JSON.stringify(framingObservations), contentType: 'application/json' });
  await info.attach('quarry-observations', { body: JSON.stringify(await page.evaluate(() => ({
    browser: navigator.userAgent, pilot: (window as unknown as { quarryPilot: object }).quarryPilot,
  }))), contentType: 'application/json' });
});

test('Quarry three lifts: actual downward boarding and exit at every dock', { lock: 'native-route' }, async ({ page }, info) => {
  test.setTimeout(120_000);
  await startQuarryPilot(page);
  const route: QuarryWaypoint[] = [
    { x: 180, y: 140, waitFor: { id: 'quarry-lift-a', y: 140 }, tag: 'wait A rim' },
    { x: 112, y: 140, tag: 'board A rim' }, { x: 112, y: 420, tag: 'A down' },
    { x: 450, y: 420, tag: 'A lower exit' }, { x: 540, y: 420, tag: 'B top approach' },
    { x: 625, y: 420, jump: true, tag: 'B top dock' },
    { x: 625, y: 420, waitFor: { id: 'quarry-lift-b', y: 420 }, tag: 'wait B upper' },
    { x: 708, y: 420, tag: 'board B upper' }, { x: 708, y: 700, tag: 'B down' },
    { x: 625, y: 700, tag: 'B lower exit' }, { x: 540, y: 700, jump: true, tag: 'B dock return' },
    { x: 180, y: 700, waitFor: { id: 'quarry-lift-c', y: 700 }, tag: 'wait C mine' },
    { x: 112, y: 700, tag: 'board C mine' }, { x: 112, y: 980, tag: 'C down' },
    { x: 450, y: 980, tag: 'C lower exit' },
  ];
  for (const target of route) {
    await driveQuarry(page, [target]);
    if (/down$/.test(target.tag)) await info.attach(target.tag, { body: await page.locator('#game').screenshot(), contentType: 'image/png' });
  }
  await quarryFinish(page);
});

test('selected Quarry map thumbnail shows its real starting rim support', async ({ page }, info) => {
  await page.addInitScript(() => {
    type Preview = { heading: string; width: number; height: number; rimPixels: number; image: string };
    const probe = { heading: '', plains: null as Preview | null, quarry: null as Preview | null };
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(...args) {
      if (this.canvas.id === 'game' && args[1] === 350 && args[2] === 63) probe.heading = String(args[0]);
      return Reflect.apply(fillText, this, args);
    };
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(image: CanvasImageSource, ...args: number[]) {
      if (this.canvas.id === 'game' && image instanceof HTMLCanvasElement && args[0] === 287 && args[1] === 84
        && args[2] === 126 && args[3] === 71 && (probe.heading === 'PLAINS' || probe.heading === 'QUARRY')) {
        const pixels = image.getContext('2d')!.getImageData(0, 0, 426, 240).data;
        let rimPixels = 0;
        for (let y = 120; y <= 160; y++) for (let x = 150; x <= 350; x++) {
          const at = (y * 426 + x) * 4;
          if (pixels[at] === 177 && pixels[at + 1] === 199 && pixels[at + 2] === 125) rimPixels++;
        }
        const sample = { heading: probe.heading, width: image.width, height: image.height, rimPixels,
          image: image.toDataURL() };
        if (probe.heading === 'PLAINS' && !probe.plains) probe.plains = sample;
        if (probe.heading === 'QUARRY' && !probe.quarry) probe.quarry = sample;
      }
      return Reflect.apply(original, this, [image, ...args]);
    };
    Object.assign(window, { quarryMapPreview: probe });
  });
  await openAdventure(page, '/?scene=adventure');
  await expect.poll(() => page.evaluate(() => (window as unknown as { quarryMapPreview: {
    plains: { heading: string } | null } }).quarryMapPreview.plains?.heading)).toBe('PLAINS');
  const stale = await page.evaluate(() => (window as unknown as { quarryMapPreview: {
    plains: { heading: string; rimPixels: number } } }).quarryMapPreview.plains);
  expect(stale.rimPixels).toBe(0); // The old untagged observer could have mistaken this for Quarry.
  await info.attach('preselection-plains-observer', { body: JSON.stringify(stale), contentType: 'application/json' });
  await page.getByRole('button', { name: 'QUARRY RUN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'QUARRY RUN', exact: true })).toHaveAttribute('data-selected', 'true');
  await expect.poll(() => page.evaluate(() => (window as unknown as { quarryMapPreview: {
    quarry: { heading: string } | null } }).quarryMapPreview.quarry?.heading)).toBe('QUARRY');
  const selectedPreview = await page.evaluate(() => (window as unknown as { quarryMapPreview: {
    quarry: { heading: string; width: number; height: number; rimPixels: number; image: string } } }).quarryMapPreview.quarry);
  expect(selectedPreview.heading).toBe('QUARRY');
  expect(selectedPreview.width).toBe(426); expect(selectedPreview.height).toBe(240);
  expect(selectedPreview.rimPixels).toBeGreaterThan(80);
  await info.attach('quarry-selected-map-preview', { body: Buffer.from(selectedPreview.image.split(',')[1], 'base64'), contentType: 'image/png' });
  await info.attach('quarry-selected-map-window', { body: await page.screenshot(), contentType: 'image/png' });
});

test('Quarry native landing visibility: actual rest and approach frames reveal each next landing before stepping off', { lock: 'native-route' }, async ({ page }, info) => {
  test.setTimeout(120_000);
  await startQuarryPilot(page);
  const nextIds = ['quarry-terrace-1', 'quarry-terrace-2', 'quarry-terrace-3', 'quarry-upper',
    'quarry-terrace-4', 'quarry-terrace-5', 'quarry-terrace-6', 'quarry-mine',
    'quarry-terrace-7', 'quarry-terrace-8', 'quarry-terrace-9', 'floor'];
  const route = [{ x: 490, y: 140, tag: 'rim approach' }, ...QUARRY_DESCENT.slice(0, -1)];
  const samples: object[] = [], failures: object[] = [];
  for (const [index, target] of route.entries()) {
    await driveQuarry(page, [target]);
    await page.evaluate(() => { (window as unknown as { quarryPilot: { frozen: boolean } }).quarryPilot.frozen = true; });
    const id = nextIds[index];
    const platform = QUARRY_RUN.platforms!.find(platform => platform.id === id);
    const next = platform ? { x: platform.from.x, y: platform.from.y, width: platform.width }
      : { x: 0, y: 980, width: QUARRY_RUN.width };
    for (const viewport of [{ width: 426, height: 300 }, { width: 320, height: 240 }, { width: 1366, height: 768 }]) {
      await page.setViewportSize(viewport); await twoFrames(page);
      await expectClearViewport(page);
      const sample = await page.evaluate(({ next, id }) => {
        const frame = (window as unknown as { quarryPilot: { frame: { status: string; x: number; feet: number;
          camera: { x: number; y: number }; henry: { x: number; y: number; width: number; height: number };
          supports: { x: number; y: number; width: number }[] } } }).quarryPilot.frame;
        const ctx = document.querySelector<HTMLCanvasElement>('#game')!.getContext('2d')!;
        const drawn = frame.supports.find(support => Math.abs(support.x + frame.camera.x - next.x) < 1.1
          && Math.abs(support.y + frame.camera.y - next.y) < 1.1 && support.width === next.width);
        const edge = drawn ?? { x: next.x - frame.camera.x, y: next.y - frame.camera.y, width: next.width };
        const left = Math.max(0, Math.ceil(edge.x + 2)), right = Math.min(426, Math.floor(edge.x + edge.width - 2));
        let capPixels = 0;
        if (edge.y >= 0 && edge.y + 4 < 240 && right > left) {
          const rgba = ctx.getImageData(left, Math.floor(edge.y), right - left, 4).data;
          for (let pixel = 0; pixel < rgba.length; pixel += 4) {
            if ((rgba[pixel] === 177 && rgba[pixel + 1] === 199 && rgba[pixel + 2] === 125)
              || (rgba[pixel] === 154 && rgba[pixel + 1] === 171 && rgba[pixel + 2] === 150)) capPixels++;
          }
        }
        return { ...frame, id, next, edge, drawn: Boolean(drawn), visibleWidth: right - left, capPixels };
      }, { next, id });
      expect(sample.status).toContain('Playing');
      expect(Math.abs(sample.feet - target.y)).toBeLessThan(2);
      expect(sample.supports.length).toBeGreaterThan(0);
      if (id !== 'floor') expect(sample.drawn).toBe(true);
      samples.push({ viewport, ...sample });
      if (sample.edge.y <= 59 || sample.edge.y > 216 || sample.visibleWidth < 30 || sample.capPixels < 20
        || sample.henry.y < 59 || sample.henry.y + sample.henry.height > 221) {
        failures.push({ viewport, restY: target.y, next: id, screenY: sample.edge.y,
          visibleWidth: sample.visibleWidth, capPixels: sample.capPixels, henry: sample.henry });
      }
      if ([140,420,700,910].includes(target.y)) await info.attach(`visible-landing-${target.y}-${viewport.width}`, {
        body: await page.screenshot({ path: info.outputPath(`visible-landing-${target.y}-${viewport.width}.png`) }), contentType: 'image/png',
      });
    }
    await page.setViewportSize({ width: 426, height: 300 }); await twoFrames(page);
    expect((await page.locator('#game').boundingBox())!.width).toBe(426);
    expect((await page.locator('#game').boundingBox())!.height).toBe(240);
    await page.evaluate(() => { (window as unknown as { quarryPilot: { frozen: boolean } }).quarryPilot.frozen = false; });
  }
  await info.attach('landing-visibility-observations', { body: JSON.stringify({ samples, failures }), contentType: 'application/json' });
  expect(samples).toHaveLength(36);
  expect(failures).toEqual([]);
});
