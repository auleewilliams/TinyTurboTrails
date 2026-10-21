import { loadImage } from './henry';
import { TRAIL_WORDS } from '../game/education';

export interface SpellingAssets {
  pouch: HTMLImageElement;
  tile: HTMLImageElement;
  /** One generated reward sticker per trail id, e.g. `public/assets/spelling/plains-sticker.png`. */
  stickers: Readonly<Record<string, HTMLImageElement>>;
}

export async function loadSpellingAssets(): Promise<SpellingAssets> {
  const base = `${import.meta.env.BASE_URL}assets/spelling/`;
  const [pouch, tile, ...stickers] = await Promise.all([
    loadImage(`${base}pouch.png`), loadImage(`${base}tile.png`),
    ...TRAIL_WORDS.map(config => loadImage(`${base}${config.id}-sticker.png`)),
  ]);
  for (const [image, width, height] of [[pouch, 28, 28], [tile, 42, 32], ...stickers.map(sticker => [sticker, 56, 56] as const)] as const) {
    if (image.naturalWidth !== width || image.naturalHeight !== height) throw new Error('Invalid spelling artwork dimensions');
  }
  return { pouch, tile, stickers: Object.fromEntries(TRAIL_WORDS.map((config, index) => [config.id, stickers[index]])) };
}

/** Only the backing is illustrated; glyphs stay crisp and independent of pickup identity. */
export function drawLetterTile(ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined,
  letter: string, x: number, y: number, width: number, height: number, selected = false, held = false): void {
  ctx.save();
  if (image) ctx.drawImage(image, x, y, width, height);
  else { ctx.fillStyle = '#ffda75'; ctx.fillRect(x, y, width, height); }
  ctx.fillStyle = '#17333b'; ctx.textAlign = 'center';
  ctx.font = `bold ${width >= 42 ? 17 : 16}px monospace`;
  ctx.fillText(letter, x + width / 2, y + height / 2 + (height === 24 ? 6 : 5));
  if (held) {
    // An inset frame marks the tile in hand even after focus moves to a space.
    ctx.strokeStyle = '#17333b'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, width - 8, height - 8);
  }
  if (selected) {
    // The outer frame and caret distinguish focus without depending on color.
    ctx.strokeStyle = '#e9f2df'; ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
    ctx.fillStyle = '#e9f2df'; ctx.beginPath();
    ctx.moveTo(x + width / 2 - 3, y - 6); ctx.lineTo(x + width / 2 + 3, y - 6);
    ctx.lineTo(x + width / 2, y - 2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
