import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { drawAsset, drawWorld } from '../src/world/renderer';
import type { WorldAsset, WorldAssets } from '../src/world/assets';
import type { HenryAssets } from '../src/art/henry';
import type { GameAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import { GameplayPreviewScene } from '../src/game/gameplay-preview';
import { damagePlayer, type RunState } from '../src/game/interactions';
import { createPlayer } from '../src/game/movement';
import { Camera } from '../src/world/camera';
import { PLAINS_LEVEL } from '../src/world/level';
import { QUARRY_RUN } from '../src/world/levels';
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
interface FilledRect { x: number; y: number; width: number; height: number; fillStyle: CanvasRenderingContext2D['fillStyle'] }

function recordingContext(): { ctx: CanvasRenderingContext2D; images: unknown[][]; texts: DrawnText[]; rects: FilledRect[] } {
  const images: unknown[][] = [];
  const texts: DrawnText[] = [];
  const rects: FilledRect[] = [];
  const noop = (): void => {};
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: 'left' as CanvasTextAlign,
    fillRect: (x: number, y: number, width: number, height: number) => {
      rects.push({ x, y, width, height, fillStyle: ctx.fillStyle });
    },
    beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop, fill: noop, stroke: noop,
    strokeRect: noop,
    translate: noop, save: noop, restore: noop,
    drawImage: (...args: unknown[]) => { images.push(args); },
    fillText: (text: string, x: number) => { texts.push({ text, x, textAlign: ctx.textAlign }); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, images, texts, rects };
}

const worldAssets: WorldAssets = { atlas: {} as HTMLImageElement, manifest };

const sceneryAssets = {
  ...worldAssets,
  scenery: {
    background: {} as HTMLImageElement,
    foreground: {} as HTMLImageElement,
    manifest: JSON.parse(readFileSync(new URL('../public/assets/plains/scenery/manifest.json', import.meta.url), 'utf8')),
  },
};

it('pans the plains background within its source bounds over the entire route', () => {
  const crops: number[] = [];
  for (const x of [0, 4000, PLAINS_LEVEL.width - 426]) {
    const { ctx, images } = recordingContext();
    drawWorld(ctx, sceneryAssets, PLAINS_LEVEL, { position: { x, y: 0 } } as Camera);
    const background = images.find((call) => call[0] === sceneryAssets.scenery.background);
    expect(background).toBeDefined();
    const [, sx, sy, sw, sh, dx, dy, dw, dh] = background as number[];
    expect(sx).toBeGreaterThanOrEqual(0);
    expect(sx + sw).toBeLessThanOrEqual(1536);
    expect(sy + sh).toBeLessThanOrEqual(1024);
    expect([dx, dy, dw, dh]).toEqual([0, 0, 426, 240]);
    expect(sw / sh).toBeCloseTo(426 / 240);
    crops.push(sx);
  }
  expect(crops[1]).toBeGreaterThan(crops[0]);
  expect(crops[2]).toBeGreaterThan(crops[1]);
});

it('uses new art only for Plains decoration, keeping hazards distinct and Quarry unchanged', () => {
  const { ctx, images } = recordingContext();
  const camera = new Camera({ width: 426, height: 240, worldWidth: PLAINS_LEVEL.width, worldHeight: 240 });
  drawWorld(ctx, sceneryAssets, PLAINS_LEVEL, camera);
  const trees = images.filter((call) => call[0] === sceneryAssets.scenery.foreground && call[1] === 29);
  expect(trees.length).toBeGreaterThan(0);
  const tree = trees.find((call) => Number(call[5]) > 400)!;
  expect(Number(tree[6]) + Number(tree[8])).toBe(158);
  const hazard = images.find((call) => call[0] === worldAssets.atlas && call[5] === 1045 - 24);
  expect(hazard).toBeDefined();
  expect(images.indexOf(tree)).toBeLessThan(images.indexOf(hazard!));
  const quarry = recordingContext();
  drawWorld(quarry.ctx, sceneryAssets, QUARRY_RUN, camera);
  expect(quarry.images.every((call) => call[0] === worldAssets.atlas)).toBe(true);
});

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

it('draws low foreground plants after Henry in both playable scenes', () => {
  const adventure = new AdventureScene(henryAssets, sceneryAssets, silentAudio, PLAINS_LEVEL);
  adventure.enter();
  adventure.update(1 / 60, start);
  const preview = new GameplayPreviewScene(henryAssets, sceneryAssets, silentAudio, PLAINS_LEVEL);
  for (const scene of [adventure, preview]) {
    const { ctx, images } = recordingContext();
    scene.render(ctx);
    const henryIndex = images.findIndex((call) => call[0] === henryAssets.atlas);
    expect(henryIndex).toBeGreaterThan(0);
    expect(images.slice(henryIndex + 1).some((call) => call[0] === sceneryAssets.scenery.foreground)).toBe(true);
  }
});

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

it('draws crumbling ledges as stone tiles with deterministic warning cracks', () => {
  const ledge = {
    id: 'test-ledge', kind: 'crumbling-ledge' as const, x: 200, y: 120,
    width: 72, asset: 'stone', layer: 'world' as const,
  };
  const level = {
    ...PLAINS_LEVEL,
    theme: { ...PLAINS_LEVEL.theme, parallax: [] },
    entities: [ledge],
  };
  const camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
  const stable = recordingContext();
  let stableStrokes = 0;
  stable.ctx.stroke = () => { stableStrokes++; };
  drawWorld(stable.ctx, worldAssets, level, camera);
  const stableTiles = stable.images.filter((call) => call[7] === 24);
  expect(stableTiles.map((call) => call[5])).toEqual([164, 188, 212]);

  const warning = recordingContext();
  let crackStrokes = 0;
  warning.ctx.stroke = () => { crackStrokes++; };
  drawWorld(warning.ctx, worldAssets, level, camera, () => true,
    (entity) => ({ x: entity.x, y: entity.y, warningProgress: 0.75 }));
  const warningTiles = warning.images.filter((call) => call[7] === 24);
  expect(warningTiles.map((call) => call[5])).not.toEqual(stableTiles.map((call) => call[5]));
  expect(crackStrokes - stableStrokes).toBe(2);

  const crumbled = recordingContext();
  drawWorld(crumbled.ctx, worldAssets, level, camera, () => false);
  expect(crumbled.images.filter((call) => call[7] === 24)).toEqual([]);
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

it.each([
  { name: 'original atlas', assets: worldAssets },
  { name: 'generated scenery', assets: sceneryAssets },
])('draws the runtime slime position with $name', ({ assets }) => {
  const scene = new AdventureScene(henryAssets, assets, silentAudio, PLAINS_LEVEL);
  scene.enter();
  scene.update(1 / 60, start);
  const slime = PLAINS_LEVEL.entities.find((entity) => entity.patrol)!;
  const patrol = slime.patrol!;
  for (let step = 0; step < 60; step++) scene.update(1 / 60, { ...start, jumpPressed: false });
  const { ctx, images } = recordingContext();
  scene.render(ctx);
  // The camera is still at x=0 while Henry stands at the start, so drawn X is world X.
  const drawnX = images.filter((call) => call[0] === assets.atlas && call[1] === 96 && call[2] === 96)
    .map((call) => (call[5] as number) + 24);
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

function renderedHealthPips(scene: AdventureScene | GameplayPreviewScene, health: number, healthFlashSeconds = 0): FilledRect[] {
  if (scene instanceof AdventureScene) scene.update(1 / 60, start);
  const run = (scene as unknown as { run: RunState }).run;
  run.health = health;
  run.healthFlashPip = healthFlashSeconds > 0 ? health : null;
  run.healthFlashSeconds = healthFlashSeconds;
  const { ctx, rects } = recordingContext();
  scene.render(ctx);
  return rects.filter(({ y, width, height }) => y === 10 && width === 6 && height === 6);
}

it.each([
  ['adventure', () => new AdventureScene(henryAssets, worldAssets, silentAudio, PLAINS_LEVEL)],
  ['gameplay preview', () => new GameplayPreviewScene(henryAssets, worldAssets, silentAudio, PLAINS_LEVEL)],
] as const)('draws three readable health pips in the %s HUD', (_name, createScene) => {
  const full = renderedHealthPips(createScene(), 3);
  expect(full).toHaveLength(3);
  expect(new Set(full.map(({ fillStyle }) => fillStyle))).toEqual(new Set(['#ff5d5d']));

  const damaged = renderedHealthPips(createScene(), 1);
  expect(damaged.map(({ fillStyle }) => fillStyle)).toEqual(['#ff5d5d', '#31434a', '#31434a']);
});

it('briefly highlights the pip most recently lost', () => {
  const pips = renderedHealthPips(new AdventureScene(henryAssets, worldAssets, silentAudio, PLAINS_LEVEL), 2, 0.2);
  expect(pips.map(({ fillStyle }) => fillStyle)).toEqual(['#ff5d5d', '#ff5d5d', '#ffda75']);
});

it('briefly highlights the final lost pip after lethal damage refills health', () => {
  const scene = new AdventureScene(henryAssets, worldAssets, silentAudio, PLAINS_LEVEL);
  scene.update(1 / 60, start);
  const state = scene as unknown as { player: ReturnType<typeof createPlayer>; run: RunState };
  state.run.health = 1;
  damagePlayer(state.run, state.player, 1, [], PLAINS_LEVEL);

  const { ctx, rects } = recordingContext();
  scene.render(ctx);
  const pips = rects.filter(({ y, width, height }) => y === 10 && width === 6 && height === 6);
  expect(pips.map(({ fillStyle }) => fillStyle)).toEqual(['#ffda75', '#ff5d5d', '#ff5d5d']);
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
