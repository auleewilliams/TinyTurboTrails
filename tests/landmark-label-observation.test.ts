import { afterEach, expect, it, vi } from 'vitest';
import { drawGameplayHud } from '../src/game/hud';
import { createRun } from '../src/game/interactions';
import { LEVELS } from '../src/world/levels';
import { landmarkGameplayAnchor, landmarkLabelProbeInit } from './landmark-label-observation';
afterEach(() => vi.unstubAllGlobals());
it.each(LEVELS)('$id observes the exact actual production location draw, rejecting stale and unrelated anchors', level => {
  // Synthetic canvas transport; real production renderer, NOT browser font/gameplay evidence.
  class Context {
    canvas = { id: 'game', dataset: {} as Record<string, string> };
    save() {} restore() {} fillRect() {} drawImage() {} fillText(_text: string, _x: number, _y: number) {}
    measureText(text: string) { return { width: text.length * 6, actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 0 }; }
  }
  vi.stubGlobal('window', {}); vi.stubGlobal('CanvasRenderingContext2D', Context);
  landmarkLabelProbeInit(landmarkGameplayAnchor);
  const ctx = new Context();
  ctx.fillText('wrong old lane', 415, 20); expect(ctx.canvas.dataset.gameplayTrail).toBeUndefined();
  drawGameplayHud(ctx as unknown as CanvasRenderingContext2D, createRun(level), '', level.name);
  expect(ctx.canvas.dataset.gameplayTrail).toBe(level.name);
  ctx.fillText('wrong counter', 28, 20); ctx.fillText(' ', landmarkGameplayAnchor.x, landmarkGameplayAnchor.y);
  expect(ctx.canvas.dataset.gameplayTrail).toBe(level.name);
  const glyph = JSON.parse(ctx.canvas.dataset.gameplayGlyph) as { text: string; left: number; right: number; top: number; bottom: number };
  expect(glyph.text).toBe(level.name); expect(glyph.right).toBeGreaterThan(glyph.left); expect(glyph.bottom).toBeGreaterThan(glyph.top);
  ctx.fillText('PATCHWORK VALE', 0, 0);
  expect(ctx.canvas.dataset.gameplayTrail).toBeUndefined(); expect(ctx.canvas.dataset.gameplayGlyph).toBeUndefined();
});
