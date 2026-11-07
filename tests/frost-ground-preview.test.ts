import { expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { AdventureScene } from '../src/game/adventure-scene';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import { LEVELS } from '../src/world/levels';

afterEach(() => vi.unstubAllGlobals());
it('actual AdventureScene preview refreshes on same-size source object, URL, geometry or recipe changes and keeps every fixed body', () => {
  const drawings: unknown[][] = [];
  const ctx = new Proxy({ drawImage: (...a: unknown[]) => drawings.push(a) }, { get: (t, n) => n in t ? t[n as keyof typeof t] : () => {}, set: () => true });
  const made: object[] = [];
  vi.stubGlobal('document', { createElement: () => { const c = { getContext: () => ctx }; made.push(c); return c; } });
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/frost/ground-ice-v1/manifest.json', import.meta.url), 'utf8'));
  const terrain = { src: 'Terrain1', naturalWidth: 440, naturalHeight: 440 }, ice = { src: 'Ice1', naturalWidth: 8, naturalHeight: 8 };
  const ledges = JSON.parse(readFileSync(new URL('../public/assets/frost/ledge-trial-v1/manifest.json', import.meta.url), 'utf8'));
  const platforms = Object.fromEntries(Object.keys(ledges.platforms).map(id => [id, {}]));
  // Construct the actual scene caller state without starting a browser/input/audio loop.
  const scene = Object.create(AdventureScene.prototype) as unknown as { previews: Map<string, unknown>; selectedIndex: number; worlds: Record<string, unknown>; preview: () => object };
  scene.previews = new Map(); scene.selectedIndex = LEVELS.indexOf(FROST_RIDGE);
  const kit = { manifest, terrain, ice };
  scene.worlds = { frost: { manifest: { cellSize: 48, assets: {} }, atlas: {}, gems: {}, frostGround: kit, frostLedges: { manifest: ledges, platforms } } };
  const a = scene.preview(), count = made.length; expect(count).toBe(3); expect(scene.preview()).toBe(a); expect(made).toHaveLength(count);
  for (const image of Object.values(platforms)) expect(drawings.some(a => a[0] === image)).toBe(true);
  kit.terrain = { ...terrain }; const b = scene.preview(); expect(b).not.toBe(a); expect(made).toHaveLength(count + 3);
  kit.ice = { ...ice }; const c = scene.preview(); expect(c).not.toBe(b);
  kit.ice.src += '?replacement'; const d = scene.preview(); expect(d).not.toBe(c);
  // Invalid recipe must fail through the real caller instead of returning a stale thumbnail.
  kit.manifest = { ...manifest, recipe: 'wrong' }; expect(() => scene.preview()).toThrow('recipe');
});
