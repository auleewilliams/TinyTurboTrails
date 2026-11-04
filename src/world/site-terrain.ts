import type { PlatformBody } from '../game/movement';
import type { LevelData } from './level';

export const SITE_FIXED_SUPPORT_IDS = [
  'site-entrance', 'site-first-low-right', 'site-first-1',
  'site-first-b', 'site-first-3', 'site-high-deck',
  'site-far-dock', 'site-crane-catch', 'site-first-left-1',
  'site-first-right', 'site-lower-catch', 'site-descent-outside',
  'site-descent-base-catch', 'site-descent-1', 'site-descent-e',
  'site-descent-3', 'site-yard', 'site-descent-left-1',
  'site-descent-left-2', 'site-final-1', 'site-final-2',
  'site-rest', 'site-final-4', 'site-final-5',
  'site-final-6', 'site-final-m', 'site-roof',
  'site-final-base-catch', 'site-final-right-560', 'site-final-right-500',
  'site-final-left-440', 'site-final-right-380', 'site-final-right-320',
  'site-final-left-320', 'site-final-left-260', 'site-final-outside-380',
  'site-final-outside-440', 'site-final-outside-500', 'site-final-outside-560',
] as const;
export interface SiteSteelRun { id: string; supportIds: string[]; x: number; y: number; width: number; image: string }
export interface SiteTerrainManifest {
  version: 1;
  phase: 'rollout';
  depth: 18;
  runs: SiteSteelRun[];
  ferry: { id: string; image: string; width: number; height: number; visibleDepth: number };
  ground: { image: string; width: number; height: number; from: number; to: number };
}
export interface SiteTerrainAssets {
  manifest: SiteTerrainManifest;
  runs: ReadonlyMap<string, { run: SiteSteelRun; image: HTMLImageElement }>;
  ferry: HTMLImageElement;
  ground: HTMLImageElement;
}

export function validateSiteTerrain(value: unknown): asserts value is SiteTerrainManifest {
  const data = value as SiteTerrainManifest;
  if (!data || data.version !== 1 || data.phase !== 'rollout' || data.depth !== 18 || !Array.isArray(data.runs) || data.runs.length !== 31
    || data.ferry?.id !== 'site-crane-ferry' || data.ferry.image !== 'ferry.png' || data.ferry.width !== 96 || data.ferry.height !== 18 || data.ferry.visibleDepth !== 15
    || data.ground?.image !== 'ground-full.png' || data.ground.width !== 3120 || data.ground.height !== 1064 || data.ground.from !== 0 || data.ground.to !== 3120) {
    throw new Error('Invalid Sunset steel metadata');
  }
  const ids = new Set<string>();
  for (const run of data.runs) {
    if (!run || !SITE_FIXED_SUPPORT_IDS.some(id => id === run.id) || run.image !== `${run.id}.png`
      || !Array.isArray(run.supportIds) || !run.supportIds.includes(run.id)
      || ![run.x, run.y, run.width].every(Number.isInteger) || run.x < 0 || run.y < 0 || run.width < 140
      || run.width % 10 !== 0 || run.x + run.width > 3120 || run.y > 620) throw new Error('Invalid Sunset steel run');
    for (const id of run.supportIds) {
      if (!SITE_FIXED_SUPPORT_IDS.some(expected => expected === id) || ids.has(id)) throw new Error('Invalid Sunset support coverage');
      ids.add(id);
    }
  }
  if (ids.size !== SITE_FIXED_SUPPORT_IDS.length) throw new Error('Incomplete Sunset support coverage');
}

/** Every declared image is required. A failed attempt is not cached, so Retry reloads it. */
export async function loadSiteTerrain(base: string, path?: string): Promise<SiteTerrainAssets | undefined> {
  if (path === undefined) return undefined;
  if (path !== 'steel-v1/manifest.json') throw new Error('Invalid Sunset steel declaration');
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error('Could not load Sunset steel metadata');
  const manifest: unknown = await response.json();
  validateSiteTerrain(manifest);
  const specs = [...manifest.runs.map(run => ({ image: run.image, width: run.width, height: manifest.depth })), manifest.ferry, manifest.ground];
  const images = await Promise.all(specs.map(async spec => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error(`Could not load Sunset steel image: ${spec.image}`));
      image.src = `${base}steel-v1/${spec.image}`;
    });
    if (image.naturalWidth !== spec.width || image.naturalHeight !== spec.height) throw new Error(`Invalid Sunset steel dimensions: ${spec.image}`);
    return image;
  }));
  const runs = new Map<string, { run: SiteSteelRun; image: HTMLImageElement }>();
  manifest.runs.forEach((run, index) => {
    for (const id of run.supportIds) runs.set(id, { run, image: images[index] });
  });
  return { manifest, runs, ferry: images[manifest.runs.length], ground: images[manifest.runs.length + 1] };
}

const checkedLayouts = new WeakMap<SiteTerrainAssets, WeakSet<LevelData>>();

/** Art runs may join tops visually, but the unique authored collision records remain intact. */
export function validateSiteLayout(kit: SiteTerrainAssets, level: LevelData): void {
  if (level.id !== 'sunset') throw new Error('Sunset steel used by another trail');
  if (checkedLayouts.get(kit)?.has(level)) return;
  for (const run of kit.manifest.runs) {
    const supports = run.supportIds.map(id => {
      const matches = level.platforms?.filter(p => p.id === id) ?? [];
      if (matches.length !== 1) throw new Error('Missing or duplicate Sunset support');
      return matches[0];
    }).sort((a, b) => a.from.x - b.from.x);
    let right = run.x;
    for (const support of supports) {
      if (support.from.x !== support.to.x || support.from.y !== support.to.y || support.from.y !== run.y
        || support.from.x > right || support.from.x < run.x) throw new Error('Sunset artwork no longer matches support');
      right = Math.max(right, support.from.x + support.width);
    }
    if (supports[0].from.x !== run.x || right !== run.x + run.width) throw new Error('Sunset artwork no longer matches run bounds');
  }
  const ferry = level.platforms?.filter(p => p.id === kit.manifest.ferry.id) ?? [];
  if (ferry.length !== 1 || ferry[0].width !== kit.manifest.ferry.width) throw new Error('Sunset artwork no longer matches ferry');
  const levels = checkedLayouts.get(kit) ?? new WeakSet<LevelData>();
  levels.add(level); checkedLayouts.set(kit, levels);
}

export function drawSitePlatform(ctx: CanvasRenderingContext2D, kit: SiteTerrainAssets, level: LevelData,
  body: PlatformBody, offset: { x: number; y: number }): boolean {
  validateSiteLayout(kit, level);
  const fixed = kit.runs.get(body.id);
  if (!fixed && body.id !== kit.manifest.ferry.id) throw new Error('Missing Sunset steel support artwork');
  if (fixed && fixed.run.id !== body.id) return true;
  const image = fixed?.image ?? kit.ferry;
  const x = fixed?.run.x ?? body.x, y = fixed?.run.y ?? body.y;
  const width = fixed?.run.width ?? body.width;
  ctx.save();
  try {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, width, kit.manifest.depth, x - offset.x, y - offset.y, width, kit.manifest.depth);
  } finally { ctx.restore(); }
  return true;
}

/** A single native bitmap covers every authored terrain segment, including both gap walls. */
export function drawSiteGround(ctx: CanvasRenderingContext2D, kit: SiteTerrainAssets, offset: { x: number; y: number }): void {
  ctx.save();
  try {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(kit.ground, -offset.x, -offset.y);
  } finally { ctx.restore(); }
}
