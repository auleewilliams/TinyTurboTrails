/** One cached alpha-clipped tint per atlas. Canvas compositing works in WebKit too,
 * unlike CanvasRenderingContext2D.filter. No per-frame offscreen allocation. */
const flashes = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
export function hitFlashAtlas(atlas: HTMLImageElement): CanvasImageSource {
  if (typeof document === 'undefined') return atlas;
  const cached = flashes.get(atlas);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = atlas.naturalWidth;
  canvas.height = atlas.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return atlas;
  ctx.drawImage(atlas, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = '#fff1a899';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  flashes.set(atlas, canvas);
  return canvas;
}
