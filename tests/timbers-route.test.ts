import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { TREETOP_TIMBERS } from '../src/world/levels';
import type { Player } from '../src/game/movement';
import type { RunState } from '../src/game/interactions';

const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };

function pilot() {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { timbers: {} as never, plains: {} as never, quarry: {} as never,
      site: {} as never, frost: {} as never, cove: {} as never }, audio, TREETOP_TIMBERS);
  scene.startSelected();
  const player = (scene as unknown as { player: Player }).player;
  const tick = (horizontal = 0, jumpPressed = false, jumpHeld = false) =>
    scene.update(1 / 60, { ...neutral, horizontal, jumpPressed, jumpHeld });
  function walk(x: number, limit = 180): void {
    for (let frame = 0; frame < limit; frame++) {
      const projected = player.x + Math.sign(player.vx) * player.vx ** 2 / 2400;
      if (Math.abs(player.x - x) < 4 && Math.abs(player.vx) < 20) return;
      tick(projected < x - 3 ? 1 : projected > x + 3 ? -1 : 0);
    }
    throw new Error(`walk stalled at ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, target ${x}`);
  }
  function jump(y: number, x: number, heldFrames = 30): void {
    const from = player.y + 34;
    for (let frame = 0; frame < 100; frame++) {
      const projected = player.x + Math.sign(player.vx) * player.vx ** 2 / 2400;
      const horizontal = projected < x - 4 ? 1 : projected > x + 4 ? -1 : 0;
      tick(horizontal, frame === 0, frame < heldFrames);
      if (frame > 8 && player.onGround) {
        if (Math.abs(player.y + 34 - y) < 1) return;
        if (Math.abs(player.y + 34 - from) < 1) throw new Error(`jump missed ${y} from ${from} at x=${player.x.toFixed(1)}`);
      }
    }
    throw new Error(`jump stalled at x=${player.x.toFixed(1)} y=${(player.y + 34).toFixed(1)} aiming ${x},${y}`);
  }
  function drop(edge: number, direction: -1 | 1, y: number, targetX: number): void {
    walk(edge - direction * 24);
    let airborne = false;
    for (let frame = 0; frame < 100; frame++) {
      const projected = player.x + Math.sign(player.vx) * player.vx ** 2 / 2400;
      const horizontal = airborne ? projected < targetX - 4 ? 1 : projected > targetX + 4 ? -1 : 0 : direction;
      tick(horizontal);
      airborne ||= !player.onGround;
      if (airborne && player.onGround) {
        if (Math.abs(player.y + 34 - y) < 1) return;
        throw new Error(`drop at edge ${edge} landed ${(player.y + 34).toFixed(1)}, x=${player.x.toFixed(1)} instead of ${y}`);
      }
    }
    throw new Error(`drop stalled at edge ${edge}, x=${player.x.toFixed(1)} y=${(player.y + 34).toFixed(1)}`);
  }
  return { scene, player, tick, walk, jump, drop };
}

function climbRight(route: ReturnType<typeof pilot>): void {
  const { player, tick, walk, jump } = route;
  for (let i = 0; i < 17; i++) tick(1);
  expect(player.x).toBeLessThan(155);
  jump(1020, 260);
  walk(385); jump(960, 385); jump(900, 385);
  walk(500);
  for (const y of [840, 780, 720, 660]) jump(y, 500);
  walk(400);
  for (const y of [600, 540, 480, 420, 360, 300, 240, 180]) jump(y, 400);
}

function finishAndRetrace(route: ReturnType<typeof pilot>): void {
  const { scene, tick } = route;
  for (let i = 0; i < 80 && scene.screenState === 'playing'; i++) tick(1);
  expect(scene.screenState).toBe('finish');
  scene.activateFinish('Build your word');
  scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
  expect(scene.screenState).toBe('playing');
}

it('reaches the lookout through the right fork with ordinary input and no spring', () => {
  const route = pilot();
  const { scene, tick } = route;
  climbRight(route);
  expect(scene.screenState).toBe('playing');
  expect(scene.education.letterCount).toBe(0);
  for (let i = 0; i < 80 && scene.screenState === 'playing'; i++) tick(1);
  expect(scene.screenState).toBe('finish');
});

it('keeps the lower finish-X crossing inert and gives a standing, short-held jump a broad landing', () => {
  const lower = pilot();
  lower.walk(600);
  expect(lower.scene.screenState).toBe('playing');
  expect(lower.player.y + 34).toBe(1080);
  const route = pilot();
  route.walk(270); route.jump(1020, 270);
  route.walk(385);
  expect(Math.abs(route.player.vx)).toBeLessThan(20);
  route.jump(960, 385, 8);
  expect(route.player.y + 34).toBe(960);
  expect(route.scene.screenState).toBe('playing');
});

it('walks off real return edges from finish to roots and recovers every missed TREE tile', () => {
  const route = pilot();
  const { scene, player, tick, walk, drop } = route;
  const run = (scene as unknown as { run: RunState }).run;
  climbRight(route);
  finishAndRetrace(route);
  expect(scene.education.letterCount).toBe(0);
  expect(player.vx).toBe(0);
  walk(350);
  expect(scene.education.hasLetter('timbers-letter-e2')).toBe(true);
  walk(560);
  expect(scene.screenState).toBe('playing');
  drop(590, 1, 240, 650);
  drop(570, -1, 300, 540);
  drop(660, 1, 360, 690);
  drop(580, -1, 420, 540);
  walk(300);
  expect(scene.education.hasLetter('timbers-letter-e1')).toBe(true);
  walk(510);
  expect(run.checkpointId).toBe('timber-checkpoint-canopy');
  drop(620, 1, 480, 650);
  drop(580, -1, 540, 540);
  drop(660, 1, 600, 690);
  drop(580, -1, 660, 540);
  walk(260);
  expect(run.checkpointId).toBe('timber-checkpoint-middle');
  walk(570);
  drop(620, 1, 720, 650);
  drop(580, -1, 780, 540);
  drop(660, 1, 840, 690);
  drop(470, -1, 900, 440);
  walk(270);
  expect(scene.education.hasLetter('timbers-letter-r')).toBe(true);
  walk(510);
  expect(run.checkpointId).toBe('timber-checkpoint-fork');
  drop(620, 1, 960, 650);
  drop(580, -1, 1020, 540);
  for (let i = 0; i < 100 && player.y + 34 < 1080; i++) tick(-1);
  expect(player.y + 34).toBe(1080);
  walk(180);
  expect(scene.education.hasLetter('timbers-letter-t')).toBe(true);
  expect(scene.education.letterCount).toBe(4);
  expect(scene.session.results.has('timbers')).toBe(true);
  // From this same finished run, retry all three optional stars on the climb back.
  walk(270);
  route.jump(1020, 270);
  walk(255); route.jump(960, 175); walk(115);
  expect(scene.specialTotal).toBe(1);
  drop(230, 1, 1020, 270);
  walk(385); route.jump(960, 385); route.jump(900, 385);
  walk(500);
  for (const y of [840, 780, 720, 660]) route.jump(y, 500);
  walk(260);
  expect(run.checkpointId).toBe('timber-checkpoint-middle');
  walk(100);
  for (let frame = 0; frame < 180; frame++) {
    tick(0, frame === 0, frame < 30);
    if (scene.specialTotal === 2 && player.onGround && player.y + 34 === 510) break;
  }
  expect(scene.specialTotal).toBe(2);
  walk(180); drop(200, 1, 540, 230); drop(280, 1, 600, 310);
  walk(400);
  for (const y of [540, 480, 420]) route.jump(y, 400);
  walk(500);
  expect(run.checkpointId).toBe('timber-checkpoint-canopy');
  walk(400);
  for (const y of [360, 300]) route.jump(y, 400);
  walk(245); route.jump(300, 150); walk(110);
  expect(scene.specialTotal).toBe(3);
  drop(200, 1, 360, 230); route.jump(300, 280);
  walk(400);
  for (const y of [240, 180]) route.jump(y, 400);
  for (let i = 0; i < 80 && scene.screenState === 'playing'; i++) tick(1);
  expect(scene.screenState).toBe('finish');
  expect(scene.education.letterCount).toBe(4);
  expect(scene.specialTotal).toBe(3);
  expect(scene.session.results.has('timbers')).toBe(true);
});

it('catches a wrong-end return walk-off on the next visible outer bough', () => {
  const route = pilot();
  climbRight(route);
  finishAndRetrace(route);
  route.drop(590, 1, 240, 650);
  route.drop(740, 1, 300, 780);
  expect(route.player.y + 34).toBe(300);
  route.drop(700, -1, 360, 680);
  expect(route.player.y + 34).toBe(360);
});

it('allows the only-missed-summit-E flow to rearm by a deliberate lookout turn', () => {
  const route = pilot();
  const { scene, walk, tick } = route;
  walk(180);
  expect(scene.education.hasLetter('timbers-letter-t')).toBe(true);
  walk(270); route.jump(1020, 270);
  walk(385); route.jump(960, 385); route.jump(900, 385);
  walk(270);
  expect(scene.education.hasLetter('timbers-letter-r')).toBe(true);
  walk(500);
  for (const y of [840, 780, 720, 660]) route.jump(y, 500);
  walk(400);
  for (const y of [600, 540, 480, 420]) route.jump(y, 400);
  walk(300);
  expect(scene.education.hasLetter('timbers-letter-e1')).toBe(true);
  walk(400);
  for (const y of [360, 300, 240, 180]) route.jump(y, 400);
  finishAndRetrace(route);
  expect(scene.education.letterCount).toBe(3);
  walk(350);
  expect(scene.education.letterCount).toBe(4);
  walk(290);
  for (let i = 0; i < 100 && scene.screenState === 'playing'; i++) tick(1);
  expect(scene.screenState).toBe('finish');
});

it('climbs the left fork and visits the low and upper side stars with local catches', () => {
  const route = pilot();
  const { scene, player, tick, walk, jump, drop } = route;
  for (let i = 0; i < 17; i++) tick(1);
  jump(1020, 260);
  walk(255); jump(960, 175); walk(115);
  expect(scene.specialTotal).toBe(1);
  drop(230, 1, 1020, 270);
  walk(385); jump(960, 385); jump(900, 385);
  walk(340); jump(840, 340); jump(780, 340);
  walk(430); jump(720, 440); jump(660, 440);
  walk(400);
  for (const y of [600, 540, 480, 420, 360, 300]) jump(y, 400);
  walk(245); jump(300, 150); walk(110);
  expect(scene.specialTotal).toBe(2);
  drop(200, 1, 360, 230);
  jump(300, 280);
  expect(player.x).toBeGreaterThan(225);
  walk(400); jump(240, 400); jump(180, 400);
  for (let i = 0; i < 80 && scene.screenState === 'playing'; i++) tick(1);
  expect(scene.screenState).toBe('finish');
});

it('takes the optional branch spring, clears its overhead reward and lands beside it', () => {
  const route = pilot();
  const { scene, player, tick, walk, jump, drop } = route;
  for (let i = 0; i < 17; i++) tick(1);
  jump(1020, 260);
  walk(385); jump(960, 385); jump(900, 385);
  walk(500);
  for (const y of [840, 780, 720, 660]) jump(y, 500);
  walk(100);
  let launched = false, rewarded = false;
  for (let frame = 0; frame < 180; frame++) {
    tick(0, frame === 0, frame < 30);
    launched ||= player.vy < -550 && player.y + 34 < 610;
    rewarded ||= scene.specialTotal > 0;
    if (rewarded && player.onGround && Math.abs(player.y + 34 - 510) < 1) break;
  }
  expect(launched).toBe(true);
  expect(rewarded).toBe(true);
  expect(player.y + 34).toBe(510);
  walk(180);
  drop(200, 1, 540, 230);
  expect(player.y + 34).toBe(540);
  expect(player.x).toBeGreaterThan(205);
  // The clear catch has no spring underfoot and allows a repeat approach.
  expect(player.vy).toBe(0);
  drop(280, 1, 600, 310);
  expect(player.y + 34).toBe(600);
});
