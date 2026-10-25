import { expect, it } from 'vitest';
import { INTERFACE_PIECES, type InterfaceKit, type InterfacePiece } from '../src/art/interface-kit';
import { FINISH_LAYOUT, drawFinishChrome, finishActionRects } from '../src/game/adventure-scene';
import { PAUSE_PANEL, PauseMenu, drawFocusPause } from '../src/game/pause-menu';
import { EducationOverlay, STICKER_CARD } from '../src/game/education-overlay';
import { EducationSession, TRAIL_WORDS } from '../src/game/education';
import { BAG_PLAQUE, HUD_PLAQUES, TRAIL_RIBBON, drawBagBacking, drawGameplayHud, drawTrailRibbon, HudPresentation } from '../src/game/hud';
import { OVERWORLD_LAYOUT, drawOverworld, TrailSession } from '../src/game/overworld';
import { createRun } from '../src/game/interactions';
import { LEVELS } from '../src/world/levels';

const kit = Object.fromEntries(Object.keys(INTERFACE_PIECES).map(name => [name, { piece: name }])) as unknown as InterfaceKit;
interface Draw { piece: InterfacePiece; rect: number[] }

/** Records kit draws (by piece and destination) and live text separately. */
export function recordingContext() {
  const draws: Draw[] = [], text: { text: string; x: number; y: number; fill: unknown; font: string }[] = [], fills: number[][] = [];
  const state: Record<string, unknown> = { fillStyle: '#000', font: '10px monospace', globalAlpha: 1 };
  const stack: Record<string, unknown>[] = [];
  const ctx = new Proxy(state, {
    get: (target, key) => {
      if (key === 'save') return () => stack.push({ ...target });
      if (key === 'restore') return () => Object.assign(target, stack.pop());
      if (key === 'drawImage') return (image: { piece?: InterfacePiece }, ...args: number[]) => {
        if (image.piece) draws.push({ piece: image.piece, rect: args.slice(4) });
      };
      if (key === 'fillText') return (value: string, x: number, y: number) => text.push({ text: value, x, y, fill: target.fillStyle, font: String(target.font) });
      if (key === 'fillRect') return (...rect: number[]) => fills.push(rect);
      if (key === 'measureText') return (value: string) => ({ width: value.length * 6 });
      return Reflect.get(target, key) ?? (() => {});
    },
    set: (target, key, value) => Reflect.set(target, key, value),
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, draws, text, fills };
}

/** Union bounds of the slice draws for one piece within a target rectangle. */
export function bounds(draws: Draw[], piece: InterfacePiece, within?: { x: number; y: number; width: number; height: number }) {
  const rects = draws.filter(draw => draw.piece === piece).map(({ rect: [x, y, w, h] }) => ({ x, y, w, h }))
    .filter(r => !within || (r.x >= within.x && r.y >= within.y && r.x + r.w <= within.x + within.width && r.y + r.h <= within.y + within.height));
  if (!rects.length) return undefined;
  const x = Math.min(...rects.map(r => r.x)), y = Math.min(...rects.map(r => r.y));
  return { x, y, width: Math.max(...rects.map(r => r.x + r.w)) - x, height: Math.max(...rects.map(r => r.y + r.h)) - y };
}

const labels = ['Next trail', 'Map', 'Build your word', 'Replay'] as const;
const actions = finishActionRects(labels).map((rect, index) => ({ label: labels[index], ...rect, selected: index === 1, action: () => {} }));

it('finish results use the generated panel and focused/normal buttons at their existing bounds', () => {
  const { ctx, draws } = recordingContext();
  drawFinishChrome(ctx, kit, actions);
  expect(bounds(draws, 'panel')).toEqual(FINISH_LAYOUT.panel);
  for (const action of actions) {
    const piece = action.selected ? 'button-selected' : 'button';
    expect(bounds(draws, piece, action)).toEqual({ x: action.x, y: action.y, width: action.width, height: action.height });
  }
  expect(bounds(draws, 'button-selected', actions[0])).toBeUndefined();
  expect(draws.every(draw => draw.rect[2] > 0 && draw.rect[3] > 0)).toBe(true);
});

it('finish results keep the flat presentation when no kit is supplied', () => {
  const { ctx, draws, fills } = recordingContext();
  drawFinishChrome(ctx, undefined, actions);
  expect(draws).toEqual([]);
  expect(fills).toContainEqual([FINISH_LAYOUT.panel.x, FINISH_LAYOUT.panel.y, FINISH_LAYOUT.panel.width, FINISH_LAYOUT.panel.height]);
});

it('finish text and actions sit inside the panel interior, clear of its timber frame', () => {
  const { panel, title, prompt, actions: row } = FINISH_LAYOUT, inset = INTERFACE_PIECES.panel.slice;
  const interior = { top: panel.y + inset.top, bottom: panel.y + panel.height - inset.bottom,
    left: panel.x + inset.left, right: panel.x + panel.width - inset.right };
  // Ascent of a full em and a fifth-em descent, as in finish-layout.test.ts.
  expect(title.baseline - title.size).toBeGreaterThanOrEqual(interior.top);
  expect(prompt.baseline + prompt.size * 0.2).toBeLessThanOrEqual(interior.bottom);
  expect(row.y + row.height).toBeLessThanOrEqual(interior.bottom);
  for (const set of [labels, labels.slice(1)]) {
    const rects = finishActionRects(set);
    expect(rects[0].x).toBeGreaterThanOrEqual(interior.left);
    expect(rects.at(-1)!.x + rects.at(-1)!.width).toBeLessThanOrEqual(interior.right);
  }
});

const rect = (target: { x: number; y: number; width: number; height: number }) => ({ x: target.x, y: target.y, width: target.width, height: target.height });
const inside = (inner: { x: number; y: number; width: number; height: number }, outer: typeof inner) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;

it.each([false, true])('pause (confirming: %s) frames its text in the panel and draws buttons at their hit targets', confirming => {
  const menu = new PauseMenu(() => {}, () => {});
  if (confirming) menu.update({ horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false, trailsPressed: true });
  const { ctx, draws, text } = recordingContext();
  menu.draw(ctx, 'keyboard', kit);
  expect(bounds(draws, 'panel')).toEqual(PAUSE_PANEL);
  for (const target of menu.targets) expect(bounds(draws, target.selected ? 'button-selected' : 'button', target)).toEqual(rect(target));
  const inset = INTERFACE_PIECES.panel.slice;
  for (const line of text) {
    expect(line.y - 20).toBeGreaterThanOrEqual(PAUSE_PANEL.y + inset.top - 6);
    expect(line.y + 3).toBeLessThanOrEqual(PAUSE_PANEL.y + PAUSE_PANEL.height - inset.bottom);
  }
  expect(text.map(line => line.text)).toContain(confirming ? 'LEAVE THIS TRAIL?' : 'PAUSED');
});

it('focus-loss pause uses the same panel with its live control hints', () => {
  const { ctx, draws, text } = recordingContext();
  drawFocusPause(ctx, 'controller', kit);
  expect(bounds(draws, 'panel')).toEqual(PAUSE_PANEL);
  expect(text.map(line => line.text)).toEqual(['PAUSED', 'Return to the game to continue', 'Stick / D-pad: move', 'Jump / select', 'Start', 'Resume']);
});

it('sticker collection uses plaque cards and the selected return button without moving targets or covering stickers', () => {
  const session = new EducationSession();
  const overlay = new EducationOverlay(session, undefined, kit); overlay.showStickers();
  const { ctx, draws, text } = recordingContext();
  overlay.draw(ctx);
  TRAIL_WORDS.forEach((_config, index) => {
    const card = { x: 9 + index % 3 * 138, y: 36 + Math.floor(index / 3) * 69, width: STICKER_CARD.width, height: STICKER_CARD.height };
    expect(bounds(draws, 'plaque', card)).toEqual(card);
    // Labels sit inside the plaque's quiet interior, above its bottom border.
    const lines = text.filter(line => line.x === card.x + 66 && line.y > card.y && line.y < card.y + card.height);
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(line.y + 2).toBeLessThanOrEqual(card.y + card.height - INTERFACE_PIECES.plaque.slice.bottom);
  });
  const [back] = overlay.targets;
  expect(bounds(draws, 'button-selected', back)).toEqual(rect(back));
});

it('assembly gives empty spaces and actions kit buttons while tiles, glyphs and targets stay unchanged', () => {
  const session = new EducationSession(); session.selectTrail(LEVELS[0].id);
  session.pickups.slice(0, 3).forEach(pickup => session.collect(pickup.id));
  const overlay = new EducationOverlay(session, undefined, kit); overlay.showAssembly(() => {});
  const { ctx, draws, text } = recordingContext();
  overlay.draw(ctx);
  for (const target of overlay.targets) {
    if (target.label.startsWith('Letter ')) { expect(bounds(draws, 'button', target)).toBeUndefined(); continue; }
    expect(bounds(draws, target.selected ? 'button-selected' : 'button', target)).toEqual(rect(target));
  }
  expect(text.map(line => line.text)).toEqual(expect.arrayContaining(['Find more letters', 'Leave activity', '_']));
});

it('HUD backings use compact plaques within compact rectangles and never grow their coverage', () => {
  const run = createRun(LEVELS[0]); run.specialTotal = 3;
  const { ctx, draws } = recordingContext();
  drawGameplayHud(ctx, run, 'Space: jump', 'PLAINS', new HudPresentation().progress(LEVELS[0], LEVELS[0].start.x), kit);
  const plaques = draws.filter(draw => draw.piece === 'plaque');
  for (const area of [HUD_PLAQUES.gems, HUD_PLAQUES.hearts, HUD_PLAQUES.stars]) expect(bounds(plaques, 'plaque', area)).toEqual(area);
  expect(bounds(plaques, 'plaque', { x: 5, y: 31, width: 200, height: 18 })).toEqual({ x: 5, y: 31, width: 'Space: jump'.length * 6 + 10, height: 18 });
  const noticeWidth = 'PLAINS'.length * 6 + 12;
  expect(bounds(plaques, 'plaque', { x: 300, y: 5, width: 121, height: 22 })).toEqual({ x: 421 - noticeWidth, y: 5, width: noticeWidth, height: 22 });
  expect(bounds(plaques, 'plaque', TRAIL_RIBBON)).toEqual(rect(TRAIL_RIBBON));
  expect(draws.some(draw => draw.piece !== 'plaque')).toBe(false);
});

it('ribbon and bag backings use the plaque, while the pouch and ribbon marks stay separately drawn', () => {
  const ribbon = recordingContext();
  drawTrailRibbon(ribbon.ctx, new HudPresentation().progress(LEVELS[0], LEVELS[0].start.x), kit);
  expect(bounds(ribbon.draws, 'plaque')).toEqual(rect(TRAIL_RIBBON));
  expect(ribbon.fills.length).toBeGreaterThan(8);
  const bag = recordingContext();
  drawBagBacking(bag.ctx, kit);
  expect(bounds(bag.draws, 'plaque')).toEqual(BAG_PLAQUE);
});

it('restores caller text alignment, ink, font and alpha after HUD rendering', () => {
  const { ctx } = recordingContext();
  ctx.textAlign = 'center'; ctx.fillStyle = '#abcdef'; ctx.font = '17px serif'; ctx.globalAlpha = 0.4;
  drawGameplayHud(ctx, createRun(LEVELS[0]), 'Space: jump', 'Checkpoint reached!', new HudPresentation().progress(LEVELS[0], 50), kit);
  expect([ctx.textAlign, ctx.fillStyle, ctx.font, ctx.globalAlpha]).toEqual(['center', '#abcdef', '17px serif', 0.4]);
});

it('overworld info panel, Play and Stickers use the kit at their native target bounds with no story control', () => {
  const { ctx, draws, text } = recordingContext();
  drawOverworld(ctx, LEVELS, 0, new TrailSession().results, { naturalWidth: 1, naturalHeight: 1 } as HTMLImageElement, {} as HTMLImageElement,
    undefined, undefined, undefined, kit);
  const { panel, play, preview } = OVERWORLD_LAYOUT;
  expect(bounds(draws, 'plaque', panel)).toEqual(panel);
  // The trail preview sits inside the plaque's interior, never over its border.
  const inset = INTERFACE_PIECES.plaque.slice;
  expect(inside(preview, { x: panel.x + inset.left, y: panel.y + inset.top, width: panel.width - inset.left - inset.right, height: panel.height - inset.top - inset.bottom })).toBe(true);
  expect(bounds(draws, 'button-selected', play)).toEqual(play);
  expect(bounds(draws, 'button', OVERWORLD_LAYOUT.stickers)).toEqual(OVERWORLD_LAYOUT.stickers);
  // The former story control (367, 7, 47×29) is gone: no kit piece is drawn right of Stickers.
  const stickersRight = OVERWORLD_LAYOUT.stickers.x + OVERWORLD_LAYOUT.stickers.width;
  expect(draws.filter(draw => draw.rect[0] >= stickersRight && draw.rect[1] < panel.y)).toEqual([]);
  expect(text.map(line => line.text)).toContain('PLAY');
});
