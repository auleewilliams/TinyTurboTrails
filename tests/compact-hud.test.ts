import { expect, it } from 'vitest';
import { drawCollectionBag, drawGameplayHud, HudPresentation, RIBBON_INTRO, HUD_COLORS, areaName } from '../src/game/hud';
import { EducationSession, TRAIL_WORDS } from '../src/game/education';
import { createRun } from '../src/game/interactions';
import { LEVELS } from '../src/world/levels';
import { SimulationClock } from '../src/core/clock';
import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import type { Player } from '../src/game/movement';

const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
function drawing() {
  const fills: { rect: number[]; color: string }[] = [], texts: string[] = [];
  const ctx = { save() {}, restore() {}, fillStyle: '', fillRect(this: { fillStyle: string }, ...rect: number[]) { fills.push({ rect, color: this.fillStyle }); },
    fillText(text: string) { texts.push(text); }, measureText(text: string) { return { width: text.length * 6 }; } } as unknown as CanvasRenderingContext2D;
  return { ctx, fills, texts };
}

it.each(TRAIL_WORDS)('$id bag has four identity marks independent of placement, including repeated E/L', config => {
  const session = new EducationSession(); session.selectTrail(config.id);
  const assertMarks = (count: number) => {
    const { ctx, fills, texts } = drawing();
    drawCollectionBag(ctx, session);
    const marks = fills.filter(fill => fill.rect[2] === 6 && fill.rect[3] === 6);
    expect(marks).toHaveLength(4);
    expect(marks.filter(mark => mark.color === HUD_COLORS.hit)).toHaveLength(count);
    expect(marks.map(mark => mark.color)).toEqual(config.pickups.map(pickup => session.hasLetter(pickup.id) ? HUD_COLORS.hit : HUD_COLORS.empty));
    expect(texts).toEqual([]);
  };
  assertMarks(0);
  for (const [index, pickup] of [...config.pickups].reverse().entries()) {
    session.collect(pickup.id); session.collect(pickup.id); assertMarks(index + 1);
    expect(session.wordProgress).toBe('_ _ _ _');
  }
  expect(session.place(config.pickups[0].id, 3)).toBe(false); assertMarks(4);
  config.pickups.forEach((pickup, slot) => session.place(pickup.id, slot));
  expect(session.hasWordSticker).toBe(true); assertMarks(4);
  session.selectTrail(config.id === 'plains' ? 'timbers' : 'plains'); session.selectTrail(config.id); assertMarks(4);
});

it('freezes ribbon time through the real pause clock, word activity and results; replay resets it', () => {
  const level = LEVELS[0];
  const scene = new AdventureScene({} as never, {} as never, Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never])), new SilentAudio(), level);
  scene.startSelected();
  const live = scene as unknown as { hud: HudPresentation; player: Player };
  scene.update(1 / 60, { ...neutral, horizontal: 1, jumpPressed: true });
  for (let i = 0; i < 130; i++) scene.update(1 / 60, neutral);
  expect(live.hud.hint).toBe(RIBBON_INTRO);
  const before = JSON.stringify(live.hud);
  const clock = new SimulationClock(); clock.setPaused(true);
  clock.advance(50_000, dt => scene.update(dt, neutral));
  expect(JSON.stringify(live.hud)).toBe(before);
  live.player.x = level.finish.x; scene.update(1 / 60, neutral);
  expect(scene.screenState).toBe('finish');
  const atFinish = JSON.stringify(live.hud);
  scene.update(50, neutral);
  expect(JSON.stringify(live.hud)).toBe(atFinish);
  scene.menuTargets.find(target => target.label === 'Build your word')!.action();
  scene.update(50, neutral);
  expect(JSON.stringify(live.hud)).toBe(atFinish);
  scene.menuTargets.find(target => target.label === 'Leave activity')!.action();
  scene.activateFinish('Replay');
  expect(live.hud).toEqual(new HudPresentation());
});

it('queues a four-active-second ribbon introduction behind teaching, locations and important feedback, once per run', () => {
  const hud = new HudPresentation(), level = LEVELS[0];
  hud.update(1 / 60, neutral, level, level.start.x);
  expect(hud.hint).toBe('Arrows / A-D: move');
  hud.update(1 / 60, { ...neutral, horizontal: 1, source: 'controller' }, level, level.start.x);
  expect(hud.hint).toBe('Buttons 1–4: jump');
  hud.update(1 / 60, { ...neutral, jumpPressed: true }, level, level.start.x);
  expect(hud.hint).toBe(''); // location still owns attention
  hud.update(3, neutral, level, level.start.x, true);
  expect(hud.hint).toBe('');
  hud.update(1 / 60, neutral, level, level.start.x);
  expect(hud.hint).toBe(RIBBON_INTRO);
  hud.update(2, neutral, level, level.start.x);
  hud.update(20, neutral, level, level.start.x, true);
  expect(hud.hint).toBe('');
  hud.update(0, neutral, level, level.start.x); // frozen presentation step
  expect(hud.hint).toBe(RIBBON_INTRO);
  hud.update(1.9, neutral, level, level.start.x);
  expect(hud.hint).toBe(RIBBON_INTRO);
  hud.update(0.2, neutral, level, level.start.x);
  expect(hud.hint).toBe('');
  hud.update(3, neutral, level, level.checkpoints[0].x);
  hud.update(3, neutral, level, level.checkpoints[0].x);
  expect(hud.hint).toBe('');
  const fresh = new HudPresentation();
  fresh.update(3, { ...neutral, horizontal: 1, jumpPressed: true }, level, level.start.x);
  fresh.update(3, neutral, level, level.start.x);
  expect(fresh.hint).toBe(RIBBON_INTRO);
});

it.each(LEVELS)('$id counters retain zero, single/double digits, optional absence and every health state', level => {
  for (const count of [0, 1, 9, 10, 99]) for (const health of [0, 1, 2, 3]) for (const total of [0, 3, 12]) {
    const run = createRun(level); run.collectedGems = new Set(Array.from({ length: count }, (_, i) => `g${i}`));
    run.specialTotal = total; run.collectedSpecials = new Set(Array.from({ length: Math.min(total, count) }, (_, i) => `s${i}`));
    run.health = health; run.healthFlashPip = health < 3 ? health : null; run.healthFlashSeconds = 1;
    const { ctx, texts, fills } = drawing(); drawGameplayHud(ctx, run);
    expect(texts).toEqual(total ? [String(count), `${Math.min(total, count)}/${total}`] : [String(count)]);
    expect(fills.some(fill => fill.color === HUD_COLORS.full)).toBe(health > 0);
    expect(fills.some(fill => fill.color === HUD_COLORS.hit)).toBe(health < 3 || total > 0);
    if (health < 2) expect(fills.some(fill => fill.color === HUD_COLORS.empty)).toBe(true);
  }
});

it('uses authored Cove sections for the opening map/HUD label instead of retired checkpoint labels',()=>{
  const level=LEVELS.find(l=>l.id==='cove')!;
  expect(areaName(level,0)).toBe('Beach dunes');
  expect(areaName(level,3)).toBe('Sheltered bay');
});
