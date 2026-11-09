import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { transformSync } from 'rolldown/utils';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import { surfaceAt, surfaceY, createPlayer } from '../src/game/movement';
import { advancePatrols, createRun, entityState, startNewRun, stepEntities, type RunEvent } from '../src/game/interactions';
import { SLIME_BODY_WIDTH, SLIME_SPEED } from '../src/world/slimes';
import { frostRewards } from './frost-pilot';

const slimes = FROST_RIDGE.entities.filter(e => e.kind === 'slime');
const expected = [
  { id: 'frost-slime-1', x: 1475, y: 380, minX: 1430, maxX: 1490 },
  { id: 'frost-slime-2', x: 2900, y: 540, minX: 2840, maxX: 2960 },
  { id: 'frost-slime-3', x: 4520, y: 432, minX: 4490, maxX: 4550 },
];

it('keeps each initial slime anchor at least 120px from every checkpoint', () => {
  expect(slimes).toHaveLength(3);
  for (const slime of slimes) for (const checkpoint of FROST_RIDGE.checkpoints) {
    expect(Math.abs(slime.x - checkpoint.x), `${slime.id} / ${checkpoint.id}`).toBeGreaterThanOrEqual(120);
  }
});

it('keeps the whole patrol body outside every ice end-run and its 120px buffer', () => {
  expect(slimes).toHaveLength(3);
  const surfaces = FROST_RIDGE.surfaces;
  const ends = surfaces.filter((s, i) => s.material === 'ice' && surfaces[i + 1]?.material !== 'ice');
  expect(ends).toHaveLength(3);
  for (const patch of ends) {
    const runout = surfaces[surfaces.indexOf(patch) + 1];
    for (const slime of slimes) {
      const left = slime.patrol!.minX - SLIME_BODY_WIDTH / 2;
      const right = slime.patrol!.maxX + SLIME_BODY_WIDTH / 2;
      expect(right < patch.x1 - 120 || left > runout.x2 + 120, `${slime.id} / ice end ${patch.x2}`).toBe(true);
    }
  }
});

it('restores exactly three bobble-hat slimes on bounded safe flat snow', () => {
  expect(slimes, 'missing approved Frost slime restoration').toHaveLength(3);
  expect(FROST_RIDGE.theme.slimeAccessory).toBe('bobble');
  expect(slimes.map(e => ({ id: e.id, x: e.x, y: e.y, ...e.patrol }))).toEqual(expected.map(e => ({ ...e, speed: SLIME_SPEED })));
  for (const slime of slimes) {
    expect(slime.asset).toBe('slime'); expect(slime.layer).toBe('world');
    expect(slime.bounce).toBeUndefined(); expect(slime.patrol!.supportId).toBeUndefined();
    const left = slime.patrol!.minX - SLIME_BODY_WIDTH / 2, right = slime.patrol!.maxX + SLIME_BODY_WIDTH / 2;
    for (let x = left; x <= right; x++) {
      expect(surfaceAt(FROST_RIDGE, x).material).toBeUndefined();
      expect(surfaceY(FROST_RIDGE, x)).toBe(slime.y);
    }
    for (const c of FROST_RIDGE.checkpoints) expect(right < c.x - 60 || left > c.x + 60).toBe(true);
    for (const s of FROST_RIDGE.entities.filter(e => e.kind === 'spring')) expect(right < s.x - 80 || left > s.x + 80).toBe(true);
    for (const p of FROST_RIDGE.platforms!) expect(right < p.from.x || left > p.from.x + p.width).toBe(true);
    for (const x of [110, 1190, 2620, 5320, FROST_RIDGE.start.x, FROST_RIDGE.finish.x, FROST_RIDGE.retrace!.x]) expect(x < left - 60 || x > right + 60).toBe(true);
  }
});

it('uses shared movement, contact damage, squash bounce, harmless rest and new-run reset for each Frost slime', () => {
  expect(slimes).toHaveLength(3);
  for (const slime of slimes) {
    const run = createRun(FROST_RIDGE), state = entityState(run, slime.id)!;
    state.x = slime.patrol!.maxX - 0.01; advancePatrols(run, FROST_RIDGE, 0.1);
    expect(state).toMatchObject({ x: slime.patrol!.maxX, y: slime.y, direction: -1 });
    state.x = slime.patrol!.minX + 0.01; advancePatrols(run, FROST_RIDGE, 0.1);
    expect(state).toMatchObject({ x: slime.patrol!.minX, y: slime.y, direction: 1 });
    const contact = createRun(FROST_RIDGE), player = createPlayer(slime.x, FROST_RIDGE), damage: RunEvent[] = [];
    stepEntities(contact, FROST_RIDGE, player, 0, damage);
    expect(contact.health).toBe(2); expect(damage).toContainEqual({ type: 'damage', entityId: slime.id });
    const stomp = createRun(FROST_RIDGE), falling = createPlayer(slime.x, FROST_RIDGE), events: RunEvent[] = [];
    Object.assign(falling, { y: slime.y - 53, vy: 180, vx: 120, onGround: false });
    stepEntities(stomp, FROST_RIDGE, falling, 0, events, { x: slime.x, y: slime.y - 60 });
    expect(events).toContainEqual({ type: 'squash', entityId: slime.id });
    expect(stomp.health).toBe(3); expect(falling.vy).toBe(-260); expect(falling.vx).toBe(120);
    const flat = entityState(stomp, slime.id)!;
    expect(flat).toMatchObject({ active: true, squashed: true, x: slime.x, y: slime.y });
    Object.assign(falling, { x: slime.x, y: slime.y - 34, vy: 0, onGround: true });
    stepEntities(stomp, FROST_RIDGE, falling, 1, []);
    expect(stomp.health).toBe(3); expect(flat.x).toBe(slime.x);
    startNewRun(stomp, FROST_RIDGE); expect(stomp).toEqual(createRun(FROST_RIDGE));
  }
});

it('preserves the exact pre-restoration level semantics after removing only the three slimes', () => {
  const record = JSON.parse(readFileSync(new URL('../assets/source/frost/slime-restoration-v1/gameplay-delta.json', import.meta.url), 'utf8'));
  const source = record['src/world/frost-ridge.ts'].before as string;
  const code = transformSync('baseline.ts', source.replace(/^import .*;\n/gm, '').replace('export const FROST_RIDGE', 'const FROST_RIDGE'), {}).code;
  const baseline = new Function('surfaceY', code + '\nreturn FROST_RIDGE;')(surfaceY);
  expect(baseline.entities.filter((e: {kind: string}) => e.kind === 'slime')).toHaveLength(0);
  expect({ ...FROST_RIDGE, entities: FROST_RIDGE.entities.filter(e => e.kind !== 'slime') }).toEqual(baseline);
});

it.each([[0.016], [0.020], [0.024], [0.032], [0.016, 0.032, 0.024]])('retains the all-39-reward input journey with live patrols at cadence %j', (...cadence) => {
  const route = frostRewards(cadence);
  expect(route.scene.screenState).toBe('finish');
  expect([...route.runState.collectedGems].sort()).toEqual(FROST_RIDGE.entities.filter(e => e.kind === 'gem').map(e => e.id).sort());
  expect(route.runState.collectedGems.size).toBe(39);
  expect(route.events.filter(e => e.type === 'damage' || e.type === 'recover')).toEqual([]);
  expect(route.events.filter(e => e.type === 'spring')).toHaveLength(3);
  expect(route.springAttempts.map(a => [a.id, a.launches])).toEqual([
    ['frost-bonus-1', 1], ['frost-bonus-2', 1], ['frost-bonus-3', 1],
  ]);
  expect(route.runState.checkpointId).toBe('frost-checkpoint-3');
  for (const landing of route.springAttempts) {
    expect(Math.abs(landing.x - 3140)).toBeGreaterThan(48);
    expect(landing.feet).toBe(surfaceY(FROST_RIDGE, landing.x));
    expect(surfaceAt(FROST_RIDGE, landing.x).material).toBeUndefined();
  }
});
