import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
// Current reversible projection only. Immutable historical catalogs/PNG/source oracles remain unchanged.
// Apply this newest Plains layer BEFORE the existing Cove/HUD/water chains.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const approved = {
  "public/assets/plains/manifest.json": {
    "beforeSHA256": "5201702a38da318dbd0394bedf568a71bae43b0f1cbd92e193498ff4cf6d21fd",
    "currentSHA256": "66876da82e6302eaf36f4ecab5c1826446cac77e7909d56ef0a1e5ec0d18bfed",
    "changes": [
      {
        "before": "{\n  \"image\": \"environment.png\",\n  \"scenery\": \"scenery/manifest.json\",\n  \"cellSize\": 48,\n  \"assets\": {\n",
        "after": "{\n  \"image\": \"environment.png\",\n  \"plainsContour\": \"contour-prototype-v1/grass.png\",\n  \"plainsContourSoil\": \"contour-prototype-v1/soil.png\",\n  \"scenery\": \"scenery/manifest.json\",\n  \"cellSize\": 48,\n  \"assets\": {\n"
      }
    ]
  },
  "src/world/level.ts": {
    "beforeSHA256": "626f85c1303f8934624eb2a02eda010db761b847265b07f1e0ba1f6c6b02cf23",
    "currentSHA256": "293415ad81e2451483f02d086fb82182d9566d6016889981eb1ee9f1ebf2b041",
    "changes": [
      {
        "before": "      patrol: { minX: 1720, maxX: 1780, speed: SLIME_SPEED } }),\n    groundedEntity({ id: 'spring-001', kind: 'spring', x: 2760, asset: 'spring', layer: 'world' }),\n    ...[\n      [240, 'flowers'], [470, 'bush'], [800, 'stone'],\n      [1550, 'tree'], [1670, 'tree'], [2100, 'tree'], [2310, 'bush'],\n      [2530, 'flowers'], [3350, 'stone'], [3550, 'bush'], [3980, 'flowers'],\n    ].map(([x, asset], index) => groundedEntity({ id: `deco-${String(index + 1).padStart(3, '0')}`,\n",
        "after": "      patrol: { minX: 1720, maxX: 1780, speed: SLIME_SPEED } }),\n    groundedEntity({ id: 'spring-001', kind: 'spring', x: 2760, asset: 'spring', layer: 'world' }),\n    ...[\n      [150, 'flowers'], [772, 'bush'], [800, 'stone'],\n      [1550, 'tree'], [1670, 'tree'], [2100, 'tree'], [2310, 'bush'],\n      [2342, 'flowers'], [3350, 'stone'], [3550, 'bush'], [3980, 'flowers'],\n    ].map(([x, asset], index) => groundedEntity({ id: `deco-${String(index + 1).padStart(3, '0')}`,\n"
      }
    ]
  },
  "src/world/assets.ts": {
    "beforeSHA256": "9322228ed80f316a8e5a1fbe5707658f38334a54b2911c147b1de113a279499e",
    "currentSHA256": "9cc49f87a657acf74953fc7a537358bfd9a18d339ee87b13f247b366c06eb538",
    "changes": [
      {
        "before": "import { loadCoveMaterials, type CoveMaterialAssets } from './surface-materials';\nimport { validateScenery, type SceneryAssets, type SceneryManifest } from './scenery';\nimport { loadCoveTerrain, type CoveTerrainAssets } from './cove-terrain';\n",
        "after": "import type { PlainsContourAssets } from './plains-contour';\nimport { loadCoveMaterials, type CoveMaterialAssets } from './surface-materials';\nimport { validateScenery, type SceneryAssets, type SceneryManifest } from './scenery';\nimport { loadCoveTerrain, type CoveTerrainAssets } from './cove-terrain';\n"
      },
      {
        "before": "  panorama?: string;\n  terrainKit?: string;\n  surfaceKit?: string;\n  cellSize: number;\n  assets: Record<WorldAsset, number>;\n  anchors?: Partial<Record<WorldAsset, { x: number; y: number }>>;\n  terrainTops?: Partial<Record<WorldAsset, { left: number; right: number }>>;\n}\nexport interface WorldAssets { atlas: HTMLImageElement; manifest: WorldManifest; gems: HTMLImageElement; scenery?: SceneryAssets; materials?: HTMLImageElement; backdrops?: HTMLImageElement; panorama?: HTMLImageElement; slimes?: HTMLImageElement; coveTerrain?: CoveTerrainAssets; coveMaterials?: CoveMaterialAssets }\nexport type WorldAssetMap = Readonly<Record<string, WorldAssets>>;\n\nasync function loadImage(url: string, label: string): Promise<HTMLImageElement> {\n",
        "after": "  panorama?: string;\n  terrainKit?: string;\n  surfaceKit?: string;\n  plainsContour?: string;\n  plainsContourSoil?: string;\n  cellSize: number;\n  assets: Record<WorldAsset, number>;\n  anchors?: Partial<Record<WorldAsset, { x: number; y: number }>>;\n  terrainTops?: Partial<Record<WorldAsset, { left: number; right: number }>>;\n}\nexport interface WorldAssets { atlas: HTMLImageElement; manifest: WorldManifest; gems: HTMLImageElement; scenery?: SceneryAssets; materials?: HTMLImageElement; backdrops?: HTMLImageElement; panorama?: HTMLImageElement; slimes?: HTMLImageElement; coveTerrain?: CoveTerrainAssets; coveMaterials?: CoveMaterialAssets; plainsContour?: PlainsContourAssets }\nexport type WorldAssetMap = Readonly<Record<string, WorldAssets>>;\n\nasync function loadImage(url: string, label: string): Promise<HTMLImageElement> {\n"
      },
      {
        "before": "    if (!Number.isInteger(manifest.assets?.[asset])) throw new Error(`Missing world asset: ${asset}`);\n  }\n  if (manifest.surfaceKit !== undefined && directory !== 'cove') throw new Error('Cove materials declared by another world');\n  const atlas = await loadImage(`${base}${manifest.image}`, 'world atlas');\n  const [{ materials, backdrops, slimes, gems }, panorama, coveTerrain, coveMaterials] = await Promise.all([\n    loadPresentation(),\n",
        "after": "    if (!Number.isInteger(manifest.assets?.[asset])) throw new Error(`Missing world asset: ${asset}`);\n  }\n  if (manifest.surfaceKit !== undefined && directory !== 'cove') throw new Error('Cove materials declared by another world');\n  if (manifest.plainsContour !== undefined && (directory !== 'plains' || manifest.plainsContour !== 'contour-prototype-v1/grass.png')) throw new Error('Invalid Plains contour declaration');\n  if (manifest.plainsContourSoil !== undefined && (directory !== 'plains' || !manifest.plainsContour || manifest.plainsContourSoil !== 'contour-prototype-v1/soil.png')) throw new Error('Invalid Plains contour soil declaration');\n  const plainsContourImage = manifest.plainsContour ? await loadImage(`${base}${manifest.plainsContour}`, 'Plains contour grass') : undefined;\n  if (plainsContourImage && (plainsContourImage.naturalWidth !== 80 || plainsContourImage.naturalHeight !== 16)) throw new Error('Invalid Plains contour image dimensions');\n  const soil = manifest.plainsContourSoil ? await loadImage(`${base}${manifest.plainsContourSoil}`, 'Plains contour soil') : undefined;\n  if (soil && (soil.naturalWidth !== 64 || soil.naturalHeight !== 64)) throw new Error('Invalid Plains contour soil image dimensions');\n  const plainsContour = plainsContourImage ? { image: plainsContourImage, soil } : undefined;\n  const atlas = await loadImage(`${base}${manifest.image}`, 'world atlas');\n  const [{ materials, backdrops, slimes, gems }, panorama, coveTerrain, coveMaterials] = await Promise.all([\n    loadPresentation(),\n"
      },
      {
        "before": "    loadCoveTerrain(base, manifest.terrainKit),\n    loadCoveMaterials(base, manifest.surfaceKit),\n  ]);\n  if (!manifest.scenery) return { atlas, manifest, materials, backdrops, panorama, slimes, gems, coveTerrain, coveMaterials };\n  const sceneryUrl = `${base}${manifest.scenery}`;\n  const sceneryResponse = await fetch(sceneryUrl);\n  if (!sceneryResponse.ok) throw new Error('Could not load scenery metadata');\n",
        "after": "    loadCoveTerrain(base, manifest.terrainKit),\n    loadCoveMaterials(base, manifest.surfaceKit),\n  ]);\n  if (!manifest.scenery) return { atlas, manifest, materials, backdrops, panorama, slimes, gems, coveTerrain, coveMaterials, plainsContour };\n  const sceneryUrl = `${base}${manifest.scenery}`;\n  const sceneryResponse = await fetch(sceneryUrl);\n  if (!sceneryResponse.ok) throw new Error('Could not load scenery metadata');\n"
      },
      {
        "before": "    loadImage(`${sceneryBase}${sceneryManifest.background.image}`, 'scenery background'),\n    loadImage(`${sceneryBase}${sceneryManifest.foreground.image}`, 'scenery foreground'),\n  ]);\n  return { atlas, manifest, materials, backdrops, panorama, slimes, gems, coveTerrain, coveMaterials, scenery: { background, foreground, manifest: sceneryManifest } };\n}\n\nlet presentation: Promise<Pick<WorldAssets, 'materials' | 'backdrops' | 'slimes' | 'gems'>> | undefined;\n",
        "after": "    loadImage(`${sceneryBase}${sceneryManifest.background.image}`, 'scenery background'),\n    loadImage(`${sceneryBase}${sceneryManifest.foreground.image}`, 'scenery foreground'),\n  ]);\n  return { atlas, manifest, materials, backdrops, panorama, slimes, gems, coveTerrain, coveMaterials, plainsContour, scenery: { background, foreground, manifest: sceneryManifest } };\n}\n\nlet presentation: Promise<Pick<WorldAssets, 'materials' | 'backdrops' | 'slimes' | 'gems'>> | undefined;\n"
      }
    ]
  },
  "src/world/renderer.ts": {
    "beforeSHA256": "c59b777d2462036f4c500a7e77cd5b76ba0cb4877c69e8b3dd9d79751cc19417",
    "currentSHA256": "27980da2c82ccec163b8c47b03b424f6f514d7b882470d9f0cc909362735df13",
    "changes": [
      {
        "before": "import { drawTerrainMaterial, drawTerrainEdge, drawTrailBackdrop } from './trail-presentation';\nimport { drawAmbientWeather } from './ambient-weather';\nimport type { Camera } from './camera';\n",
        "after": "import { drawPlainsContourGround, plainsContourRange } from './plains-contour';\nimport { drawTerrainMaterial, drawTerrainEdge, drawTrailBackdrop } from './trail-presentation';\nimport { drawAmbientWeather } from './ambient-weather';\nimport type { Camera } from './camera';\n"
      },
      {
        "before": "    ctx.restore();\n  }\n  if (level.theme.material === 'wood') drawTerrainTiles(ctx, assets, level, offset);\n  if (!(level.id === 'cove' && assets.coveTerrain)) drawTerrainEdge(ctx, level, offset);\n  drawSurfaceMaterials(ctx, level, offset, assets.coveMaterials, runSeconds, reducedMotion);\n  for (const surface of level.surfaces) drawSurfaceGrip(ctx, surface, offset);\n  drawPlatforms(ctx, level, offset, platforms, assets);\n",
        "after": "    ctx.restore();\n  }\n  if (level.theme.material === 'wood') drawTerrainTiles(ctx, assets, level, offset);\n  if (!(level.id === 'cove' && assets.coveTerrain)) drawTerrainEdge(ctx, level, offset, assets.plainsContour ? plainsContourRange(level) : undefined);\n  drawPlainsContourGround(ctx, assets, level, offset);\n  drawSurfaceMaterials(ctx, level, offset, assets.coveMaterials, runSeconds, reducedMotion);\n  for (const surface of level.surfaces) drawSurfaceGrip(ctx, surface, offset);\n  drawPlatforms(ctx, level, offset, platforms, assets);\n"
      }
    ]
  },
  "src/world/trail-presentation.ts": {
    "beforeSHA256": "5d98d1b7a4caf27e12830e57a86de771e326c2649468d8569927de32191ca342",
    "currentSHA256": "72ed99b594127c061fb0fc6e50f7416143df40332f79a29330256f46785734fc",
    "changes": [
      {
        "before": "  }\n}\n\nexport function drawTerrainEdge(ctx: CanvasRenderingContext2D, level: LevelData, offset: { x: number; y: number }): void {\n  for (const surface of level.surfaces) {\n    if (surface.x2 < offset.x || surface.x1 > offset.x + 426) continue;\n    const material = level.theme.materialSections?.find(s => surface.x1 >= s.from && surface.x1 < s.to)?.material ?? level.theme.material;\n    const rock = material === 'stone';\n    const edge = rock ? '#9aab96' : material === 'frost' ? '#eff8ff' : level.theme.edge;\n    const steep = Math.abs((surface.y2 - surface.y1) / (surface.x2 - surface.x1)) > 1;\n    ctx.strokeStyle = rock ? '#736653' : level.theme.material === 'wood' ? '#523822' : '#3d352e';\n    ctx.lineWidth = 7;\n    ctx.beginPath(); ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y + 4);\n    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y + 4); ctx.stroke();\n    ctx.strokeStyle = edge; ctx.lineWidth = material === 'frost' ? 5 : 3;\n    ctx.beginPath(); ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y);\n    ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y); ctx.stroke();\n    if (steep) continue;\n    const from = Math.ceil(Math.max(surface.x1, offset.x) / 7) * 7;\n    for (let x = from; x < Math.min(surface.x2, offset.x + 426); x += 7) {\n      const y = surface.y1 + (surface.y2 - surface.y1) * (x - surface.x1) / (surface.x2 - surface.x1);\n      ctx.fillStyle = edge;\n      const irregular = Math.abs((x * 17) ^ (x >> 3));\n      ctx.fillRect(x - offset.x, y - offset.y + 1, 2 + irregular % 4, 1 + irregular % 3);\n      if (level.theme.material === 'soil' && !rock && x % 5 === 0) {\n        ctx.fillStyle = '#64422c'; ctx.fillRect(x - offset.x + 1, y - offset.y + 7, 1, 5);\n      }\n    }\n  }\n}\n\nexport function drawTrailBackdrop(ctx: CanvasRenderingContext2D, assets: WorldAssets, level: LevelData,\n",
        "after": "  }\n}\n\nexport function drawTerrainEdge(ctx: CanvasRenderingContext2D, level: LevelData, offset: { x: number; y: number },\n  replaced?: { from: number; to: number }): void {\n  if (replaced) {\n    ctx.save(); ctx.beginPath();\n    ctx.rect(-10000, -10000, replaced.from - offset.x + 10000, 20000);\n    ctx.rect(replaced.to - offset.x, -10000, 10000, 20000);\n    ctx.clip();\n  }\n  try {\n    for (const surface of level.surfaces) {\n      if (surface.x2 < offset.x || surface.x1 > offset.x + 426) continue;\n      const material = level.theme.materialSections?.find(s => surface.x1 >= s.from && surface.x1 < s.to)?.material ?? level.theme.material;\n      const rock = material === 'stone';\n      const edge = rock ? '#9aab96' : material === 'frost' ? '#eff8ff' : level.theme.edge;\n      const steep = Math.abs((surface.y2 - surface.y1) / (surface.x2 - surface.x1)) > 1;\n      ctx.strokeStyle = rock ? '#736653' : level.theme.material === 'wood' ? '#523822' : '#3d352e';\n      ctx.lineWidth = 7;\n      ctx.beginPath(); ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y + 4);\n      ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y + 4); ctx.stroke();\n      ctx.strokeStyle = edge; ctx.lineWidth = material === 'frost' ? 5 : 3;\n      ctx.beginPath(); ctx.moveTo(surface.x1 - offset.x, surface.y1 - offset.y);\n      ctx.lineTo(surface.x2 - offset.x, surface.y2 - offset.y); ctx.stroke();\n      if (steep) continue;\n      const from = Math.ceil(Math.max(surface.x1, offset.x) / 7) * 7;\n      for (let x = from; x < Math.min(surface.x2, offset.x + 426); x += 7) {\n        const y = surface.y1 + (surface.y2 - surface.y1) * (x - surface.x1) / (surface.x2 - surface.x1);\n        ctx.fillStyle = edge;\n        const irregular = Math.abs((x * 17) ^ (x >> 3));\n        ctx.fillRect(x - offset.x, y - offset.y + 1, 2 + irregular % 4, 1 + irregular % 3);\n        if (level.theme.material === 'soil' && !rock && x % 5 === 0) {\n          ctx.fillStyle = '#64422c'; ctx.fillRect(x - offset.x + 1, y - offset.y + 7, 1, 5);\n        }\n      }\n    }\n  } finally { if (replaced) ctx.restore(); }\n}\n\nexport function drawTrailBackdrop(ctx: CanvasRenderingContext2D, assets: WorldAssets, level: LevelData,\n"
      }
    ]
  }
};

export function beforePlainsContour(path, bytes) {
  const entry = approved[path];
  if (!entry) return bytes; // The caller's historical oracle still checks every other byte.
  assert.equal(hash(bytes), entry.currentSHA256, `${path}: ONLY exact approved Plains contour linkage/bush/two-flower delta`);
  let text = bytes.toString('utf8');
  for (const change of [...entry.changes].reverse()) {
    assert.equal(text.split(change.after).length, 2, `${path}: unique approved current literal`);
    text = text.replace(change.after, change.before);
  }
  const baseline = Buffer.from(text);
  assert.equal(hash(baseline), entry.beforeSHA256, `${path}: complete reversible Plains projection`);
  return baseline;
}
