import { loadCoveMaterials, type CoveMaterialAssets } from './surface-materials';
import { validateScenery, type SceneryAssets, type SceneryManifest } from './scenery';
import { loadCoveTerrain, type CoveTerrainAssets } from './cove-terrain';
import { loadSiteTerrain, type SiteTerrainAssets } from './site-terrain';

export const WORLD_ASSETS = [
  'terrain-flat', 'terrain-left', 'terrain-right', 'terrain-ramp',
  'stone', 'cave', 'tree', 'flowers', 'gem', 'spring', 'slime', 'checkpoint',
  'finish-arch', 'dust', 'hills', 'bush',
] as const;
export type WorldAsset = typeof WORLD_ASSETS[number];
export interface WorldManifest {
  image: string;
  scenery?: string;
  panorama?: string;
  terrainKit?: string;
  surfaceKit?: string;
  siteTerrain?: string;
  cellSize: number;
  assets: Record<WorldAsset, number>;
  anchors?: Partial<Record<WorldAsset, { x: number; y: number }>>;
  terrainTops?: Partial<Record<WorldAsset, { left: number; right: number }>>;
}
export interface WorldAssets { atlas: HTMLImageElement; manifest: WorldManifest; gems: HTMLImageElement; scenery?: SceneryAssets; materials?: HTMLImageElement; backdrops?: HTMLImageElement; panorama?: HTMLImageElement; slimes?: HTMLImageElement; coveTerrain?: CoveTerrainAssets; coveMaterials?: CoveMaterialAssets; siteTerrain?: SiteTerrainAssets }
export type WorldAssetMap = Readonly<Record<string, WorldAssets>>;

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
  if (manifest.surfaceKit !== undefined && directory !== 'cove') throw new Error('Cove materials declared by another world');
  if (manifest.siteTerrain !== undefined && directory !== 'site') throw new Error('Sunset steel declared by another world');
  const atlas = await loadImage(`${base}${manifest.image}`, 'world atlas');
  const [{ materials, backdrops, slimes, gems }, panorama, coveTerrain, coveMaterials, siteTerrain] = await Promise.all([
    loadPresentation(),
    manifest.panorama ? loadImage(`${base}${manifest.panorama}`, 'trail panorama') : undefined,
    loadCoveTerrain(base, manifest.terrainKit),
    loadCoveMaterials(base, manifest.surfaceKit),
    loadSiteTerrain(base, manifest.siteTerrain),
  ]);
  if (!manifest.scenery) return { atlas, manifest, materials, backdrops, panorama, slimes, gems, coveTerrain, coveMaterials, siteTerrain };
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
  return { atlas, manifest, materials, backdrops, panorama, slimes, gems, coveTerrain, coveMaterials, siteTerrain, scenery: { background, foreground, manifest: sceneryManifest } };
}

let presentation: Promise<Pick<WorldAssets, 'materials' | 'backdrops' | 'slimes' | 'gems'>> | undefined;
function loadPresentation(): Promise<Pick<WorldAssets, 'materials' | 'backdrops' | 'slimes' | 'gems'>> {
  const optional = (url: string, label: string): Promise<HTMLImageElement | undefined> =>
    loadImage(url, label).catch(() => undefined);
  return presentation ??= Promise.all([
    optional(`${import.meta.env.BASE_URL}assets/trails/materials.png`, 'terrain materials'),
    optional(`${import.meta.env.BASE_URL}assets/trails/backdrops.webp`, 'trail backdrops'),
    loadImage(`${import.meta.env.BASE_URL}assets/slimes/slimes.png`, 'slime atlas'),
    loadImage(`${import.meta.env.BASE_URL}assets/gems/gems.png`, 'gem atlas'),
  ]).then(([materials, backdrops, slimes, gems]) => ({ materials, backdrops, slimes, gems }))
    .catch((error: unknown) => { presentation = undefined; throw error; });
}

export async function loadWorldAssetMap(directories: readonly string[]): Promise<WorldAssetMap> {
  const unique = [...new Set(directories)];
  const loaded = await Promise.all(unique.map(loadWorldAssets));
  return Object.fromEntries(unique.map((directory, index) => [directory, loaded[index]]));
}
