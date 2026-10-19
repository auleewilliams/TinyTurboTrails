import { expect, it } from 'vitest';
import type { SpellingAssets } from '../src/art/spelling';
import { EducationSession, TRAIL_WORDS } from '../src/game/education';
import { EducationOverlay } from '../src/game/education-overlay';

const artwork = { pouch: {}, tile: {}, sunsetSticker: {} } as SpellingAssets;

function recordingContext() {
  const images: { image: unknown; alpha: number }[] = [];
  const glyphs: string[] = [];
  const frames: number[][] = [];
  const state = { globalAlpha: 1 };
  const stack: typeof state[] = [];
  const ctx = new Proxy(state, {
    get: (target, key) => {
      if (key === 'save') return () => stack.push({ ...target });
      if (key === 'restore') return () => Object.assign(target, stack.pop());
      if (key === 'drawImage') return (image: unknown) => images.push({ image, alpha: target.globalAlpha });
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
  expect(mixed.images.some(call => call.image === artwork.sunsetSticker)).toBe(false);
  session.pickups.forEach((pickup, slot) => session.place(pickup.id, slot));
  const earned = recordingContext(); overlay.draw(earned.ctx);
  expect(earned.images.filter(call => call.image === artwork.tile)).toHaveLength(4);
  expect(earned.images.filter(call => call.image === artwork.sunsetSticker)).toHaveLength(config.id === 'sunset' ? 1 : 0);
  overlay.showStickers();
  const collection = recordingContext(); overlay.draw(collection.ctx);
  expect(collection.images.filter(call => call.image === artwork.sunsetSticker)).toEqual([
    { image: artwork.sunsetSticker, alpha: config.id === 'sunset' ? 1 : 0.3 },
  ]);
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
