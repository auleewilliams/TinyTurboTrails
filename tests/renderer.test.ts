import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { drawAsset, drawWorld } from '../src/world/renderer';
import type { WorldAssets } from '../src/world/assets';
import type { HenryAssets } from '../src/art/henry';
import type { GameAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import { createPlayer } from '../src/game/movement';
import { Camera } from '../src/world/camera';
import { PLAINS_LEVEL } from '../src/world/level';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/plains/manifest.json', import.meta.url), 'utf8'));

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
    translate: noop, save: noop, restore: noop,
    drawImage: (...args: unknown[]) => { images.push(args); },
    fillText: (text: string, x: number) => { texts.push({ text, x, textAlign: ctx.textAlign }); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, images, texts };
}

const worldAssets: WorldAssets = { atlas: {} as HTMLImageElement, manifest };
const henryAssets = {
  atlas: {} as HTMLImageElement,
  manifest: JSON.parse(readFileSync(new URL('../public/assets/henry/manifest.json', import.meta.url), 'utf8')),
} as HenryAssets;
const silentAudio: GameAudio = {
  unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
  play: () => {}, stop: () => {}, dispose: () => {},
};
const gem = PLAINS_LEVEL.entities.find((entity) => entity.id === 'gem-001')!;
const start = { horizontal: 0, jumpHeld: false, jumpPressed: true, pausePressed: false, mutePressed: false };

it('omits entities the run has consumed and keeps the rest', () => {
  const { ctx, images } = recordingContext();
  const camera = new Camera({ width: 426, height: 240, worldWidth: PLAINS_LEVEL.width, worldHeight: PLAINS_LEVEL.height });
  drawWorld(ctx, worldAssets, PLAINS_LEVEL, camera, (entity) => entity.id !== gem.id);
  const drawnAt = (x: number, y: number): boolean =>
    images.some((call) => call[5] === x - 24 && call[6] === y - 48);
  expect(drawnAt(gem.x, gem.y)).toBe(false);
  expect(drawnAt(285, 122)).toBe(true);
});

it('draws every entity when a scene supplies no run state', () => {
  const { ctx, images } = recordingContext();
  const camera = new Camera({ width: 426, height: 240, worldWidth: PLAINS_LEVEL.width, worldHeight: PLAINS_LEVEL.height });
  drawWorld(ctx, worldAssets, PLAINS_LEVEL, camera);
  // Two parallax hills, every entity, and the finish arch.
  expect(images).toHaveLength(PLAINS_LEVEL.entities.length + 3);
});

it('stops drawing a gem once the adventure collects it', () => {
  const scene = new AdventureScene(henryAssets, worldAssets, silentAudio);
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

it('keeps the HUD left-aligned even after a centered overlay ran', () => {
  const scene = new AdventureScene(henryAssets, worldAssets, silentAudio);
  scene.enter();
  scene.update(1 / 60, start);
  const { ctx, texts } = recordingContext();
  ctx.textAlign = 'center';
  scene.render(ctx);
  expect(texts).not.toHaveLength(0);
  for (const drawn of texts) expect(drawn).toMatchObject({ x: 10, textAlign: 'left' });
});
