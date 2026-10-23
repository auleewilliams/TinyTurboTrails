import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { INTERFACE_PIECES, PLAQUE_TEXT_SLICE, loadInterfaceKit, nineSlicePlan, type InterfacePiece } from '../src/art/interface-kit';

const requested: string[] = [];
const sizes = new Map<string, [number, number]>();
const failures = new Set<string>();
vi.mock('../src/art/henry', () => ({ loadImage: async (url: string) => {
  requested.push(url);
  const name = url.split('/').at(-1)!;
  if (failures.has(name)) throw new Error(`Could not load ${url}`);
  const piece = INTERFACE_PIECES[name.replace('.png', '') as InterfacePiece];
  const [naturalWidth, naturalHeight] = sizes.get(name) ?? [piece.width, piece.height];
  return { name, naturalWidth, naturalHeight };
} }));

const record = JSON.parse(readFileSync(new URL('../assets/source/interface/preparation.json', import.meta.url), 'utf8')) as
  { pieces: Record<string, { logicalSize: { width: number; height: number }; slice: { left: number; top: number; right: number; bottom: number }; textSlice?: unknown }> };
const pieces = Object.keys(INTERFACE_PIECES) as InterfacePiece[];

it('matches the prepared record for every kit piece', () => {
  expect(pieces).toEqual(Object.keys(record.pieces));
  for (const name of pieces) {
    const { width, height, slice } = INTERFACE_PIECES[name];
    expect({ width, height }).toEqual(record.pieces[name].logicalSize);
    expect(slice).toEqual(record.pieces[name].slice);
  }
  expect(PLAQUE_TEXT_SLICE).toEqual(record.pieces.plaque.textSlice);
});

// Every dest size used by the scoped surfaces, plus degenerate and odd sizes.
const DESTS = [[338, 196], [346, 200], [422, 236], [139, 170], [132, 64], [155, 30], [102, 26], [104, 27], [79, 29], [47, 29],
  [42, 32], [166, 30], [150, 30], [76, 22], [56, 22], [80, 22], [127, 34], [136, 14], [90, 18], [12, 9], [3, 2], [1, 1]] as const;

it.each(pieces)('%s nine-slice plan tiles without scaling and covers each destination pixel exactly once', name => {
  const piece = INTERFACE_PIECES[name];
  for (const [width, height] of DESTS) {
    const plan = nineSlicePlan(piece, { x: 7, y: 11, width, height });
    const coverage = new Uint8Array(width * height);
    for (const op of plan) {
      expect([op.dw, op.dh]).toEqual([op.sw, op.sh]);
      expect([op.sx, op.sy, op.sw, op.sh, op.dx, op.dy].every(Number.isInteger)).toBe(true);
      expect(op.sw).toBeGreaterThan(0); expect(op.sh).toBeGreaterThan(0);
      expect(op.sx).toBeGreaterThanOrEqual(0); expect(op.sy).toBeGreaterThanOrEqual(0);
      expect(op.sx + op.sw).toBeLessThanOrEqual(piece.width); expect(op.sy + op.sh).toBeLessThanOrEqual(piece.height);
      for (let y = op.dy - 11; y < op.dy - 11 + op.dh; y++) for (let x = op.dx - 7; x < op.dx - 7 + op.dw; x++) coverage[y * width + x]++;
    }
    expect([...coverage].every(count => count === 1)).toBe(true);
  }
});

it('keeps corners at native size and repeats only the middle edge and centre segments', () => {
  const piece = INTERFACE_PIECES.panel, [left, top, right, bottom] = [piece.slice.left, piece.slice.top, piece.slice.right, piece.slice.bottom];
  const plan = nineSlicePlan(piece, { x: 44, y: 24, width: 338, height: 196 });
  expect(plan[0]).toEqual({ sx: 0, sy: 0, sw: left, sh: top, dx: 44, dy: 24, dw: left, dh: top });
  expect(plan).toContainEqual({ sx: piece.width - right, sy: piece.height - bottom, sw: right, sh: bottom,
    dx: 44 + 338 - right, dy: 24 + 196 - bottom, dw: right, dh: bottom });
  // Edge and centre tiles only sample the middle segment, never a corner.
  for (const op of plan.filter(op => op.dx >= 44 + left && op.dx < 44 + 338 - right)) {
    expect(op.sx).toBeGreaterThanOrEqual(left); expect(op.sx + op.sw).toBeLessThanOrEqual(piece.width - right);
  }
  // Small destinations clip corners symmetrically rather than squashing them.
  const tiny = nineSlicePlan(INTERFACE_PIECES.plaque, { x: 0, y: 0, width: 5, height: 3 });
  expect(tiny.every(op => op.dw === op.sw && op.dh === op.sh)).toBe(true);
});

it('rounds fractional destinations to whole logical pixels', () => {
  const plan = nineSlicePlan(INTERFACE_PIECES.button, { x: 10.4, y: 3.6, width: 50.2, height: 20.7 });
  expect(Math.min(...plan.map(op => op.dx))).toBe(10); expect(Math.min(...plan.map(op => op.dy))).toBe(4);
  expect(Math.max(...plan.map(op => op.dx + op.dw))).toBe(61); expect(Math.max(...plan.map(op => op.dy + op.dh))).toBe(24);
});

it('requires every kit piece at its native size, without a partial fallback', async () => {
  requested.length = 0;
  const kit = await loadInterfaceKit();
  expect(requested.map(url => url.split('/').at(-1))).toEqual(pieces.map(name => `${name}.png`));
  expect(requested.every(url => url.includes('assets/interface/'))).toBe(true);
  for (const name of pieces) expect(kit[name]).toMatchObject({ name: `${name}.png` });
  for (const name of pieces) {
    const file = `${name}.png`;
    failures.add(file);
    await expect(loadInterfaceKit()).rejects.toThrow(file);
    failures.delete(file);
    sizes.set(file, [INTERFACE_PIECES[name].width, INTERFACE_PIECES[name].height + 1]);
    await expect(loadInterfaceKit()).rejects.toThrow('Invalid interface artwork dimensions');
    sizes.delete(file);
  }
  await expect(loadInterfaceKit()).resolves.toBeDefined();
});
