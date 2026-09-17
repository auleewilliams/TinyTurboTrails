import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { drawAsset, drawWorld } from '../src/world/renderer';
import type { WorldAsset, WorldAssets } from '../src/world/assets';
import type { HenryAssets } from '../src/art/henry';
import type { GameAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import { createPlayer } from '../src/game/movement';
import { Camera } from '../src/world/camera';
import { PLAINS_LEVEL } from '../src/world/level';
import { platformBodyAt } from '../src/game/platforms';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/plains/manifest.json', import.meta.url), 'utf8'));

it.each(['tree', 'slime', 'flowers', 'bush', 'stone', 'cave'] as WorldAsset[])(
  'anchors the visible base of %s, excluding atlas padding', (asset) => {
    for (const scale of [1, 2]) {
      const drawImage = vi.fn();
      const assets: WorldAssets = { atlas: {} as HTMLImageElement, manifest };
      drawAsset({ drawImage } as unknown as CanvasRenderingContext2D, assets, asset, 300, 180, scale);
      const call = drawImage.mock.calls[0];
      // All six cells end on row 43; rows 44–47 are transparent.
      expect(call[5]).toBe(300 - 24 * scale);
      expect(call[6] + 44 * scale).toBe(180);
    }
  },
);

it.each([1, 2])('anchors the checkpoint post and visible base at its world position at scale %s', (scale) => {
  const drawImage = vi.fn();
  const assets: WorldAssets = { atlas: {} as HTMLImageElement, manifest };
  drawAsset({ drawImage } as unknown as CanvasRenderingContext2D, assets, 'checkpoint', 570, 158, scale);
  // The post is centered at x=20; opaque artwork ends at y=44 in its 48px cell.
  expect(drawImage).toHaveBeenCalledWith(assets.atlas, 144, 96, 48, 48,
    570 - 20 * scale, 158 - 44 * scale, 48 * scale, 48 * scale);
});

it('keeps the bottom-center anchor for assets without an override', () => {
  const drawImage = vi.fn();
  const assets: WorldAssets = { atlas: {} as HTMLImageElement, manifest };
  drawAsset({ drawImage } as unknown as CanvasRenderingContext2D, assets, 'gem', 150, 150);
  expect(drawImage).toHaveBeenCalledWith(assets.atlas, 0, 96, 48, 48, 126, 102, 48, 48);
});

interface DrawnText { text: string; x: number; textAlign: CanvasTextAlign }

function recordingContext(): { ctx: CanvasRenderingContext2D; images: unknown[][]; texts: DrawnText[] } {
  const images: unknown[][] = [];
  const texts: DrawnText[] = [];
  const noop = (): void => {};
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: 'left' as CanvasTextAlign,
    fillRect: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop, fill: noop, stroke: noop,
    strokeRect: noop,
    translate: noop, save: noop, restore: noop,
    drawImage: (...args: unknown[]) => { images.push(args); },
    fillText: (text: string, x: number) => { texts.push({ text, x, textAlign: ctx.textAlign }); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, images, texts };
}

const worldAssets: WorldAssets = { atlas: {} as HTMLImageElement, manifest };

it('fills joined slopes without interior edges and preserves gaps between ground contours', () => {
  const { ctx } = recordingContext();
  const fills: number[][][] = [];
  let path: number[][] = [];
  ctx.beginPath = () => { path = []; };
  ctx.moveTo = ctx.lineTo = (x, y) => { path.push([x, y]); };
  ctx.fill = () => { fills.push(path); };
  const level = { ...PLAINS_LEVEL, surfaces: [
    { x1: 0, y1: 198, x2: 220, y2: 198 },
    { x1: 220, y1: 198, x2: 360, y2: 158 },
    { x1: 400, y1: 158, x2: 650, y2: 158 },
  ] };
  const camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
  camera.update(250.25, 132);
  drawWorld(ctx, worldAssets, level, camera);
  expect(fills).toEqual([
    [[-0.25, 198], [219.75, 198], [359.75, 158], [359.75, 240], [-0.25, 240]],
    [[399.75, 158], [649.75, 158], [649.75, 240], [399.75, 240]],
  ]);
});

it('uses the level theme for sky, terrain and parallax placement', () => {
  const { ctx, images } = recordingContext();
  const fills: CanvasRenderingContext2D['fillStyle'][] = [];
  ctx.fillRect = () => { fills.push(ctx.fillStyle); };
  ctx.fill = () => { fills.push(ctx.fillStyle); };
  const level = { ...PLAINS_LEVEL, theme: {
    sky: '#010203', ground: '#040506', edge: '#070809',
    parallax: [{ asset: 'cave' as WorldAsset, x: 90, y: 55, scale: 2 }],
  }};
  drawWorld(ctx, worldAssets, level, new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height }));
  expect(fills[0]).toBe('#010203');
  expect(fills).toContain('#040506');
  expect(images[0][5]).toBe(42);
  expect(images[0][6]).toBe(-33);
});

const henryAssets = {
  atlas: {} as HTMLImageElement,
  manifest: JSON.parse(readFileSync(new URL('../public/assets/henry/manifest.json', import.meta.url), 'utf8')),
} as HenryAssets;
const silentAudio: GameAudio = {
  unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
  play: () => {}, stop: () => {}, dispose: () => {},
};
const gem = PLAINS_LEVEL.entities.find((entity) => entity.id === 'gem-001')!;
const otherGem = PLAINS_LEVEL.entities.find((entity) => entity.id === 'gem-002')!;
const start = { horizontal: 0, jumpHeld: false, jumpPressed: true, pausePressed: false, mutePressed: false };

it('omits entities the run has consumed and keeps the rest', () => {
  const { ctx, images } = recordingContext();
  const camera = new Camera({ width: 426, height: 240, worldWidth: PLAINS_LEVEL.width, worldHeight: PLAINS_LEVEL.height });
  drawWorld(ctx, worldAssets, PLAINS_LEVEL, camera, (entity) => entity.id !== gem.id);
  const drawnAt = (x: number, y: number): boolean =>
    images.some((call) => call[5] === x - 24 && call[6] === y - 48);
  expect(drawnAt(gem.x, gem.y)).toBe(false);
  expect(drawnAt(otherGem.x, otherGem.y)).toBe(true);
});

it('draws every entity when a scene supplies no run state', () => {
  const { ctx, images } = recordingContext();
  const camera = new Camera({ width: 426, height: 240, worldWidth: PLAINS_LEVEL.width, worldHeight: PLAINS_LEVEL.height });
  drawWorld(ctx, worldAssets, PLAINS_LEVEL, camera);
  // Two parallax hills, every entity, and the finish arch.
  expect(images).toHaveLength(PLAINS_LEVEL.entities.length + 3);
});

it('stops drawing a gem once the adventure collects it', () => {
  const scene = new AdventureScene(henryAssets, worldAssets, silentAudio, PLAINS_LEVEL);
  scene.enter();
  scene.update(1 / 60, start);
  const before = recordingContext();
  scene.render(before.ctx);
  const gemCalls = (images: unknown[][]): number =>
    images.filter((call) => call[5] === gem.x - 24 && call[6] === gem.y - 48).length;
  expect(gemCalls(before.images)).toBe(1);
  Object.assign(scene, { player: createPlayer(gem.x, PLAINS_LEVEL) });
  (scene as unknown as { player: { y: number } }).player.y = gem.y - 34;
  scene.update(1 / 60, { ...start, jumpPressed: false });
  const after = recordingContext();
  scene.render(after.ctx);
  expect(gemCalls(after.images)).toBe(0);
});

it('draws a patrolling slime where the run has walked it, not where the level planted it', () => {
  const scene = new AdventureScene(henryAssets, worldAssets, silentAudio, PLAINS_LEVEL);
  scene.enter();
  scene.update(1 / 60, start);
  const slime = PLAINS_LEVEL.entities.find((entity) => entity.patrol)!;
  const patrol = slime.patrol!;
  for (let step = 0; step < 60; step++) scene.update(1 / 60, { ...start, jumpPressed: false });
  const { ctx, images } = recordingContext();
  scene.render(ctx);
  // The camera is still at x=0 while Henry stands at the start, so drawn X is world X.
  const drawnX = images.map((call) => (call[5] as number) + 24);
  expect(drawnX).not.toContain(slime.x);
  expect(drawnX.some((x) => x > slime.x && x <= patrol.maxX)).toBe(true);
});

it('keeps the HUD left-aligned even after a centered overlay ran', () => {
  const scene = new AdventureScene(henryAssets, worldAssets, silentAudio, PLAINS_LEVEL);
  scene.enter();
  scene.update(1 / 60, start);
  const { ctx, texts } = recordingContext();
  ctx.textAlign = 'center';
  scene.render(ctx);
  expect(texts).not.toHaveLength(0);
  for (const drawn of texts) expect(drawn).toMatchObject({ x: 10, textAlign: 'left' });
});

it('draws the selected level name on the title screen', () => {
  const scene = new AdventureScene(henryAssets, worldAssets, silentAudio, PLAINS_LEVEL);
  const { ctx, texts } = recordingContext();
  scene.render(ctx);
  expect(texts.some(({ text }) => text === '◀ PLAINS ▶')).toBe(true);
});

it('draws each slab in the level palette and telegraphs its whole path', () => {
  const { ctx } = recordingContext();
  const rects: { style: string; args: number[] }[] = [];
  ctx.fillRect = (...args: number[]) => { rects.push({ style: String(ctx.fillStyle), args }); };
  const platform = { id: 'ferry', from: { x: 600, y: 150 }, to: { x: 700, y: 120 }, width: 48, seconds: 2 };
  const level = { ...PLAINS_LEVEL, platforms: [platform] };
  const camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
  const body = platformBodyAt(platform, 1);
  drawWorld(ctx, worldAssets, level, camera, () => true, (entity) => entity, [body]);
  expect(rects).toContainEqual({ style: level.theme.ground, args: [body.x, body.y, body.width, body.height] });
  expect(rects).toContainEqual({ style: level.theme.edge, args: [body.x, body.y, body.width, 3] });
  const path = rects.filter((rect) => rect.style === '#ffffff66');
  // Pips along the path plus a marker at each end.
  expect(path.length).toBeGreaterThan(4);
  expect(path.map((rect) => rect.args[0]).some((x) => x <= platform.from.x + platform.width / 2)).toBe(true);
  expect(path.map((rect) => rect.args[0]).some((x) => x >= platform.to.x + platform.width / 2 - 4)).toBe(true);
});
