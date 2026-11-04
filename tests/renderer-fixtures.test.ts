import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { transformSync } from 'rolldown/utils';
import { MAX_HEALTH } from '../src/game/interactions';
import { surfaceY } from '../src/game/movement';
import { PLAINS_LEVEL } from '../src/world/level';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { platformBodyAt } from '../src/game/platforms';
import { SUNSET_SITE } from '../src/world/sunset-site';
import { QUARRY_RUN } from '../src/world/quarry-run';

// Exercise each complete renderer module list with the real import stripping.
// Missing real production dependencies must remain visible to their guards.
const source = readFileSync(new URL('./browser.spec.ts', import.meta.url), 'utf8');
for (const [file, title] of [
  ['browser.spec.ts', 'compact HUD renderer fixture:'],
  ['browser.spec.ts', 'landmark labels: renderer fixture'],
  ['hud-owner-layout.spec.ts', 'owner HUD order real-font fixture:'],
]) {
  it(`${title} includes the real terrain helper dependency graph`, async () => {
    const fixtureSource = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    const start = fixtureSource.indexOf('test(`' + title);
    expect(start).toBeGreaterThanOrEqual(0);
    const section = fixtureSource.slice(start);
    const list = section.match(/const names = \[([\s\S]*?)\];/)![1];
    const names = [...list.matchAll(/'([^']+)'/g)].map(match => match[1]);
    const modules = names.map(name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8'));
    const imports = [...new Set(modules.flatMap(text => [...text.matchAll(/^import (?!type )\{([^}]*)\} from .*;$/gm)]
      .flatMap(([, names]) => names.split(',').map(name => name.trim()).filter(name => name && !name.startsWith('type ')))))];
    const code = modules.map((text, i) => transformSync(names[i], text.replace(/^import .*;\n/gm, '')
      .replace(/\bexport /g, '').replaceAll('import.meta.env.BASE_URL', JSON.stringify('./')), {}).code).join('\n');
    // Execute the fixture's actual asset initialization, not a copied loader choice.
    const initialize = section.match(/const assets = [^;]+;/)![0];
    const fetchAsset = async (url: string) => ({ ok: true, json: async () => JSON.parse(readFileSync(new URL('../public/' + url.replace(/^\.\//, '').replace(/^\//, ''), import.meta.url), 'utf8')) });
    class FixtureImage {
      naturalWidth = 1; naturalHeight = 1; onload = () => {}; onerror = () => {};
      set src(url: string) {
        try {
          const bytes = readFileSync(new URL('../public/' + url.replace(/^\.\//, '').replace(/^\//, ''), import.meta.url));
          if (bytes.toString('ascii', 1, 4) === 'PNG') { this.naturalWidth = bytes.readUInt32BE(16); this.naturalHeight = bytes.readUInt32BE(20); }
          queueMicrotask(() => this.onload());
        } catch { queueMicrotask(() => this.onerror()); }
      }
    }
    const fixture = new Function('MAX_HEALTH', 'fetch', 'Image', 'document', `${code}\nreturn { initialize: async level => { ${initialize} return assets; }, loadWorldAssets, loadQuarryFloor, loadQuarryRollout, loadQuarryPreviewPieces, loadQuarryShelves, drawPlatforms, drawWorld, missing: [${imports.map(name => `typeof ${name} === 'undefined' && ${JSON.stringify(name)}`).join(',')}].filter(Boolean), height: typeof surfaceY === 'undefined' ? undefined : surfaceY, camera: typeof Camera === 'undefined' ? undefined : Camera };`)(MAX_HEALTH, fetchAsset, FixtureImage, { createElement: () => ({}) });
    expect(fixture.missing).toEqual([]);
    expect(names).toContain('game/movement.ts');
    expect(names).toContain('game/platforms.ts');
    expect(names).toContain('world/camera.ts');
    expect(names).toContain('world/cove-terrain.ts');
    expect(names).toContain('world/site-terrain.ts');
    expect(names.indexOf('world/surface-materials.ts')).toBeLessThan(names.indexOf('world/assets.ts'));
    expect(imports).toContain('loadCoveMaterials');
    expect(imports).toEqual(expect.arrayContaining(['loadSiteTerrain', 'drawSiteGround', 'drawSitePlatform']));
    expect(imports).toEqual(expect.arrayContaining(['loadQuarryFloor', 'drawQuarryFloor', 'loadQuarryShelves', 'drawQuarryShelf', 'loadQuarryPreviewPieces', 'drawQuarryPreviewPiece', 'loadQuarryRollout', 'drawQuarryRollout']));
    const assets = await fixture.initialize(QUARRY_RUN);
    expect(assets.quarryFloor).toBeDefined(); expect(assets.quarryShelves).toBeDefined(); expect(assets.quarryPreview).toBeDefined(); expect(assets.quarryRollout).toBeDefined();
    const calls: unknown[][] = [];
    const ctx = new Proxy({ drawImage: (...args: unknown[]) => calls.push(args) }, { get: (target, name) => name in target ? target[name as keyof typeof target] : () => {}, set: () => true });
    // Full production draw entry with real authored bodies must use the loaded kits.
    fixture.drawWorld(ctx, assets, QUARRY_RUN, { position: { x: .25, y: .5 } }, undefined, undefined, QUARRY_RUN.platforms!.map(p => platformBodyAt(p, 0)), 0, true);
    expect(calls.some(call => call[0] === assets.quarryRollout.images['quarry-rim'])).toBe(true);
    if (title === 'compact HUD renderer fixture:') {
      for (const heading of ['moving platform slabs and their telegraphed paths', 'finish artwork pixels meet terrain']) {
        const start = source.indexOf("test('" + heading), end = source.indexOf('\n});', start);
        const actual = source.slice(start, end);
        const kitInitialization = actual.match(/const quarry = level.id === 'quarry' \? \{[\s\S]*?\} : \{\};/)![0];
        const assetInitialization = actual.match(/const assets = [^;]+;/)![0];
        const atlasOnly = await fixture.loadWorldAssets(QUARRY_RUN.atlas);
        const initialize = new Function('level', 'base', 'window', transformSync('fixture.ts', `const initialize = async () => { const { atlas, manifest, gems, backdrops, materials, panorama, coveTerrain, coveMaterials, siteTerrain, timbersTerrain, timbersTree } = base; ${kitInitialization} ${assetInitialization} return assets; };`, {}).code + '\nreturn initialize();');
        const loaded = await initialize(QUARRY_RUN, atlasOnly, fixture);
        expect(loaded.quarryFloor).toBeDefined(); expect(loaded.quarryShelves).toBeDefined(); expect(loaded.quarryPreview).toBeDefined(); expect(loaded.quarryRollout).toBeDefined();
        calls.length = 0;
        fixture.drawWorld(ctx, loaded, QUARRY_RUN, { position: { x: .25, y: .5 } }, undefined, undefined, QUARRY_RUN.platforms!.map(p => platformBodyAt(p, 0)), 0, true);
        expect(calls.some(call => call[0] === loaded.quarryRollout.images['quarry-rim'])).toBe(true);
      }
    }
    const siteAssets = await fixture.initialize(SUNSET_SITE);
    expect(siteAssets.siteTerrain).toBeDefined();
    calls.length = 0;
    fixture.drawWorld(ctx, siteAssets, SUNSET_SITE, { position: { x: .25, y: .5 } }, undefined, undefined, SUNSET_SITE.platforms!.map(p => platformBodyAt(p, 0)), 0, true);
    expect(calls.some(call => call[0] === siteAssets.siteTerrain.ground)).toBe(true);
    expect(calls.some(call => call[0] === siteAssets.siteTerrain.ferry)).toBe(true);
    expect(typeof fixture.camera).toBe('function');
    expect(code).toContain('function drawTimberTrunk');
    expect(code).toContain('function drawSiteFrame');
    const bounds = { width: 426, height: 240, worldWidth: 820, worldHeight: 1080 };
    const horizontal = new fixture.camera(bounds), vertical = new fixture.camera({ ...bounds, vertical: true });
    horizontal.update(420, 386); vertical.update(420, 386);
    expect(horizontal.position.y).toBe(220);
    expect(vertical.position.y).toBe(282);
    for (const x of [60, 370, 1065, 1930, 2760, 4230]) expect(fixture.height(PLAINS_LEVEL, x)).toBe(surfaceY(PLAINS_LEVEL, x));
  });
}

it('builder-kit fixture includes the real terrain dependency and keeps its runtime guard', () => {
  const section = source.slice(source.indexOf("test('builder-kit visual fixture"), source.indexOf("test('compact HUD renderer fixture:"));
  expect(section).toContain("'game/movement.ts': source('game/movement.ts')");
  expect(section).toContain("declarations('movement.ts', modules['game/movement.ts'])");
  expect(section).toContain("'surfaceY'");
  expect(section).toContain('spellingFixtureMissing');
  expect(section).toContain('runtimeImports.map');
});

it('function-string fixtures carry and execute the actual Cove and Sunset helper dependency graphs', () => {
  const list = source.match(/const RENDERER_SOURCE = \[([^\]]+)\]\.map/)![1].split(',').map(name => name.trim());
  const names = ['world/quarry-floor.ts', 'world/quarry-rollout.ts', 'world/quarry-preview-pieces.ts', 'world/quarry-shelves.ts', 'world/cove-terrain.ts', 'world/site-terrain.ts', 'world/plains-contour.ts', 'world/timbers-terrain.ts', 'world/timbers-tree.ts', 'world/trail-presentation.ts', 'world/ambient-weather.ts', 'world/surface-materials.ts', 'world/renderer.ts'];
  const code = names.map(name => transformSync(name, readFileSync(new URL('../src/' + name, import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code).join('\n');
  const helpers = new Function(`${code}\nreturn { ${list.join(',')}, SITE_FIXED_SUPPORT_IDS };`)() as Record<string, unknown>;
  const declaration = source.split('\n').find(line => line.startsWith('const RENDERER_SOURCE ='))!;
  const injected = new Function(...list, 'SITE_FIXED_SUPPORT_IDS', `${declaration}\nreturn RENDERER_SOURCE;`)(
    ...list.map(name => helpers[name]), helpers.SITE_FIXED_SUPPORT_IDS);
  const fixture = new Function(`${injected}\nreturn { drawCoveGround, drawCovePlatform, validateCoveMaterials, drawSurfaceMaterials, validateSiteTerrain, drawSiteGround, drawSitePlatform };`)();
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/terrain-kit/manifest.json', import.meta.url), 'utf8'));
  const calls: unknown[][] = [];
  const ctx = { save() {}, restore() {}, translate() {}, scale() {}, transform() {}, drawImage(...args: unknown[]) { calls.push(args); } };
  fixture.drawCoveGround(ctx, { manifest, image: {}, ground: {} }, SANDY_COVE, { x: 940.25, y: 220.5 }, 0, 4200);
  fixture.drawCovePlatform(ctx, { manifest, image: {}, ground: {} }, SANDY_COVE, platformBodyAt(SANDY_COVE.platforms![0], 0), { x: 940.25, y: 220.5 });
  expect(calls).toHaveLength(2);
  const bay1 = {};
  const body = platformBodyAt(SANDY_COVE.platforms!.find(p => p.id === 'cove-bay-ledge-1')!, 0);
  fixture.drawCovePlatform(ctx, { manifest, image: {}, ground: {}, bay1 }, SANDY_COVE, body, { x: 0, y: 0 });
  expect(calls.at(-1)).toEqual([bay1, 0, 0, 140, 30, 2960, 272, 140, 30]);
  expect(calls).toHaveLength(3);
  const bay2 = {};
  fixture.drawCovePlatform(ctx, { manifest, image: {}, ground: {}, bay2 }, SANDY_COVE, platformBodyAt(SANDY_COVE.platforms!.find(p => p.id === 'cove-bay-ledge-2')!, 0), {x:.25,y:.5});
  expect(calls.at(-1)).toEqual([bay2,0,0,160,35,3139.75,259.5,160,35]);
  expect(calls).toHaveLength(4);
  const hollowB = {}, pool3B = {}, bay3 = {}, pool2B = {}, pool1B = {}, image = {};
  const current = { manifest, image, ground: {}, bay1, bay2, hollowB, pool3B, bay3, pool2B, pool1B };
  for (const platform of SANDY_COVE.platforms!) {
    const b = platformBodyAt(platform, 0);
    const before = calls.length;
    fixture.drawCovePlatform(ctx, current, SANDY_COVE, b, {x:.25,y:.5});
    const expected = b.id === 'cove-hollow-shelf' ? hollowB : b.id === 'cove-pool-stone-3' ? pool3B : b.id === 'cove-bay-ledge-1' ? bay1 : b.id === 'cove-bay-ledge-2' ? bay2 : b.id === 'cove-bay-ledge-3' ? bay3 : b.id === 'cove-pool-stone-2' ? pool2B : b.id === 'cove-pool-stone-1' ? pool1B : image;
    expect(calls).toHaveLength(before + 1);
    expect(calls.at(-1)![0]).toBe(expected);
    if (expected === hollowB || expected === pool3B) expect(()=>fixture.drawCovePlatform(ctx,current,SANDY_COVE,{...b,width:b.width+1},{x:0,y:0})).toThrow(/width/);
    expect(expected).not.toBe(image);
    if(expected===pool1B){expect(calls.at(-1)!.slice(1)).toEqual([0,0,100,22,b.x-.25,b.y-.5,100,22]);expect(()=>fixture.drawCovePlatform(ctx,current,SANDY_COVE,{...b,width:99},{x:0,y:0})).toThrow(/width/);}
    if(expected===pool2B){expect(calls.at(-1)!.slice(1)).toEqual([0,0,90,18,b.x-.25,b.y-.5,90,18]);expect(()=>fixture.drawCovePlatform(ctx,current,SANDY_COVE,{...b,width:91},{x:0,y:0})).toThrow(/width/);}
    if(expected===bay3)expect(calls.at(-1)!.slice(1)).toEqual([0,0,180,30,b.x-.25,b.y-.5,180,30]);
    if (expected === hollowB || expected === pool3B) expect(calls.at(-1)!.slice(1)).toEqual([0,0,b.width,expected===hollowB?30:18,b.x-.25,b.y-.5,b.width,expected===hollowB?30:18]);
  }
  const materialManifest = JSON.parse(readFileSync(new URL('../public/assets/cove/materials/manifest.json', import.meta.url), 'utf8'));
  fixture.validateCoveMaterials(materialManifest);
  const materialCalls: unknown[][] = [];
  const materialImage = {};
  const materialCtx = { globalAlpha: 1, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, drawImage(...args: unknown[]) { materialCalls.push(args); } };
  fixture.drawSurfaceMaterials(materialCtx, SANDY_COVE, { x: 1600.5, y: 220.5 }, { image: materialImage, manifest: materialManifest }, 1, false);
  expect(materialCalls).toHaveLength(2);
  expect(materialCalls.every(call => call[0] === materialImage)).toBe(true);
  expect(materialCalls[0].slice(3)).toEqual([200, 8, 59.5, 123.5, 200, 8]);
  expect(calls.every(call => call[3] === call[7] && call[4] === call[8])).toBe(true);
  const siteManifest = JSON.parse(readFileSync(new URL('../public/assets/site/steel-v1/manifest.json', import.meta.url), 'utf8'));
  fixture.validateSiteTerrain(siteManifest);
  const runs = new Map();
  for (const run of siteManifest.runs) for (const id of run.supportIds) runs.set(id, { run, image: {} });
  const site = { manifest: siteManifest, runs, ferry: {}, ground: {} };
  calls.length = 0;
  fixture.drawSiteGround(ctx, site, { x: .25, y: .5 });
  for (const platform of SUNSET_SITE.platforms!) fixture.drawSitePlatform(ctx, site, SUNSET_SITE, platformBodyAt(platform, 0), { x: .25, y: .5 });
  expect(calls).toHaveLength(33);
  expect(calls[0]).toEqual([site.ground, -.25, -.5]);
  expect(calls.some(call => call[0] === site.ferry)).toBe(true);
  // Real serialized callers must expose absent production dependencies, including
  // Site's constant coverage set and its per-kit layout cache.
  for (const remove of [
    'const SITE_FIXED_SUPPORT_IDS = ' + JSON.stringify(helpers.SITE_FIXED_SUPPORT_IDS) + ';',
    'const checkedLayouts = new WeakMap();',
    String(helpers.validateSiteLayout),
  ]) {
    const broken = injected.replace(remove, '');
    expect(broken).not.toBe(injected);
    const missing = new Function(`${broken}\nreturn { validateSiteTerrain, drawSitePlatform };`)();
    expect(() => {
      missing.validateSiteTerrain(siteManifest);
      missing.drawSitePlatform(ctx, site, SUNSET_SITE, platformBodyAt(SUNSET_SITE.platforms![0], 0), { x: 0, y: 0 });
    }).toThrow(ReferenceError);
  }

});
