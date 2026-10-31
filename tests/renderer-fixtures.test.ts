import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { transformSync } from 'rolldown/utils';
import { MAX_HEALTH } from '../src/game/interactions';
import { surfaceY } from '../src/game/movement';
import { PLAINS_LEVEL } from '../src/world/level';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { platformBodyAt } from '../src/game/platforms';

// Exercise the same module lists and import stripping as the two browser fixtures.
// Missing real production dependencies must remain visible to their guards.
const source = readFileSync(new URL('./browser.spec.ts', import.meta.url), 'utf8');
for (const title of ['compact HUD renderer fixture:', 'landmark labels: renderer fixture']) {
  it(`${title} includes the real terrain helper dependency graph`, () => {
    const section = source.slice(source.indexOf('test(`' + title));
    const list = section.match(/const names = \[([\s\S]*?)\];/)![1];
    const names = [...list.matchAll(/'([^']+)'/g)].map(match => match[1]);
    const modules = names.map(name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8'));
    const imports = [...new Set(modules.flatMap(text => [...text.matchAll(/^import (?!type )\{([^}]*)\} from .*;$/gm)]
      .flatMap(([, names]) => names.split(',').map(name => name.trim()).filter(name => name && !name.startsWith('type ')))))];
    const code = modules.map((text, i) => transformSync(names[i], text.replace(/^import .*;\n/gm, '')
      .replace(/\bexport /g, '').replaceAll('import.meta.env.BASE_URL', JSON.stringify('./')), {}).code).join('\n');
    const fixture = new Function('MAX_HEALTH', `${code}\nreturn { missing: [${imports.map(name => `typeof ${name} === 'undefined' && ${JSON.stringify(name)}`).join(',')}].filter(Boolean), height: typeof surfaceY === 'undefined' ? undefined : surfaceY, camera: typeof Camera === 'undefined' ? undefined : Camera };`)(MAX_HEALTH);
    expect(fixture.missing).toEqual([]);
    expect(names).toContain('game/movement.ts');
    expect(names).toContain('game/platforms.ts');
    expect(names).toContain('world/camera.ts');
    expect(names).toContain('world/cove-terrain.ts');
    expect(names.indexOf('world/surface-materials.ts')).toBeLessThan(names.indexOf('world/assets.ts'));
    expect(imports).toContain('loadCoveMaterials');
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

it('function-string fixtures carry and execute the actual Cove helper dependency graph', () => {
  const list = source.match(/const RENDERER_SOURCE = \[([^\]]+)\]\.map/)![1].split(',').map(name => name.trim());
  const names = ['world/cove-terrain.ts', 'world/trail-presentation.ts', 'world/ambient-weather.ts', 'world/surface-materials.ts', 'world/renderer.ts'];
  const code = names.map(name => transformSync(name, readFileSync(new URL('../src/' + name, import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code).join('\n');
  const helpers = new Function(`${code}\nreturn { ${list.join(',')} };`)() as Record<string, (...args: unknown[]) => unknown>;
  const injected = list.map(name => helpers[name].toString()).join('\n');
  const fixture = new Function(`${injected}\nreturn { drawCoveGround, drawCovePlatform, validateCoveMaterials, drawSurfaceMaterials };`)();
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
    if(expected===pool1B){expect(calls.at(-1)!.slice(1)).toEqual([0,0,100,5,b.x-.25,b.y-.5,100,5]);expect(()=>fixture.drawCovePlatform(ctx,current,SANDY_COVE,{...b,width:99},{x:0,y:0})).toThrow(/width/);}
    if(expected===pool2B){expect(calls.at(-1)!.slice(1)).toEqual([0,0,90,6,b.x-.25,b.y-.5,90,6]);expect(()=>fixture.drawCovePlatform(ctx,current,SANDY_COVE,{...b,width:91},{x:0,y:0})).toThrow(/width/);}
    if(expected===bay3)expect(calls.at(-1)!.slice(1)).toEqual([0,0,180,30,b.x-.25,b.y-.5,180,30]);
    if (expected === hollowB || expected === pool3B) expect(calls.at(-1)!.slice(1)).toEqual([0,0,b.width,expected===hollowB?6:18,b.x-.25,b.y-.5,b.width,expected===hollowB?6:18]);
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
});
