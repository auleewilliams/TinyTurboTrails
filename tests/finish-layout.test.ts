import { describe, expect, it } from 'vitest';
import henryManifest from '../public/assets/henry/manifest.json';
import {
  FINISH_LAYOUT, celebrationHenryRect, celebrationStarRects, finishGemsText, type Rect,
} from '../src/game/adventure-scene';
import { celebrationJump } from '../src/game/celebration';
import { createRun, startNewRun } from '../src/game/interactions';
import { LEVELS } from '../src/world/levels';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../src/core/viewport';

// Conservative monospace box: glyphs are ~0.6em wide, ascend a full em and descend a fifth.
function textRect(text: string, baseline: number, size: number): Rect {
  const width = text.length * size * 0.6;
  return { x: FINISH_LAYOUT.centerX - width / 2, y: baseline - size, width, height: size * 1.2 };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function inside(inner: Rect, outer: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
}

describe('finish screen composition', () => {
  const { panel, title, gems, actions, prompt } = FINISH_LAYOUT;
  const times = Array.from({ length: 121 }, (_, step) => step / 60);
  const bobs = times.map(time => celebrationJump(time));

  it('samples takeoff, peak and landing', () => {
    expect(Math.min(...bobs)).toBe(-8);
    expect(Math.max(...bobs)).toBe(0);
  });

  it('fits the panel inside the logical screen', () => {
    expect(inside(panel, { x: 0, y: 0, width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT })).toBe(true);
  });

  it.each([0, 1, 7, 42, 999])('keeps Henry and the stars clear of the text with %i gems', (total) => {
    const text = [
      textRect('TRAIL COMPLETE!', title.baseline, title.size),
      textRect(finishGemsText(total, 999), gems.baseline, gems.size),
      ...Array.from({ length: 3 }, (_, index) => ({ x: actions.x + index * actions.spacing, y: actions.y, width: actions.width, height: actions.height })),
      textRect('D-pad: choose · Face button: confirm', prompt.baseline, prompt.size),
    ];
    for (const rect of text) expect(inside(rect, panel)).toBe(true);
    for (let i = 1; i < text.length; i++) expect(overlaps(text[i - 1], text[i])).toBe(false);
    for (const bob of bobs) {
      const art = [celebrationHenryRect(henryManifest.anchor, bob), ...times.flatMap(time => celebrationStarRects(time)), ...celebrationStarRects(0, true), FINISH_LAYOUT.payoff];
      for (const rect of art) {
        expect(inside(rect, panel)).toBe(true);
        for (const line of text) expect(overlaps(rect, line)).toBe(false);
      }
    }
  });

  it('shows gems collected against the total in the same shape as stars', () => {
    expect(finishGemsText(1, 44)).toBe('GEMS 1/44');
    expect(finishGemsText(18, 44)).toBe('GEMS 18/44');
  });

  it.each(LEVELS.map(level => [level.name, level] as const))('derives the %s gem total from level data', (_, level) => {
    const total = level.entities.filter(entity => entity.kind === 'gem').length;
    const run = createRun(level);
    expect(run.gemTotal).toBe(total);
    expect(total).toBeGreaterThan(0);
    run.gemTotal = 0;
    startNewRun(run, level);
    expect(run.gemTotal).toBe(total);
    const text = textRect(finishGemsText(total, total), gems.baseline, gems.size);
    const box = run.specialTotal ? { ...text, x: 132 - text.width / 2 } : text;
    expect(inside(box, panel)).toBe(true);
  });

  it('fits separate gem and star results on the result row for every star count', () => {
    for (const count of [0, 1, 2, 3]) {
      const gemBox = { ...textRect(finishGemsText(999, 999), gems.baseline, gems.size), x: 132 - finishGemsText(999, 999).length * 3 };
      const starBox = { ...textRect(`STARS ${count}/3`, gems.baseline, gems.size), x: 292 - `STARS ${count}/3`.length * 3 };
      expect(inside(gemBox, panel)).toBe(true);
      expect(inside(starBox, panel)).toBe(true);
      expect(overlaps(gemBox, starBox)).toBe(false);
      for (const bob of bobs) {
        for (const art of [celebrationHenryRect(henryManifest.anchor, bob), ...times.flatMap(time => celebrationStarRects(time)), ...celebrationStarRects(0, true), FINISH_LAYOUT.payoff]) {
          expect(overlaps(art, gemBox)).toBe(false);
          expect(overlaps(art, starBox)).toBe(false);
        }
      }
    }
  });
});
