import { describe, expect, it } from 'vitest';
import henryManifest from '../public/assets/henry/manifest.json';
import {
  FINISH_LAYOUT, celebrationBob, celebrationHenryRect, celebrationStarRects, finishGemsText, type Rect,
} from '../src/game/adventure-scene';
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
  const bobs = Array.from({ length: 64 }, (_, step) => celebrationBob((step / 64) * ((2 * Math.PI) / 10)));

  it('samples the full bob cycle', () => {
    expect(Math.min(...bobs)).toBe(-FINISH_LAYOUT.celebration.bobAmplitude);
    expect(Math.max(...bobs)).toBe(FINISH_LAYOUT.celebration.bobAmplitude);
  });

  it('fits the panel inside the logical screen', () => {
    expect(inside(panel, { x: 0, y: 0, width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT })).toBe(true);
  });

  it.each([0, 1, 7, 42, 999])('keeps Henry and the stars clear of the text with %i gems', (total) => {
    const text = [
      textRect('TRAIL COMPLETE!', title.baseline, title.size),
      textRect(finishGemsText(total), gems.baseline, gems.size),
      ...Array.from({ length: 3 }, (_, index) => ({ x: actions.x + index * actions.spacing, y: actions.y, width: actions.width, height: actions.height })),
      textRect('D-pad: choose · Face button: confirm', prompt.baseline, prompt.size),
    ];
    for (const rect of text) expect(inside(rect, panel)).toBe(true);
    for (let i = 1; i < text.length; i++) expect(overlaps(text[i - 1], text[i])).toBe(false);
    for (const bob of bobs) {
      const art = [celebrationHenryRect(henryManifest.anchor, bob), ...celebrationStarRects(bob)];
      for (const rect of art) {
        expect(inside(rect, panel)).toBe(true);
        for (const line of text) expect(overlaps(rect, line)).toBe(false);
      }
    }
  });

  it('pluralises the gem total', () => {
    expect(finishGemsText(1)).toBe('1 gem collected');
    expect(finishGemsText(12)).toBe('12 gems collected');
  });
});
