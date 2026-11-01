import type { LevelData } from './level';

/** World-anchored cues share the exact movement segment, never the camera's pixel grid. */
export function drawSurfaceMaterials(ctx: CanvasRenderingContext2D, level: LevelData,
  offset: { x: number; y: number }, kit?: CoveMaterialAssets, runSeconds = 0, reducedMotion = false): void {
  if (level.id === 'cove' && kit) { drawCoveMaterials(ctx, kit, level, offset, runSeconds, reducedMotion); return; }
  for (const surface of level.surfaces) {
    const material = surface.material;
    if (!material || surface.x2 < offset.x || surface.x1 > offset.x + 426) continue;
    const yAt = (x: number): number => surface.y1 + (surface.y2 - surface.y1)
      * (x - surface.x1) / (surface.x2 - surface.x1) - offset.y;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y);
    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y);
    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y + 8);
    ctx.lineTo(surface.x1 - offset.x, surface.y1 - offset.y + 8);
    ctx.closePath();
    ctx.fillStyle = material === 'ice' ? '#59c9e8' : material === 'sand' ? '#d5a34f' : '#298fab';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = material === 'sand' ? '#825b31' : '#e9fcff';
    const spacing = material === 'sand' ? 12 : 24;
    const start = Math.floor(Math.max(surface.x1, offset.x) / spacing) * spacing;
    for (let x = start; x < Math.min(surface.x2, offset.x + 426); x += spacing) {
      const y = yAt(x);
      if (material === 'ice') {
        ctx.fillRect(x - offset.x, y + 3, 7, 1);
        ctx.fillRect(x + 3 - offset.x, y + 1, 1, 5);
      } else if (material === 'sand') {
        ctx.fillRect(x - offset.x, y + 2, 2, 2);
        ctx.fillRect(x + 6 - offset.x, y + 5, 2, 2);
      } else {
        ctx.fillRect(x - offset.x, y + 3, 8, 1);
        ctx.fillRect(x + 8 - offset.x, y + 2, 4, 1);
        ctx.fillRect(x + 12 - offset.x, y + 3, 8, 1);
      }
    }
    ctx.restore();
  }
}

export interface CoveMaterialRect { x: number; y: number; width: number; height: number }
export interface CoveMaterialBand { material: 'sand' | 'water'; x1: number; x2: number; top: number; base: CoveMaterialRect; ripple?: CoveMaterialRect }
export interface CoveMaterialManifest { version: number; image: string; width: number; height: number; pieces: Record<string, CoveMaterialRect>; bands: CoveMaterialBand[] }
export interface CoveMaterialAssets { image: HTMLImageElement; manifest: CoveMaterialManifest }

/** Declared assets are required; validate the exact native source regions, including overlaps. */
export function validateCoveMaterials(value: unknown): asserts value is CoveMaterialManifest {
  const m = value as CoveMaterialManifest;
  if (!m || m.version !== 1 || m.image !== 'atlas.png' || m.width !== 512 || m.height !== 160 || !m.pieces || !Array.isArray(m.bands)
    || Object.keys(m).sort().join(',') !== 'bands,height,image,pieces,version,width') throw new Error('Invalid Cove material metadata');
  const expected: Record<string, number[]> = {
    'water-left': [0, 0, 8, 8], 'water-repeat': [16, 0, 48, 8], 'water-right': [72, 0, 8, 8], 'water-ripples': [16, 16, 48, 4],
    'sand-left': [0, 32, 6, 8], 'sand-repeat': [16, 32, 24, 8], 'sand-right': [48, 32, 6, 8],
  };
  if (Object.keys(m.pieces).sort().join() !== Object.keys(expected).sort().join()) throw new Error('Invalid Cove material pieces');
  const occupied = new Set<number>();
  const check = (rect: CoveMaterialRect, want: number[]): void => {
    if (!rect || Object.keys(rect).sort().join(',') !== 'height,width,x,y'
      || [rect.x, rect.y, rect.width, rect.height].some((n, i) => !Number.isInteger(n) || n !== want[i])
      || rect.x < 0 || rect.y < 0 || rect.x + rect.width > m.width || rect.y + rect.height > m.height) throw new Error('Invalid Cove material rectangle');
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) {
      const index = y * m.width + x;
      if (occupied.has(index)) throw new Error('Overlapping Cove material rectangles');
      occupied.add(index);
    }
  };
  for (const [name, rect] of Object.entries(expected)) check(m.pieces[name], rect);
  const spans = [[75, 105, 360], [520, 600, 352], [1660, 1860, 344], [2200, 2500, 344], [3040, 3220, 344]];
  if (m.bands.length !== spans.length) throw new Error('Invalid Cove material bands');
  m.bands.forEach((band, i) => {
    const [x1, x2, top] = spans[i], water = i >= 2;
    if (!band || band.x1 !== x1 || band.x2 !== x2 || band.top !== top || band.material !== (water ? 'water' : 'sand')
      || Object.keys(band).sort().join(',') !== (water ? 'base,material,ripple,top,x1,x2' : 'base,material,top,x1,x2')) throw new Error('Invalid Cove material span');
    check(band.base, [0, [64, 72, 80, 96, 112][i], x2 - x1, 8]);
    if (water) check(band.ripple!, [0, 128 + (i - 2) * 8, x2 - x1 + 2, 4]);
  });
}

/** No promise cache: ordinary asset Retry performs fresh requests after any rejection. */
export async function loadCoveMaterials(base: string, path?: string): Promise<CoveMaterialAssets | undefined> {
  if (path === undefined) return undefined;
  if (path !== 'materials/manifest.json') throw new Error('Invalid Cove material declaration');
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error('Could not load Cove material metadata');
  const manifest: unknown = await response.json(); validateCoveMaterials(manifest);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not load Cove material image'));
    image.src = `${base}materials/${manifest.image}`;
  });
  if (image.naturalWidth !== manifest.width || image.naturalHeight !== manifest.height) throw new Error('Invalid Cove material image dimensions');
  return { image, manifest };
}

/** Pure existing-presentation-time phase: no clocks, simulation ticks or mutable animation state. */
export function coveRipplePhase(seconds: number, reducedMotion = false): { x: number; opacity: number } {
  const wave = reducedMotion ? 0 : Math.sin((Math.max(0, Number.isFinite(seconds) ? seconds : 0) % 4) * Math.PI / 2);
  return { x: wave, opacity: 0.65 + 0.15 * wave };
}

/** Each painted band is one contiguous native raster. Only the separate real-source glints move. */
export function drawCoveMaterials(ctx: CanvasRenderingContext2D, kit: CoveMaterialAssets, level: LevelData,
  offset: { x: number; y: number }, seconds = 0, reducedMotion = false): void {
  const phase = coveRipplePhase(seconds, reducedMotion);
  for (const band of kit.manifest.bands) {
    if (band.x2 < offset.x || band.x1 > offset.x + 426) continue;
    const surface = level.surfaces.find(s => s.x1 === band.x1 && s.x2 === band.x2 && s.material === band.material);
    if (!surface || surface.y1 !== band.top || surface.y2 !== band.top) throw new Error('Cove material surface mismatch');
    const x = band.x1 - offset.x, y = band.top - offset.y, width = band.x2 - band.x1, base = band.base;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, 8); ctx.clip();
    ctx.drawImage(kit.image, base.x, base.y, base.width, base.height, x, y, width, 8);
    if (band.ripple) {
      const r = band.ripple;
      ctx.globalAlpha *= phase.opacity;
      ctx.drawImage(kit.image, r.x + 1 - phase.x, r.y, width, 4, x, y + 2, width, 4);
    }
    ctx.restore();
  }
}
