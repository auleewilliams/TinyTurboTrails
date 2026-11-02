export interface TimbersTreeManifest {
  version: number;
  image: string;
  width: number;
  height: number;
  x: number;
  y: number;
  groundY: number;
  basePlane: number;
  baseLeft: number;
  baseRight: number;
}
export interface TimbersTreeAssets { manifest: TimbersTreeManifest; image: HTMLImageElement }

export function validateTimbersTree(value: unknown): asserts value is TimbersTreeManifest {
  const data = value as TimbersTreeManifest;
  if (!data || data.version !== 1 || data.image !== 'tree.png' || data.width !== 576 || data.height !== 960
    || data.x !== 32 || data.y !== 140 || data.groundY !== 1080 || data.basePlane !== 940
    || data.baseLeft !== 277 || data.baseRight !== 487 || data.y + data.basePlane !== data.groundY) {
    throw new Error('Invalid Timbers tree metadata');
  }
}

/** Required when declared; each Retry gets fresh requests after a failed attempt. */
export async function loadTimbersTree(base: string, path?: string): Promise<TimbersTreeAssets | undefined> {
  if (path === undefined) return undefined;
  if (path !== 'tree-v1/manifest.json') throw new Error('Invalid Timbers tree declaration');
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error('Could not load Timbers tree metadata');
  const manifest: unknown = await response.json();
  validateTimbersTree(manifest);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not load Timbers tree image'));
    image.src = `${base}tree-v1/${manifest.image}`;
  });
  if (image.naturalWidth !== manifest.width || image.naturalHeight !== manifest.height) throw new Error('Invalid Timbers tree image dimensions');
  return { manifest, image };
}

/** One native connected tree, in the existing background layer with original alpha. */
export function drawTimbersTree(ctx: CanvasRenderingContext2D, tree: TimbersTreeAssets, offset: { x: number; y: number }): void {
  ctx.drawImage(tree.image, tree.manifest.x - offset.x, tree.manifest.y - offset.y);
}
