import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { transformSync } from 'rolldown/utils';
import { SUNSET_SITE } from '../src/world/sunset-site';
import { platformBodiesAt } from '../src/game/platforms';
import { drawSitePlatform, loadSiteTerrain, validateSiteLayout, validateSiteTerrain, type SiteTerrainManifest, type SiteTerrainAssets } from '../src/world/site-terrain';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/site/steel-v1/manifest.json', import.meta.url), 'utf8')) as SiteTerrainManifest;
const approvedGems = [
  'site-gem-001', 'site-gem-002', 'site-gem-003', 'site-gem-004', 'site-gem-005',
  'site-gem-006', 'site-gem-007', 'site-gem-008', 'site-gem-010', 'site-gem-014',
  'site-gem-015', 'site-gem-019', 'site-gem-022', 'site-gem-023', 'site-gem-024',
  'site-gem-025', 'site-gem-026', 'site-gem-028', 'site-gem-032', 'site-gem-033',
  'site-gem-034', 'site-gem-035', 'site-gem-036', 'site-gem-037', 'site-gem-038',
  'site-gem-039', 'site-gem-040', 'site-gem-041', 'site-gem-042', 'site-gem-043',
  'site-gem-044', 'site-gem-045', 'site-gem-046', 'site-gem-049', 'site-gem-055',
  'site-gem-056', 'site-bonus-004', 'site-bonus-006',
];
afterEach(() => vi.unstubAllGlobals());

function fixture(): SiteTerrainAssets {
  const runs = new Map<string, { run: SiteTerrainManifest['runs'][number]; image: HTMLImageElement }>();
  for (const run of manifest.runs) {
    const image = { src: run.image } as HTMLImageElement;
    for (const id of run.supportIds) runs.set(id, { run, image });
  }
  return { manifest: structuredClone(manifest), runs, ferry: { src: 'ferry.png' } as HTMLImageElement, ground: {} as HTMLImageElement };
}

it('covers every approved fixed support exactly once and refuses missing/duplicate or foreign entries', () => {
  expect(() => validateSiteTerrain(manifest)).not.toThrow();
  for (const mutate of [
    (m: SiteTerrainManifest) => m.runs[0].supportIds.push(m.runs[0].id),
    (m: SiteTerrainManifest) => { m.runs[0].supportIds = []; },
    (m: SiteTerrainManifest) => { m.runs[0].image = '../environment.png'; },
    (m: SiteTerrainManifest) => { m.ferry.width = 97; },
    (m: SiteTerrainManifest) => { m.ground.to = 980; },
  ]) {
    const changed = structuredClone(manifest); mutate(changed);
    expect(() => validateSiteTerrain(changed)).toThrow();
  }
});

it('checks the artwork bounds against unique authored supports, including the joined crane deck', () => {
  expect(() => validateSiteLayout(fixture(), SUNSET_SITE)).not.toThrow();
  for (const kind of ['missing', 'duplicate', 'width', 'top', 'gap', 'foreign']) {
    const level = structuredClone(SUNSET_SITE), platforms = [...level.platforms!];
    const i = platforms.findIndex(p => p.id === 'site-crane-catch');
    if (kind === 'missing') platforms.splice(i, 1);
    if (kind === 'duplicate') platforms.push(platforms[i]);
    if (kind === 'width') platforms[i].width++;
    if (kind === 'top') { platforms[i].from.y++; platforms[i].to.y++; }
    if (kind === 'gap') { platforms[i].from.x++; platforms[i].to.x++; }
    if (kind === 'foreign') level.id = 'plains';
    level.platforms = platforms;
    expect(() => validateSiteLayout(fixture(), level), kind).toThrow();
  }
});

it('draws joined steel once per run and preserves moving-body position at fractional cameras', () => {
  const kit = fixture(), calls: unknown[][] = [];
  const ctx = { save() {}, restore() {}, imageSmoothingEnabled: true, drawImage(...args: unknown[]) { calls.push(args); } } as unknown as CanvasRenderingContext2D;
  const offset = { x: 105.25, y: 74.5 }, bodies = platformBodiesAt(SUNSET_SITE.platforms, 1.9);
  for (const body of bodies) drawSitePlatform(ctx, kit, SUNSET_SITE, body, offset);
  expect(calls).toHaveLength(32);
  const long = calls.find(args => args[7] === 1740)!;
  expect(long.slice(5)).toEqual([160 - offset.x, 380 - offset.y, 1740, 18]);
  const ferry = bodies.find(p => p.id === 'site-crane-ferry')!;
  expect(calls.find(args => args[0] === kit.ferry)?.slice(5)).toEqual([ferry.x - offset.x, ferry.y - offset.y, 96, 18]);
});

it('preserves the full layout and all rewards except the exact approved gem Y offsets', () => {
  const baseline = JSON.parse(readFileSync(new URL('../docs/evidence/issue-242/inventory.json', import.meta.url), 'utf8'));
  const source = readFileSync(new URL('../assets/source/site/steel-v1/baseline/src/world/sunset-site.ts', import.meta.url), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe(baseline.sourceHashes['src/world/sunset-site.ts']);
  const compiled = transformSync('sunset-site.ts', source.replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code;
  const original = new Function(`${compiled}\nreturn SUNSET_SITE;`)() as typeof SUNSET_SITE;
  const completeExpected = { ...original, entities: original.entities.map(entity => ({
    ...entity, y: entity.y + (approvedGems.includes(entity.id) ? 2 : 0),
  })) };
  expect(SUNSET_SITE).toEqual(completeExpected);
  const expected = baseline.platforms.map((p: { id: string; from: object; to: object; width: number; seconds: number; pause: number }) => ({
    id: p.id, from: p.from, to: p.to, width: p.width, seconds: p.seconds, ...(p.pause ? { pause: p.pause } : {}),
  }));
  expect(SUNSET_SITE.platforms).toEqual(expected);
  expect(SUNSET_SITE.surfaces).toEqual(baseline.terrain.map((s: { x1: number; x2: number; y1: number; y2: number }) => ({ x1: s.x1, x2: s.x2, y1: s.y1, y2: s.y2 })));
  for (const key of ['width', 'height', 'start', 'finish', 'retrace', 'checkpoints', 'verticalCamera', 'cameraLead'] as const) expect(SUNSET_SITE[key], key).toEqual(baseline.geometry[key]);
  const current = SUNSET_SITE.entities.filter(e => e.kind === 'gem');
  expect(current).toHaveLength(62);
  expect(current).toEqual(baseline.gems.map(({ supportIds: _supportIds, ...gem }: { id: string; y: number; supportIds: string[] }) => ({
    ...gem, y: gem.y + (approvedGems.includes(gem.id) ? 2 : 0),
  })));
  expect(approvedGems).toHaveLength(38);
  for (const id of approvedGems) expect(baseline.proposedGemChanges.filter((c: { id: string }) => c.id === id)).toHaveLength(1);
});

it('keeps accepted/shared artwork, all other trails and simulation bytes unchanged', () => {
  const baseline = JSON.parse(readFileSync(new URL('../docs/evidence/issue-242/inventory.json', import.meta.url), 'utf8')) as { sourceHashes: Record<string, string> };
  const approved = new Set(['src/world/assets.ts', 'src/world/renderer.ts', 'src/world/sunset-site.ts', 'public/assets/site/manifest.json']);
  for (const [path, digest] of Object.entries(baseline.sourceHashes)) {
    if ((!path.startsWith('src/') && !path.startsWith('public/')) || approved.has(path)) continue;
    const actual = createHash('sha256').update(readFileSync(new URL('../' + path, import.meta.url))).digest('hex');
    expect(actual, path).toBe(digest);
  }
});

it('requires every declared image and retries after a failed or wrong-sized image', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => manifest })));
  let failure = '', wrongSize = false;
  class FakeImage {
    naturalWidth = 0;
    naturalHeight = 0;
    onload = (): void => {};
    onerror = (): void => {};
    set src(url: string) {
      const name = url.split('/').at(-1)!;
      const spec = manifest.runs.find(r => r.image === name);
      this.naturalWidth = spec?.width ?? (name === 'ferry.png' ? 96 : 3120);
      this.naturalHeight = name === 'ground-full.png' ? 1064 : 18;
      if (wrongSize && name === failure) this.naturalWidth++;
      queueMicrotask(name === failure && !wrongSize ? this.onerror : this.onload);
    }
  }
  vi.stubGlobal('Image', FakeImage);
  for (const name of [...manifest.runs.map(r => r.image), 'ferry.png', 'ground-full.png']) {
    failure = name; wrongSize = false;
    await expect(loadSiteTerrain('/assets/site/', 'steel-v1/manifest.json')).rejects.toThrow('Could not load');
    wrongSize = true;
    await expect(loadSiteTerrain('/assets/site/', 'steel-v1/manifest.json')).rejects.toThrow('dimensions');
    failure = ''; wrongSize = false;
    expect((await loadSiteTerrain('/assets/site/', 'steel-v1/manifest.json'))!.runs.size).toBe(39);
  }
});
