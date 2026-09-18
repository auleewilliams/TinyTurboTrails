import { validateScenery, type SceneryAssets, type SceneryManifest } from './scenery';

export const WORLD_ASSETS = [
  'terrain-flat', 'terrain-left', 'terrain-right', 'terrain-ramp',
  'stone', 'cave', 'tree', 'flowers', 'gem', 'spring', 'slime', 'checkpoint',
  'finish-arch', 'dust', 'hills', 'bush',
] as const;
export type WorldAsset = typeof WORLD_ASSETS[number];
export interface WorldManifest {
  image: string;
  scenery?: string;
  cellSize: number;
  assets: Record<WorldAsset, number>;
  anchors?: Partial<Record<WorldAsset, { x: number; y: number }>>;
}
export interface WorldAssets { atlas: HTMLImageElement; manifest: WorldManifest; scenery?: SceneryAssets }

async function loadImage(url: string, label: string): Promise<HTMLImageElement> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Could not load ${label}`));
    image.src = url;
  });
  return image;
}

export async function loadWorldAssets(directory = 'plains'): Promise<WorldAssets> {
  const base = `${import.meta.env.BASE_URL}assets/${directory}/`;
  const response = await fetch(`${base}manifest.json`);
  if (!response.ok) throw new Error('Could not load world asset metadata');
  const manifest = await response.json() as WorldManifest;
  for (const asset of WORLD_ASSETS) {
    if (!Number.isInteger(manifest.assets?.[asset])) throw new Error(`Missing world asset: ${asset}`);
  }
  const atlas = await loadImage(`${base}${manifest.image}`, 'world atlas');
  if (!manifest.scenery) return { atlas, manifest };
  const sceneryUrl = `${base}${manifest.scenery}`;
  const sceneryResponse = await fetch(sceneryUrl);
  if (!sceneryResponse.ok) throw new Error('Could not load scenery metadata');
  const sceneryManifest = await sceneryResponse.json() as SceneryManifest;
  validateScenery(sceneryManifest);
  const sceneryBase = sceneryUrl.slice(0, sceneryUrl.lastIndexOf('/') + 1);
  const [background, foreground] = await Promise.all([
    loadImage(`${sceneryBase}${sceneryManifest.background.image}`, 'scenery background'),
    loadImage(`${sceneryBase}${sceneryManifest.foreground.image}`, 'scenery foreground'),
  ]);
  return { atlas, manifest, scenery: { background, foreground, manifest: sceneryManifest } };
}
