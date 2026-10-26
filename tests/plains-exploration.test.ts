import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { surfaceY, type Player } from '../src/game/movement';
import { damagePlayer, recoverFromFall, type RunEvent, type RunState } from '../src/game/interactions';
import { PLAINS_LEVEL, validateLevel } from '../src/world/level';
import { TRAIL_WORDS } from '../src/game/education';
import { areaName } from '../src/game/hud';

const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };
type Live = { player: Player; run: RunState; events: RunEvent[] };
function adventure() {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { timbers: {} as never, plains: {} as never, site: {} as never, frost: {} as never, cove: {} as never }, audio, PLAINS_LEVEL);
  scene.startSelected();
  return { scene, live: scene as unknown as Live };
}

it('authors the approved compact five-part Plains route with stable rewards and grounded recovery', () => {
  expect(() => validateLevel(PLAINS_LEVEL)).not.toThrow();
  expect([PLAINS_LEVEL.width, PLAINS_LEVEL.height, PLAINS_LEVEL.maxX]).toEqual([4300, 240, 4300]);
  expect(PLAINS_LEVEL.start).toEqual({ x: 60, y: 206 });
  expect(PLAINS_LEVEL.finish).toEqual({ x: 4230, y: 128, asset: 'finish-arch' });
  expect(PLAINS_LEVEL.entities.filter(e => e.kind === 'gem').map(e => e.id))
    .toEqual(Array.from({ length: 33 }, (_, i) => `gem-${String(i + 1).padStart(3, '0')}`));
  expect(PLAINS_LEVEL.entities.filter(e => e.kind === 'special').map(e => [e.id, e.x, e.y]))
    .toEqual([['plains-special-1', 1150, 78], ['plains-special-2', 1930, 150], ['plains-special-3', 2800, 135]]);
  expect(PLAINS_LEVEL.checkpoints.map(c => [c.id, c.x, c.y])).toEqual([
    ['checkpoint-meadow', 740, 206], ['checkpoint-hillside', 1430, 218],
    ['checkpoint-orchard', 2370, 220], ['checkpoint-summit', 3260, 204],
  ]);
  for (const cp of PLAINS_LEVEL.checkpoints) {
    expect(cp.y).toBe(surfaceY(PLAINS_LEVEL, cp.x));
    expect(PLAINS_LEVEL.entities.find(e => e.id === cp.id)).toMatchObject({ kind: 'checkpoint', x: cp.x, y: cp.y });
  }
  expect(PLAINS_LEVEL.entities.filter(e => e.kind === 'spring').map(e => [e.id, e.x, e.y])).toEqual([['spring-001', 2760, 220]]);
  expect(TRAIL_WORDS[0].pickups.map(p => [p.id, p.x])).toEqual([
    ['plains-letter-h', 650], ['plains-letter-i', 2180], ['plains-letter-l1', 3150], ['plains-letter-l2', 3750],
  ]);
  expect(PLAINS_LEVEL.theme.material).toBe('soil');
  expect(PLAINS_LEVEL.theme.materialSections ?? []).toEqual([]);
  expect(PLAINS_LEVEL.surfaces.every(s => !s.friction || s.friction === 1)).toBe(true);
  expect(PLAINS_LEVEL.checkpoints.map((_, i) => areaName(PLAINS_LEVEL, i)))
    .toEqual(['Big downhill', 'Orchard bumps', 'Spring hill', 'Final climb']);
});

function step(scene: AdventureScene, live: Live, horizontal = 0, jumpPressed = false, jumpHeld = false) {
  scene.update(1 / 60, { ...neutral, horizontal, jumpPressed, jumpHeld });
  return [...live.events];
}
function walkTo(scene: AdventureScene, live: Live, target: number, maxFrames = 2400) {
  const events: RunEvent[] = [];
  let held = 0;
  for (let frame = 0; frame < maxFrames && Math.abs(live.player.x - target) > 4; frame++) {
    const p = live.player, direction = Math.sign(target - p.x);
    const stop = p.x + Math.sign(p.vx) * p.vx ** 2 / 2400;
    const horizontal = Math.abs(target - p.x) < 120 ? stop < target - 3 ? 1 : stop > target + 3 ? -1 : 0 : direction;
    const slime = live.run.entities.find(e => e.id === 'slime-003');
    const jump = p.onGround && slime?.active && !slime.squashed
      && (slime.x - p.x) * direction > -18 && (slime.x - p.x) * direction < 70;
    if (jump) held = 24;
    events.push(...step(scene, live, horizontal, !!jump, held-- > 0));
  }
  expect(Math.abs(live.player.x - target), `walk to ${target}, x=${live.player.x}`).toBeLessThanOrEqual(4);
  return events;
}

it('finishes with no stars or bonus hops, bypasses the spring, activates four flags and walks the final climb', () => {
  const { scene, live } = adventure();
  const events: RunEvent[] = [];
  let held = 0, bypassed = false;
  for (let frame = 0; frame < 2400 && scene.screenState !== 'finish'; frame++) {
    const p = live.player;
    let jump = false;
    if (!bypassed && p.x >= 2685) { jump = true; bypassed = true; }
    if (jump) held = 6;
    events.push(...step(scene, live, 1, jump, held-- > 0));
    if (p.x > 3300) {
      expect(p.onGround).toBe(true);
      expect(p.y + 34).toBeCloseTo(surfaceY(PLAINS_LEVEL, p.x));
    }
  }
  expect(scene.screenState).toBe('finish');
  expect([...live.run.collectedSpecials]).toEqual([]);
  expect(['gem-004', 'gem-005', 'gem-006', 'gem-011', 'gem-012'].filter(id => live.run.collectedGems.has(id))).toEqual([]);
  expect(events.filter(e => e.type === 'spring')).toEqual([]);
  expect(events.filter(e => e.type === 'checkpoint')).toHaveLength(4);
  expect(events.filter(e => e.type === 'recover')).toEqual([]);
  expect(scene.education.letterCount).toBe(4);
});

it.each([1065, 1080, 1095])('takes the downhill star from x%i and lands on ordinary grass', launch => {
  const { scene, live } = adventure();
  while (live.player.x < launch) step(scene, live, 1);
  const takeoff = live.player.x;
  for (let frame = 0; frame < 90; frame++) {
    step(scene, live, 1, frame === 0, frame < 24);
    if (frame > 1 && live.player.onGround) break;
  }
  expect(live.run.collectedSpecials.has('plains-special-1')).toBe(true);
  expect(live.player.x).toBeGreaterThan(1210);
  expect(live.player.x).toBeLessThan(1320);
  expect(live.player.x).toBeGreaterThan(takeoff);
  expect(live.player.y + 34).toBeCloseTo(surfaceY(PLAINS_LEVEL, live.player.x));
});

it.each([false, true])('rides the spring with jump held=%s and lands on the clear rise', hold => {
  const { scene, live } = adventure();
  walkTo(scene, live, 2600);
  let launched = false, landing = 0;
  for (let frame = 0; frame < 240; frame++) {
    const events = step(scene, live, 1, false, hold);
    if (events.some(e => e.type === 'spring')) launched = true;
    if (launched && live.player.onGround) { landing = live.player.x; break; }
  }
  expect(launched).toBe(true);
  expect(live.run.collectedSpecials.has('plains-special-3')).toBe(true);
  expect(landing).toBeGreaterThan(2840);
  expect(landing).toBeLessThan(2960);
});

it('collects all 33 gems and three stars through ordinary inputs from the actual start', () => {
  const { scene, live } = adventure();
  const targets = PLAINS_LEVEL.entities.filter(e => e.kind === 'gem' || e.kind === 'special').sort((a, b) => a.x - b.x);
  const events: RunEvent[] = [];
  for (const target of targets) {
    if (target.id === 'gem-011') {
      events.push(...walkTo(scene, live, 1020));
      while (live.player.x < 1065) events.push(...step(scene, live, 1));
      for (let frame = 0; frame < 65; frame++) events.push(...step(scene, live, 1, frame === 0, frame < 24));
    }
    if ((target.kind === 'gem' ? live.run.collectedGems : live.run.collectedSpecials).has(target.id)) continue;
    events.push(...walkTo(scene, live, target.x));
    const collected = () => (target.kind === 'gem' ? live.run.collectedGems : live.run.collectedSpecials).has(target.id);
    for (let frame = 0; frame < 360 && !collected(); frame++) {
      const p = live.player, stop = p.x + Math.sign(p.vx) * p.vx ** 2 / 2400;
      const horizontal = stop < target.x - 3 ? 1 : stop > target.x + 3 ? -1 : 0;
      events.push(...step(scene, live, horizontal, p.onGround && frame % 60 === 0, frame % 60 < 24));
    }
    expect(collected(), `${target.id} at ${target.x},${target.y}; Henry ${live.player.x},${live.player.y}`).toBe(true);
  }
  expect(live.run.collectedGems.size).toBe(33);
  expect(live.run.collectedSpecials.size).toBe(3);
  expect(scene.education.letterCount).toBe(4);
  expect(events.filter(e => e.type === 'recover')).toEqual([]);
  while (scene.screenState === 'playing' && live.player.x < 4235) step(scene, live, 1);
  expect(scene.screenState).toBe('finish');
  expect(scene.trailGemTotal).toBe(33);
});

it.each([0, 1, 2, 3])('reaches checkpoint %i with input and retains rewards through fall and health recovery', index => {
  const { scene, live } = adventure();
  const cp = PLAINS_LEVEL.checkpoints[index];
  walkTo(scene, live, cp.x + 4);
  expect(live.run.checkpointId).toBe(cp.id);
  const gems = new Set(live.run.collectedGems), stars = new Set(live.run.collectedSpecials), letters = scene.education.letterCount;
  expect(gems.size).toBeGreaterThan(0);
  live.run.health = 2;
  step(scene, live);
  expect(live.run.health).toBe(2);
  for (const cause of ['fall', 'health']) {
    if (cause === 'fall') recoverFromFall(live.run, live.player, [], PLAINS_LEVEL);
    else { live.run.health = 1; live.run.invulnerableSeconds = 0; damagePlayer(live.run, live.player, 1, [], PLAINS_LEVEL); }
    expect(live.player.x).toBe(cp.x);
    expect(live.player.y + 34).toBe(cp.y);
    expect(live.run.health).toBe(3);
    expect(live.run.collectedGems).toEqual(gems);
    expect(live.run.collectedSpecials).toEqual(stars);
    expect(scene.education.letterCount).toBe(letters);
  }
});

it('keeps the sparse orchard patrol whole body clear throughout its cycle', () => {
  const { scene, live } = adventure();
  const slimes = PLAINS_LEVEL.entities.filter(e => e.kind === 'slime');
  expect(slimes).toHaveLength(1);
  expect(slimes[0].patrol).toMatchObject({ minX: 1720, maxX: 1780, speed: 36 });
  const seen: number[] = [];
  for (let frame = 0; frame < 600; frame++) {
    step(scene, live);
    const state = live.run.entities.find(e => e.id === slimes[0].id)!;
    seen.push(state.x);
    expect(state.x - 16).toBeGreaterThanOrEqual(1704);
    expect(state.x + 16).toBeLessThanOrEqual(1796);
  }
  expect(Math.min(...seen)).toBeLessThan(1721);
  expect(Math.max(...seen)).toBeGreaterThan(1779);
});

it('finishes an outward input route with missed letters, uses Find more letters, retraces both ways and re-enters the same run', () => {
  const { scene, live } = adventure();
  const jumps = [585, 2115, 3085, 3685];
  let index = 0, held = 0;
  for (let frame = 0; frame < 2400 && scene.screenState !== 'finish'; frame++) {
    const jump = live.player.onGround && index < jumps.length && live.player.x >= jumps[index];
    if (jump) { index++; held = 24; }
    step(scene, live, 1, jump, held-- > 0);
  }
  expect(scene.screenState).toBe('finish');
  expect(scene.education.letterCount).toBeLessThan(4);
  const run = live.run, gems = new Set(run.collectedGems), stars = new Set(run.collectedSpecials), checkpoint = run.checkpointId;
  scene.menuTargets.find(t => t.label === 'Build your word')!.action();
  scene.menuTargets.find(t => t.label === 'Find more letters')!.action();
  expect(scene.playerX).toBe(4202);
  for (let frame = 0; frame < 40; frame++) step(scene, live);
  expect(scene.screenState).toBe('playing');
  expect(run.checkpointId).toBe(checkpoint);
  const events = walkTo(scene, live, 310);
  expect(scene.education.letterCount).toBe(4);
  expect(scene.education.hasWordSticker).toBe(false);
  expect(live.run).toBe(run);
  for (const id of gems) expect(run.collectedGems.has(id)).toBe(true);
  for (const id of stars) expect(run.collectedSpecials.has(id)).toBe(true);
  expect(run.checkpointId).toBe('checkpoint-meadow');
  events.push(...walkTo(scene, live, 4200));
  expect(scene.screenState).toBe('playing');
  for (let frame = 0; frame < 60 && scene.screenState === 'playing'; frame++) step(scene, live, 1);
  expect(scene.screenState).toBe('finish');
  expect(events.filter(e => e.type === 'recover')).toEqual([]);
  expect(live.run).toBe(run);
  expect(scene.session.results.get('plains')?.gems).toBeGreaterThanOrEqual(gems.size);
  scene.activateFinish('Replay');
  expect(live.run).not.toBe(run);
  expect(live.run.collectedGems.size).toBe(0);
  expect(live.run.collectedSpecials.size).toBe(0);
  expect(live.run.checkpointId).toBeNull();
  expect(scene.education.letterCount).toBe(4);
  scene.returnToTrails(); scene.selectDestination(1); scene.startSelected();
  expect(scene.education.letterCount).toBe(0);
  expect(scene.selectedLevelName).toBe('QUARRY RUN');
  expect(scene.session.results.has('plains')).toBe(true);
});
