export const WORLD_ASSETS = [
  'terrain-flat', 'terrain-left', 'terrain-right', 'terrain-ramp',
  'stone', 'cave', 'tree', 'flowers', 'gem', 'spring', 'slime', 'checkpoint',
  'finish-arch', 'dust', 'hills', 'bush',
] as const;
export type WorldAsset = typeof WORLD_ASSETS[number];
export interface WorldManifest {
  image: string;
  cellSize: number;
  assets: Record<WorldAsset, number>;
  anchors?: Partial<Record<WorldAsset, { x: number; y: number }>>;
}
export interface WorldAssets { atlas: HTMLImageElement; manifest: WorldManifest }

export async function loadWorldAssets(directory = 'plains'): Promise<WorldAssets> {
  const base = `${import.meta.env.BASE_URL}assets/${directory}/`;
  const response = await fetch(`${base}manifest.json`);
  if (!response.ok) throw new Error('Could not load world asset metadata');
  const manifest = await response.json() as WorldManifest;
  for (const asset of WORLD_ASSETS) {
    if (!Number.isInteger(manifest.assets?.[asset])) throw new Error(`Missing world asset: ${asset}`);
  }
  const atlas = new Image();
  await new Promise<void>((resolve, reject) => { atlas.onload = () => resolve(); atlas.onerror = () => reject(new Error('Could not load world atlas')); atlas.src = `${base}${manifest.image}`; });
  return { atlas, manifest };
}
