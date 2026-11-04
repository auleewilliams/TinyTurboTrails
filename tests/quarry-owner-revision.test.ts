import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { transformSync } from 'rolldown/utils';
import { QUARRY_RUN } from '../src/world/quarry-run';
import { LEVELS } from '../src/world/levels';
import { validateLevel, type WorldEntity } from '../src/world/level';
import { SLIME_EDGE_CLEARANCE } from '../src/world/slimes';
import { advancePatrols, advanceBounces, createRun, entityPosition, entityState, recoverFromFall, startNewRun, stepEntities, tickRun, type RunEvent } from '../src/game/interactions';
import { createPlayer, DEFAULT_MOVEMENT, simulatePlayer } from '../src/game/movement';
import { platformBodiesAt } from '../src/game/platforms';
import { drawPlatformPath, drawPlatforms, drawWorld } from '../src/world/renderer';
const { beforeQuarryOwnerRevision } = createRequire(import.meta.url)('../scripts/quarry-owner-revision-preservation.mjs') as {
  beforeQuarryOwnerRevision(path: string, bytes: Buffer): Buffer;
};
const expected = [
  ['quarry-slime-upper', 'quarry-terrace-2', 390, 280, 350, 430],
  ['quarry-slime-middle', 'quarry-terrace-5', 430, 560, 390, 470],
  ['quarry-slime-lower', 'quarry-terrace-8', 400, 840, 360, 440],
];
const slimes = () => QUARRY_RUN.entities.filter(e => e.kind === 'slime');
function canvas() {
  const images: unknown[][] = [], rects: unknown[][] = [];
  const ctx = new Proxy({ fillStyle: '', drawImage: (...a: unknown[]) => images.push(a), fillRect(...a: unknown[]) { rects.push([this.fillStyle, ...a]); } }, { get: (t, k) => k in t ? t[k as keyof typeof t] : () => {} }) as unknown as CanvasRenderingContext2D;
  return { ctx, images, rects };
}
function kits() {
  return Object.fromEntries([['quarryRollout','rollout-v1'],['quarryPreview','representative-v1'],['quarryShelves','whole-ledges-v1']].map(([key, dir]) => {
    const manifest = JSON.parse(readFileSync(`public/assets/quarry/${dir}/manifest.json`, 'utf8'));
    return [key, { manifest, images: Object.fromEntries(Object.entries(manifest.platforms).map(([id, value]) => {
      const piece = value as { image: string; width: number; height: number };
      const src = `public/assets/quarry/${dir}/${piece.image}`, png = readFileSync(src);
      const naturalWidth = png.readUInt32BE(16), naturalHeight = png.readUInt32BE(20);
      expect([naturalWidth, naturalHeight]).toEqual([piece.width, piece.height]);
      return [id, { id, src, naturalWidth, naturalHeight }];
    })) }];
  }));
}
it('preserves accepted Quarry and Sunset marker removal while drawing every real illustrated body', () => {
  const assets = kits();
  for (const seconds of [0, 2, 5.5, 8, 11]) {
    const { ctx, images, rects } = canvas(), bodies = platformBodiesAt(QUARRY_RUN.platforms!, seconds);
    drawPlatforms(ctx, QUARRY_RUN, { x: .25, y: .5 }, bodies, assets as never);
    expect(rects).toEqual([]);
    expect(images).toHaveLength(45);
    for (const body of bodies) expect(images.some(c => (c[0] as { id: string }).id === body.id && c[1] === body.x - .25 && c[2] === body.y - .5)).toBe(true);
  }
  for (const level of LEVELS.filter(l => l.id !== 'quarry')) {
    const { ctx, rects } = canvas();
    drawPlatforms(ctx, level, { x: 0, y: 0 }, []);
    const paths = level.platforms?.filter(p => level.id !== 'sunset' && (level.id !== 'timbers' || p.from.x !== p.to.x || p.from.y !== p.to.y)) ?? [];
    if (level.id === 'sunset') expect(rects).toEqual([]);
    expect(rects.filter(r => r[0] === '#ffffff66' && r[3] === 8 && r[4] === 2)).toHaveLength(paths.length * 2);
  }
});
it('authors exactly three spaced miner patrols on fixed roomy terraces', () => {
  expect(slimes().map(e => [e.id, e.patrol?.supportId, e.x, e.y, e.patrol?.minX, e.patrol?.maxX])).toEqual(expected);
  expect(QUARRY_RUN.theme.slimeAccessory).toBe('miner');
  expect(() => validateLevel(QUARRY_RUN)).not.toThrow();
  for (const e of slimes()) {
    expect(e.bounce).toBeUndefined(); expect(e.patrol!.speed).toBe(36);
    for (const point of [QUARRY_RUN.start, ...QUARRY_RUN.checkpoints, QUARRY_RUN.finish, QUARRY_RUN.retrace!]) {
      expect(Math.abs(e.y - point.y)).toBeGreaterThan(100);
    }
    // Both lift shafts and the star docks lie wholly outside these body envelopes.
    expect(e.patrol!.minX - SLIME_EDGE_CLEARANCE).toBeGreaterThan(224);
    expect(e.patrol!.maxX + SLIME_EDGE_CLEARANCE).toBeLessThan(600);
  }
});
it('preserves every prior Quarry field and non-slime entity against the exact source oracle', () => {
  const prior = beforeQuarryOwnerRevision('src/world/quarry-run.ts', readFileSync('src/world/quarry-run.ts'));
  const code = transformSync('quarry-run.ts', prior.toString().replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code;
  const baseline = new Function(`${code}\nreturn QUARRY_RUN;`)();
  expect({ ...QUARRY_RUN, entities: QUARRY_RUN.entities.filter(e => e.kind !== 'slime') }).toEqual(baseline);
});
it('keeps complete live patrols on the same support through both reversals and rendering', () => {
  expect(slimes()).toHaveLength(3);
  const run = createRun(QUARRY_RUN), seen = new Map(slimes().map(e => [e.id, new Set<number>()]));
  const extremes = new Map(slimes().map(e => [e.id, { min: Infinity, max: -Infinity }]));
  for (let frame = 0; frame < 1200; frame++) {
    advancePatrols(run, QUARRY_RUN, 1 / 60); advanceBounces(run, QUARRY_RUN);
    for (const e of slimes()) {
      const state = entityState(run, e.id)!, p = QUARRY_RUN.platforms!.find(p => p.id === e.patrol!.supportId)!;
      seen.get(e.id)!.add(state.direction);
      const extent = extremes.get(e.id)!;
      extent.min = Math.min(extent.min, state.x); extent.max = Math.max(extent.max, state.x);
      expect(state.y).toBe(p.from.y);
      expect(state.x).toBeGreaterThanOrEqual(e.patrol!.minX); expect(state.x).toBeLessThanOrEqual(e.patrol!.maxX);
      expect(state.x - SLIME_EDGE_CLEARANCE).toBeGreaterThanOrEqual(p.from.x);
      expect(state.x + SLIME_EDGE_CLEARANCE).toBeLessThanOrEqual(p.from.x + p.width);
      expect(entityPosition(run, e)).toEqual({ x: state.x, y: state.y });
    }
  }
  for (const directions of seen.values()) expect([...directions].sort()).toEqual([-1, 1]);
  for (const e of slimes()) expect(extremes.get(e.id)).toEqual({ min: e.patrol!.minX, max: e.patrol!.maxX });
  const { ctx, images } = canvas(), atlas = {};
  drawWorld(ctx, { ...kits(), atlas: {}, slimes: atlas, manifest: { assets: {} }, quarryFloor: { manifest: JSON.parse(readFileSync('public/assets/quarry/floor-v1/manifest.json','utf8')), image: { naturalWidth: 820, naturalHeight: 107 } } } as never,
    QUARRY_RUN, { position: { x: 0, y: 0 } } as never, () => true, e => entityPosition(run, e), [], 0, true);
  for (const e of slimes()) { const state = entityState(run,e.id)!; expect(images.some(c => c[0] === atlas && c[5] === state.x - 24 && c[6] === state.y - 44)).toBe(true); }
});
it('uses shelf positions for real side damage, stomp rest, squash persistence, recovery and replay', () => {
  expect(slimes()).toHaveLength(3);
  for (const e of slimes()) {
    const run = createRun(QUARRY_RUN), henry = createPlayer(e.x, QUARRY_RUN), events: RunEvent[] = [];
    advancePatrols(run, QUARRY_RUN, .03); const state = entityState(run,e.id)!;
    henry.x = state.x; henry.y = state.y - DEFAULT_MOVEMENT.height;
    stepEntities(run,QUARRY_RUN,henry,0,events); expect(events).toContainEqual({ type:'damage',entityId:e.id });
    run.invulnerableSeconds = 0; events.length = 0;
    henry.x = state.x; henry.y = state.y - 20 - 34 + 2; henry.vy = 100; henry.onGround = false;
    stepEntities(run,QUARRY_RUN,henry,0,events,{x:henry.x,y:henry.y-4});
    expect(events).toContainEqual({type:'squash',entityId:e.id}); expect(state.y).toBe(e.y); expect(state.squashed).toBe(true);
    for(let i=0;i<20;i++){tickRun(run,1/60);stepEntities(run,QUARRY_RUN,henry,1/60,[]);}
    expect(state.y).toBe(e.y); expect(state.squashed).toBe(true);
    run.checkpointId = QUARRY_RUN.checkpoints[0].id; recoverFromFall(run,henry,[],QUARRY_RUN);
    expect(henry.y + DEFAULT_MOVEMENT.height).toBe(420); expect(state.y).toBe(e.y);
    startNewRun(run,QUARRY_RUN); expect(entityState(run,e.id)).toEqual(entityState(createRun(QUARRY_RUN),e.id));
  }
});
it('rejects missing/moving supports, mismatched tops and patrols without full body clearance', () => {
  const base = {id:'probe',kind:'slime',asset:'slime',layer:'world',x:390,y:280,patrol:{minX:350,maxX:430,speed:36,supportId:'quarry-terrace-2'}} as WorldEntity;
  const validate = (e: WorldEntity) => validateLevel({...QUARRY_RUN,entities:[...QUARRY_RUN.entities.filter(e=>e.kind!=='slime'),e]});
  expect(()=>validate(base)).not.toThrow();
  for(const supportId of ['missing','quarry-lift-a']) expect(()=>validate({...base,patrol:{...base.patrol!,supportId}})).toThrow(/fixed support/);
  expect(()=>validate({...base,y:281})).toThrow(/support/);
  for(const patrol of [{...base.patrol!,minX:299},{...base.patrol!,maxX:501}]) expect(()=>validate({...base,patrol})).toThrow(/edge clearance/);
  expect(()=>validate({...base,kind:'gem'})).toThrow(/slime/);
});

it('can jump past each real patrol without damage using ordinary movement and actual fixed bodies', () => {
  expect(slimes()).toHaveLength(3);
  for (const slime of slimes()) {
    const run = createRun(QUARRY_RUN);
    const henry = createPlayer(slime.patrol!.minX - 45, QUARRY_RUN);
    henry.y = slime.y - DEFAULT_MOVEMENT.height;
    henry.onGround = true;
    const events: RunEvent[] = [];
    let jumped = false;
    for (let frame = 0; frame < 90; frame++) {
      const state = entityState(run, slime.id)!;
      const jump = !jumped && henry.onGround && state.x - henry.x < 65;
      if (jump) jumped = true;
      const previous = { x: henry.x, y: henry.y };
      tickRun(run, 1 / 60);
      simulatePlayer(henry, { horizontal: 1, jumpPressed: jump, jumpHeld: jumped }, QUARRY_RUN, 1 / 60,
        platformBodiesAt(QUARRY_RUN.platforms, run.seconds, 1 / 60));
      stepEntities(run, QUARRY_RUN, henry, 1 / 60, events, previous);
      if (henry.x > slime.patrol!.maxX + 30) break;
    }
    expect(jumped).toBe(true);
    expect(henry.x).toBeGreaterThan(slime.patrol!.maxX + 30);
    expect(events.some(event => event.type === 'damage' || event.type === 'recover')).toBe(false);
    expect(run.health).toBe(3);
  }
});

it('anchors optional bounce and stomp rest to the bound shelf through the same grounding path', () => {
  const slime = slimes()[0];
  expect(slime).toBeDefined();
  const level = { ...QUARRY_RUN, entities: QUARRY_RUN.entities.map(e => e.id === slime.id
    ? { ...e, bounce: { amplitude: 4, seconds: 2 } } : e) };
  const run = createRun(level), state = entityState(run, slime.id)!;
  for (let frame = 0; frame < 120; frame++) {
    tickRun(run, 1 / 60);
    advancePatrols(run, level, 1 / 60);
    advanceBounces(run, level);
    expect(state.y).toBeCloseTo(slime.y - Math.sin((run.seconds % 2) / 2 * Math.PI) ** 2 * 4);
  }
  const henry = createPlayer(state.x, level);
  henry.y = state.y - 52;
  henry.vy = 100;
  henry.onGround = false;
  stepEntities(run, level, henry, 0, [], { x: henry.x, y: henry.y - 4 });
  expect(state.squashed).toBe(true);
  expect(state.y).toBe(slime.y);
});

it('actual Quarry browser caller requires zero marker ink and retains all lift attachments before asserting', async () => {
  const source = readFileSync('tests/browser.spec.ts', 'utf8');
  const start = source.indexOf("test('moving platform slabs and their telegraphed paths");
  const section = source.slice(start, source.indexOf('\n});', start) + 4);
  const callback = section.slice(section.indexOf('async ({ page }'), -2);
  const code = transformSync('marker-caller.ts', `const callback = ${callback};`, {}).code;
  const { platformBodyAt } = await import('../src/game/platforms');
  const lifts = QUARRY_RUN.platforms!.filter(p => p.from.y !== p.to.y);
  const attachments: string[] = [];
  const results = lifts.map(p => {
    const body = platformBodyAt(p, 2), { ctx, rects } = canvas();
    drawPlatforms(ctx, { ...QUARRY_RUN, platforms: [p] }, { x: body.x - 150, y: body.y - 120 }, [body], kits() as never);
    return { id: p.id, width: body.width, cap: 96, slab: 96, telegraphed: 0, outsideDeck: 0,
      markerCalls: rects.length, legacyOutsideDeck: 50, legacyMarkerCalls: 27, image: 'data:image/png;base64,AA==' };
  });
  const caller = new Function('expect', 'QUARRY_RUN', 'platformBodyAt', 'writeFile', 'RENDERER_SOURCE', 'drawWorld', `${code}\nreturn callback;`)(
    expect, QUARRY_RUN, platformBodyAt, async () => {}, '', drawWorld);
  await caller({ page: { goto: async () => {}, addScriptTag: async () => {}, evaluate: async () => results } },
    { annotations: [], outputPath: (p: string) => p, attach: async (id: string) => attachments.push(id) });
  expect(attachments).toEqual(lifts.map(p => p.id));
  for (const property of ['outsideDeck', 'markerCalls', 'cap']) {
    attachments.length = 0;
    const bad = results.map((r, i) => i ? r : { ...r, [property]: property === 'cap' ? 0 : 1 });
    await expect(caller({ page: { goto: async () => {}, addScriptTag: async () => {}, evaluate: async () => bad } },
      { annotations: [], outputPath: (p: string) => p, attach: async (id: string) => attachments.push(id) })).rejects.toThrow();
    expect(attachments).toEqual(lifts.map(p => p.id));
  }
});

it('the actual browser pixel oracle detects the real legacy pips/endcaps over each shipped carriage', () => {
  const { decodePng } = createRequire(import.meta.url)('../scripts/spelling-stickers.mjs') as {
    decodePng(bytes: Buffer): { width: number; height: number; data: Uint8Array };
  };
  const source = readFileSync('tests/browser.spec.ts', 'utf8');
  const start = source.indexOf('      const countOutsideDeck = '), end = source.indexOf('      const outsideDeck = ', start);
  const code = transformSync('marker-oracle.ts', source.slice(start, end), {}).code;
  const count = new Function(`${code}\nreturn countOutsideDeck;`)() as (a: Uint8ClampedArray,b: Uint8ClampedArray,w:number,h:number)=>number;
  for (const p of QUARRY_RUN.platforms!.filter(p => p.from.y !== p.to.y)) {
    const kit = p.id === 'quarry-lift-b' ? 'representative-v1' : 'rollout-v1';
    const image = decodePng(readFileSync(`public/assets/quarry/${kit}/carriage-96.png`));
    const clean = new Uint8ClampedArray(426 * 240 * 4);
    for (let y=0;y<image.height;y++) for (let x=0;x<image.width;x++) {
      clean.set(image.data.subarray((y*image.width+x)*4,(y*image.width+x)*4+4),((120+y)*426+150+x)*4);
    }
    expect(count(new Uint8ClampedArray(clean.length),clean,p.width,image.height)).toBe(0);
    const legacy = clean.slice(), body = platformBodiesAt([p],2)[0];
    const ctx = { fillStyle: '', fillRect(x:number,y:number,w:number,h:number) {
      expect(this.fillStyle).toBe('#ffffff66');
      for(let yy=Math.max(0,y);yy<Math.min(240,y+h);yy++) for(let xx=Math.max(0,x);xx<Math.min(426,x+w);xx++) {
        // Source-over white at the actual legacy alpha, on the same native PNG raster.
        const i=(yy*426+xx)*4, alpha=102/255, old=legacy[i+3]/255, combined=alpha+old*(1-alpha);
        for(let c=0;c<3;c++) legacy[i+c]=(255*alpha+legacy[i+c]*old*(1-alpha))/combined;
        legacy[i+3]=combined*255;
      }
    } };
    drawPlatformPath(ctx as never,p,{x:body.x-150,y:body.y-120});
    expect(count(clean,legacy,p.width,image.height)).toBeGreaterThan(20);
  }
});
