import type { AnimationClip } from './animation';

export const ANIMATIONS = ['idle', 'run', 'jump', 'fall', 'celebrate'] as const;
export type AnimationName = typeof ANIMATIONS[number];
export interface SpriteFrame { x: number; y: number; width: number; height: number }
export interface HenryManifest {
  image: string;
  logicalSize: { width: number; height: number };
  anchor: { x: number; y: number };
  frames: SpriteFrame[];
  animations: Record<AnimationName, AnimationClip>;
}
export interface HenryAssets {
  atlas: HTMLImageElement;
  manifest: HenryManifest;
}
export interface HenryPreviewAssets extends HenryAssets { reference: HTMLImageElement }

export function validateManifest(value: unknown, width: number, height: number): asserts value is HenryManifest {
  const data = value as HenryManifest;
  if (!data || !data.logicalSize || !data.anchor ||
      !Number.isInteger(data.logicalSize.width) || data.logicalSize.width <= 0 ||
      !Number.isInteger(data.logicalSize.height) || data.logicalSize.height <= 0 ||
      !Number.isInteger(data.anchor.x) || !Number.isInteger(data.anchor.y) ||
      data.anchor.x < 0 || data.anchor.x > data.logicalSize.width ||
      data.anchor.y < 0 || data.anchor.y > data.logicalSize.height) {
    throw new Error('Invalid logical frame dimensions or anchor');
  }
  if (!Array.isArray(data.frames) || !data.frames.length || data.frames.some((frame) =>
    !frame || ![frame.x, frame.y, frame.width, frame.height].every(Number.isInteger) ||
    frame.x < 0 || frame.y < 0 || frame.width <= 0 || frame.height <= 0 ||
    frame.x + frame.width > width || frame.y + frame.height > height)) {
    throw new Error('Invalid atlas frame rectangle');
  }
  for (const name of ANIMATIONS) {
    const clip = data.animations?.[name];
    if (!clip || !Array.isArray(clip.frames) || !clip.frames.length ||
        !Number.isFinite(clip.frameSeconds) || clip.frameSeconds <= 0 ||
        typeof clip.loop !== 'boolean' || (name === 'celebrate' && clip.loop) || clip.frames.some((id) =>
          !Number.isInteger(id) || id < 0 || id >= data.frames.length)) {
      throw new Error(`Invalid ${name} animation`);
    }
  }
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
  return image;
}

export async function loadHenry(): Promise<HenryAssets> {
  const base = `${import.meta.env.BASE_URL}assets/henry/`;
  const response = await fetch(`${base}manifest.json`);
  if (!response.ok) throw new Error('Could not load Henry animation metadata');
  const manifest = await response.json() as HenryManifest;
  const atlas = await loadImage(`${base}${manifest.image}`);
  validateManifest(manifest, atlas.naturalWidth, atlas.naturalHeight);
  return { manifest, atlas };
}

export async function loadHenryPreview(): Promise<HenryPreviewAssets> {
  const base = `${import.meta.env.BASE_URL}assets/henry/`;
  const [henry, reference] = await Promise.all([
    loadHenry(), loadImage(`${base}reference.png`),
  ]);
  return { ...henry, reference };
}
