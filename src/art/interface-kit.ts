import { loadImage } from './henry';

/**
 * Generated nine-slice interface art, prepared by `scripts/prepare-interface-kit.mjs`.
 * Sizes and insets mirror `assets/source/interface/preparation.json`.
 */
export const INTERFACE_PIECES = {
  panel: { width: 92, height: 91, slice: { left: 10, top: 10, right: 10, bottom: 10 } },
  button: { width: 82, height: 21, slice: { left: 6, top: 6, right: 6, bottom: 6 } },
  'button-selected': { width: 82, height: 21, slice: { left: 6, top: 6, right: 6, bottom: 6 } },
  plaque: { width: 112, height: 24, slice: { left: 4, top: 4, right: 4, bottom: 4 } },
} as const;
export type InterfacePiece = keyof typeof INTERFACE_PIECES;
export type InterfaceKit = Readonly<Record<InterfacePiece, HTMLImageElement>>;
export interface NineSliceSource { width: number; height: number; slice: { left: number; top: number; right: number; bottom: number } }
export interface SliceOp { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number }
interface Band { s: number; size: number; d: number }

export async function loadInterfaceKit(): Promise<InterfaceKit> {
  const base = `${import.meta.env.BASE_URL}assets/interface/`;
  const names = Object.keys(INTERFACE_PIECES) as InterfacePiece[];
  const images = await Promise.all(names.map(name => loadImage(`${base}${name}.png`)));
  images.forEach((image, index) => {
    const { width, height } = INTERFACE_PIECES[names[index]];
    if (image.naturalWidth !== width || image.naturalHeight !== height) throw new Error('Invalid interface artwork dimensions');
  });
  return Object.fromEntries(names.map((name, index) => [name, images[index]])) as unknown as InterfaceKit;
}

/** Corners at native size; edges and centre repeat their middle segment, cropping the last tile. */
function bands(length: number, start: number, end: number, size: number, origin: number): Band[] {
  // Destinations smaller than both insets crop each corner instead of squashing it.
  const head = Math.min(start, Math.floor(size / 2)), tail = Math.min(end, size - head);
  const segment = length - start - end, middle = size - head - tail;
  const result: Band[] = [];
  if (head > 0) result.push({ s: 0, size: head, d: origin });
  for (let offset = 0; offset < middle; offset += segment) result.push({ s: start, size: Math.min(segment, middle - offset), d: origin + head + offset });
  if (tail > 0) result.push({ s: length - tail, size: tail, d: origin + size - tail });
  return result;
}

export function nineSlicePlan(source: NineSliceSource, rect: { x: number; y: number; width: number; height: number }): SliceOp[] {
  const x = Math.round(rect.x), y = Math.round(rect.y);
  const width = Math.round(rect.x + rect.width) - x, height = Math.round(rect.y + rect.height) - y;
  if (width <= 0 || height <= 0) return [];
  const { left, top, right, bottom } = source.slice;
  const columns = bands(source.width, left, right, width, x), rows = bands(source.height, top, bottom, height, y);
  return rows.flatMap(row => columns.map(column => ({
    sx: column.s, sy: row.s, sw: column.size, sh: row.size, dx: column.d, dy: row.d, dw: column.size, dh: row.size,
  })));
}

/** Draws a kit piece into a logical-pixel rectangle; flat colours stand in only when no kit is supplied. */
export function drawKitFrame(ctx: CanvasRenderingContext2D, kit: InterfaceKit | undefined, piece: InterfacePiece,
  x: number, y: number, width: number, height: number, fallback: { fill: string; stroke?: string }): void {
  if (!kit) {
    ctx.fillStyle = fallback.fill; ctx.fillRect(x, y, width, height);
    if (fallback.stroke) { ctx.strokeStyle = fallback.stroke; ctx.strokeRect(x, y, width, height); }
    return;
  }
  const image = kit[piece];
  for (const op of nineSlicePlan(INTERFACE_PIECES[piece], { x, y, width, height })) {
    ctx.drawImage(image, op.sx, op.sy, op.sw, op.sh, op.dx, op.dy, op.dw, op.dh);
  }
}

/** A focusable control's backing: the warm selected plank marks the current choice. */
export function drawKitButton(ctx: CanvasRenderingContext2D, kit: InterfaceKit | undefined,
  target: { x: number; y: number; width: number; height: number; selected?: boolean }, fallback: { fill: string; selectedFill: string; stroke?: string }): void {
  drawKitFrame(ctx, kit, target.selected ? 'button-selected' : 'button', target.x, target.y, target.width, target.height,
    { fill: target.selected ? fallback.selectedFill : fallback.fill, stroke: fallback.stroke });
}
