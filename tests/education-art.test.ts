import { expect, it, vi } from 'vitest';
import { loadSpellingAssets, type SpellingAssets } from '../src/art/spelling';
import { EducationSession, TRAIL_WORDS } from '../src/game/education';
import { EducationOverlay } from '../src/game/education-overlay';

const requested: string[] = [];
const sizes = new Map<string, [number, number]>();
const failures = new Set<string>();
vi.mock('../src/art/henry', () => ({ loadImage: async (url: string) => {
  requested.push(url);
  const name = url.split('/').at(-1)!;
  if (failures.has(name)) throw new Error(`Could not load ${url}`);
  const [naturalWidth, naturalHeight] = sizes.get(name) ?? (name === 'pouch.png' ? [28, 28] : name === 'tile.png' ? [42, 32] : [56, 56]);
  return { name, naturalWidth, naturalHeight };
} }));

const stickerFiles = TRAIL_WORDS.map(config => `${config.id}-sticker.png`);

it('requires every trail sticker with its native size, without a partial fallback', async () => {
  requested.length = 0;
  const loaded = await loadSpellingAssets();
  expect(requested.map(url => url.split('/').at(-1))).toEqual(['pouch.png', 'tile.png', ...stickerFiles]);
  expect(requested.every(url => url.endsWith(`assets/spelling/${url.split('/').at(-1)}`))).toBe(true);
  expect(Object.keys(loaded.stickers)).toEqual(TRAIL_WORDS.map(config => config.id));
  for (const config of TRAIL_WORDS) expect(loaded.stickers[config.id]).toMatchObject({ name: `${config.id}-sticker.png` });
  for (const name of stickerFiles) {
    failures.add(name);
    await expect(loadSpellingAssets()).rejects.toThrow(name);
    failures.delete(name);
    sizes.set(name, [56, 55]);
    await expect(loadSpellingAssets()).rejects.toThrow('Invalid spelling artwork dimensions');
    sizes.delete(name);
  }
  await expect(loadSpellingAssets()).resolves.toBeDefined();
});

const stickers = Object.fromEntries(TRAIL_WORDS.map(config => [config.id, { trail: config.id }]));
const artwork = { pouch: {}, tile: {}, stickers } as unknown as SpellingAssets;

function recordingContext() {
  const images: { image: unknown; alpha: number; rect: number[] }[] = [];
  const glyphs: string[] = [];
  const frames: number[][] = [];
  const state = { globalAlpha: 1 };
  const stack: typeof state[] = [];
  const ctx = new Proxy(state, {
    get: (target, key) => {
      if (key === 'save') return () => stack.push({ ...target });
      if (key === 'restore') return () => Object.assign(target, stack.pop());
      if (key === 'drawImage') return (image: unknown, ...rect: number[]) => images.push({ image, alpha: target.globalAlpha, rect });
      if (key === 'fillText') return (text: string) => glyphs.push(text);
      if (key === 'strokeRect') return (...rect: number[]) => frames.push(rect);
      return Reflect.get(target, key) ?? (() => {});
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, images, glyphs, frames };
}

it.each(TRAIL_WORDS)('renders $word from separate glyphs and preserves independent tiles and reward rules', config => {
  const session = new EducationSession(); session.selectTrail(config.id);
  session.pickups.forEach(pickup => session.collect(pickup.id));
  const overlay = new EducationOverlay(session, artwork); overlay.showAssembly(() => {});
  const before = JSON.stringify(session);
  const mixed = recordingContext(); overlay.draw(mixed.ctx);
  expect(mixed.images.filter(call => call.image === artwork.tile)).toHaveLength(4);
  for (const letter of new Set(config.word)) {
    // One guide glyph and one independent usable tile per occurrence.
    expect(mixed.glyphs.filter(glyph => glyph === letter)).toHaveLength([...config.word].filter(glyph => glyph === letter).length * 2);
  }
  expect(JSON.stringify(session)).toBe(before);
  expect(mixed.images.filter(call => call.image !== artwork.tile)).toEqual([]);
  session.pickups.forEach((pickup, slot) => session.place(pickup.id, slot));
  const earned = recordingContext(); overlay.draw(earned.ctx);
  expect(earned.images.filter(call => call.image === artwork.tile)).toHaveLength(4);
  // Only this trail's generated sticker, centered in its existing 56 x 56 cell.
  expect(earned.images.filter(call => call.image !== artwork.tile)).toEqual([
    { image: stickers[config.id], alpha: 1, rect: [337, 63, 56, 56] },
  ]);
  overlay.showStickers();
  const collection = recordingContext(); overlay.draw(collection.ctx);
  // Every trail uses its own image; only the earned one is fully opaque.
  expect(collection.images).toEqual(TRAIL_WORDS.map(other => (
    { image: stickers[other.id], alpha: other.id === config.id ? 1 : 0.3, rect: [-28, -28, 56, 56] })));
  expect(session.stickers).toHaveLength(1);
});

it('keeps a tile-in-hand marker when focus moves to a space, and uses the same tile while dragging', () => {
  const session = new EducationSession(); session.selectTrail('sunset');
  session.pickups.forEach(pickup => session.collect(pickup.id));
  const overlay = new EducationOverlay(session, artwork); overlay.showAssembly(() => {});
  const letter = overlay.targets[0]; letter.action();
  overlay.targets.find(target => target.label === 'Space 1: empty')!.focus!();
  const selected = recordingContext(); overlay.draw(selected.ctx);
  expect(selected.frames).toContainEqual([letter.x + 4, letter.y + 4, letter.width - 8, letter.height - 8]);
  const identity = session.pile[0].id;
  overlay.beginDrag(identity, 200, 100);
  const dragging = recordingContext(); overlay.draw(dragging.ctx);
  expect(dragging.images.filter(call => call.image === artwork.tile)).toHaveLength(5);
  expect(session.wordProgress).toBe('_ _ _ _');
  expect(session.hasWordSticker).toBe(false);
});
