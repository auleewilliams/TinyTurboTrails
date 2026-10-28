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
  const fixture = new Function(`${injected}\nreturn { drawCoveGround, drawCovePlatform };`)();
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/terrain-kit/manifest.json', import.meta.url), 'utf8'));
  const calls: unknown[][] = [];
  const ctx = { save() {}, restore() {}, translate() {}, scale() {}, transform() {}, drawImage(...args: unknown[]) { calls.push(args); } };
  fixture.drawCoveGround(ctx, { manifest, image: {} }, SANDY_COVE, { x: 940.25, y: 220.5 }, 0, 4200);
  fixture.drawCovePlatform(ctx, { manifest, image: {} }, SANDY_COVE, platformBodyAt(SANDY_COVE.platforms![0], 0), { x: 940.25, y: 220.5 });
  expect(calls.length).toBeGreaterThan(426);
});
