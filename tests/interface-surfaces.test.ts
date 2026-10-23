import { expect, it } from 'vitest';
import { INTERFACE_PIECES, type InterfaceKit, type InterfacePiece } from '../src/art/interface-kit';
import { FINISH_LAYOUT, drawFinishChrome } from '../src/game/adventure-scene';

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

const actions = ['Replay', 'Next trail', 'Choose trail'].map((label, index) => ({ label,
  x: FINISH_LAYOUT.actions.x + index * FINISH_LAYOUT.actions.spacing, y: FINISH_LAYOUT.actions.y,
  width: FINISH_LAYOUT.actions.width, height: FINISH_LAYOUT.actions.height, selected: index === 1, action: () => {} }));

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
  expect(row.x).toBeGreaterThanOrEqual(interior.left);
  expect(row.x + row.spacing * 2 + row.width).toBeLessThanOrEqual(interior.right);
});
