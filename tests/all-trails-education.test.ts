import { ALL_RETURN, MAIN_ROUTE, REASCENT, sunsetPilot } from './sunset-pilot';
import { expect, it } from 'vitest';
import { EducationSession, letterSupportY } from '../src/game/education';
import { LEVELS } from '../src/world/levels';

const words = ['HILL', 'ROCK', 'TREE', 'BEAM', 'SNOW', 'SAND'];

it('keeps all six manual words, repeated identities and stickers independent within one session', () => {
  const session = new EducationSession();
  for (const [index, level] of LEVELS.entries()) {
    session.selectTrail(level.id);
    expect(session.config.word).toBe(words[index]);
    expect(session.letterCount).toBe(0);
    expect(session.wordProgress).toBe('_ _ _ _');
    expect(session.pickups.map(pickup => pickup.letter).join('')).toBe(words[index]);
    expect(new Set(session.pickups.map(pickup => pickup.id)).size).toBe(4);
    expect(session.collect('foreign-letter')).toBe(false);
    const foreign = session.progressFor(LEVELS[(index + 1) % 6].id).config.pickups[0].id;
    expect(session.collect(foreign)).toBe(false);
    expect(session.place(foreign, 0)).toBe(false);
    for (const pickup of [...session.pickups].reverse()) expect(session.collect(pickup.id)).toBe(true);
    expect(session.hasWordSticker).toBe(false);
    expect(session.pile.map(pickup => pickup.letter).join('')).not.toBe(words[index]);
    expect(session.place(session.pickups[3].id, 0)).toBe(false);
    for (const [slot, pickup] of session.pickups.entries()) {
      expect(session.place(pickup.id, slot)).toBe(true);
      expect(session.place(pickup.id, (slot + 1) % 4)).toBe(false);
      expect(session.collect(pickup.id)).toBe(false);
    }
    expect(session.hasWordSticker).toBe(true);
    expect(session.stickers).toHaveLength(index + 1);
  }
  for (const [index, level] of LEVELS.entries()) {
    session.selectTrail(level.id);
    expect(session.wordProgress).toBe([...words[index]].join(' '));
    expect(session.letterCount).toBe(4);
    expect(session.pile).toEqual([]);
  }
  expect(new EducationSession().stickers).toEqual([]);
});

import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import { surfaceY, type Player } from '../src/game/movement';
import { damagePlayer, entityPosition, isEntityActive, recoverFromFall, type RunState } from '../src/game/interactions';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
function adventure(index: number) {
  const scene = new AdventureScene({} as never, {} as never,
    Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never])), new SilentAudio(), LEVELS[index]);
  scene.startSelected();
  return { scene, live: scene as unknown as { player: Player; run: RunState } };
}

/** Results come first: word building opens only through its deliberate finish action. */
function buildYourWord(scene: AdventureScene): void {
  expect(scene.screenState).toBe('finish');
  expect(scene.educationOverlay.open).toBe(false);
  scene.menuTargets.find(target => target.label === 'Build your word')!.action();
  expect(scene.educationOverlay.open).toBe(true);
}

it.each(LEVELS.map((level, index) => ({ level, index })))('$level.id collects its own letters and keeps partial assembly through recovery, finish return, replay and switching', ({ level, index }) => {
  const { scene, live } = adventure(index);
  expect(scene.education.config.id).toBe(level.id);
  expect(scene.educationDescription).toBe('Letter bag: 0/4');
  const first = scene.education.pickups[0];
  Object.assign(live.player, { x: first.x, y: letterSupportY(first, level) - 34, vx: 0, vy: 0, onGround: true });
  scene.update(1 / 60, neutral);
  expect(scene.education.letterCount).toBe(1);
  expect(scene.educationDescription).toContain(`${first.letter} → bag`);
  expect(scene.education.place(first.id, 0)).toBe(true);
  const partial = scene.education.wordProgress;
  recoverFromFall(live.run, live.player, [], level);
  live.run.health = 1; live.run.invulnerableSeconds = 0;
  damagePlayer(live.run, live.player, 1, [], level);
  expect(scene.education.wordProgress).toBe(partial);
  live.player.x = level.finish.x; live.player.y = level.finish.y - 34;
  scene.update(1 / 60, neutral);
  buildYourWord(scene);
  expect(scene.educationOverlay.description).toContain(`Build ${words[index]}`);
  const run = live.run, before = JSON.stringify(run);
  scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
  expect(live.run).toBe(run);
  expect(JSON.stringify(run)).toBe(before);
  expect(scene.session.results.has(level.id)).toBe(true);
  expect(scene.playerX).toBe(level.retrace?.x ?? level.finish.x - 28);
  for (let frame = 0; frame < 40; frame++) scene.update(1 / 60, neutral);
  expect(scene.screenState).toBe('playing');
  for (let frame = 0; frame < 100 && scene.playerX > (level.finish.rearmLeftX ?? level.finish.x - 100); frame++) scene.update(1 / 60, { ...neutral, horizontal: -1 });
  for (let frame = 0; frame < 100 && scene.screenState === 'playing'; frame++) scene.update(1 / 60, { ...neutral, horizontal: 1 });
  buildYourWord(scene);
  expect(scene.education.wordProgress).toBe(partial);
  scene.menuTargets.find(target => target.label === 'Leave activity')!.action();
  expect(scene.menuTargets.map(target => target.label)).toContain('Replay');
  scene.activateFinish('Replay');
  expect(scene.education.wordProgress).toBe(partial);
  scene.returnToTrails(); scene.selectDestination((index + 1) % 6); scene.startSelected();
  expect(scene.education.letterCount).toBe(0);
  expect(scene.education.wordProgress).toBe('_ _ _ _');
  scene.returnToTrails(); scene.selectDestination(index); scene.startSelected();
  expect(scene.education.wordProgress).toBe(partial);
});

it.each(LEVELS.map((level, index) => ({ level, index })))('$level.id exposes mixed accessible identities and matching target letters for pointer and controller assembly', ({ level, index }) => {
  const { scene, live } = adventure(index);
  scene.education.pickups.forEach(pickup => scene.education.collect(pickup.id));
  live.player.x = level.finish.x; live.player.y = level.finish.y - 34; scene.update(1 / 60, neutral);
  buildYourWord(scene);
  const letters = scene.menuTargets.filter(target => target.label.startsWith('Letter '));
  expect(new Set(letters.map(target => target.label)).size).toBe(4);
  expect(new Set(letters.map(target => target.x)).size).toBe(4);
  expect(letters.every(target => target.x >= 111 && target.x <= 267)).toBe(true);
  const texts: string[] = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? (value: string) => texts.push(value) : () => {}, set: () => true }) as CanvasRenderingContext2D;
  scene.educationOverlay.draw(ctx);
  expect(texts).toContain(`BUILD ${words[index]}`);
  for (const [slot, pickup] of scene.education.pickups.entries()) {
    // Pointer drag into the first correct slot, controller select/place for the rest.
    if (!slot) {
      scene.educationOverlay.beginDrag(pickup.id, 132, 132);
      scene.educationOverlay.endDrag(132, 80);
    } else {
      const duplicates = scene.education.pickups.filter(letter => letter.letter === pickup.letter);
      const label = `Letter ${pickup.letter}${duplicates.length > 1 ? ` ${duplicates.indexOf(pickup) + 1}` : ''}`;
      for (const name of [label, `Space ${slot + 1}: empty`]) {
        scene.menuTargets.find(target => target.label === name)!.focus!();
        scene.handleEducationInput(neutral);
        scene.handleEducationInput({ ...neutral, jumpPressed: true, source: 'controller' });
      }
    }
  }
  expect(scene.education.hasWordSticker).toBe(true);
  expect(scene.education.stickers).toHaveLength(1);
  expect(scene.educationOverlay.description).toContain(`${words[index] === 'TREE' ? 'Tree' : words[index]} sticker earned!`);
});

it('shows all six independent sticker statuses on the map without changing trail selection', () => {
  const { scene } = adventure(0);
  scene.education.pickups.forEach((pickup, slot) => { scene.education.collect(pickup.id); scene.education.place(pickup.id, slot); });
  scene.returnToTrails();
  expect(scene.menuTargets.find(target => target.label === 'Open stickers')!.description).toContain('1 of 6 stickers');
  scene.menuTargets.find(target => target.label === 'Open stickers')!.action();
  expect(scene.educationOverlay.title).toBe('Trail stickers');
  expect(scene.educationOverlay.description).toContain('1/6 stickers');
  expect(scene.educationOverlay.description).toContain('Plains HILL: earned');
  expect(scene.educationOverlay.description).toContain('Timbers TREE: find the letters');
  expect(scene.menuTargets.map(target => target.label)).toEqual(['Return to map']);
  const texts: string[] = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? (value: string) => texts.push(value) : () => {}, set: () => true }) as CanvasRenderingContext2D;
  scene.educationOverlay.draw(ctx);
  for (const word of words) expect(texts.some(text => text.endsWith(` ${word}`))).toBe(true);
  scene.handleEducationInput(neutral);
  scene.handleEducationInput({ ...neutral, source: 'controller', jumpPressed: true });
  expect(scene.educationOverlay.open).toBe(false);
  expect(scene.selectedLevelName).toBe(LEVELS[0].name);
});

// Vertical Quarry and Timbers input returns are covered by their route suites; this pilot characterizes horizontal terrain.
it.each(LEVELS.map((level, index) => ({ level, index, crumbled: false })).filter(({ level }) => level.progressAxis !== 'y'))('$level.id retraces the real terrain from finish to every missed letter and re-enters using simulation input only (crumbled: $crumbled)', ({ level, index, crumbled }) => {
  if (level.verticalCamera) {
    // Mixed-height Sunset keeps this cohort's identity, using its fixed-deck
    // input journey instead of the terrain-only horizontal driver below.
    const route = sunsetPilot(); route.run(MAIN_ROUTE);
    expect(route.scene.education.letterCount).toBe(0);
    route.scene.activateFinish('Build your word');
    route.scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
    route.run(ALL_RETURN);
    expect(route.scene.education.letterCount).toBe(4);
    route.run(REASCENT);
    expect(route.scene.screenState).toBe('finish');
    expect(route.events.filter(event => event.type === 'recover')).toEqual([]);
    return;
  }
  const { scene, live } = adventure(index);
  // A completed outward run may already have used every optional crumbling ledge.
  if (crumbled) for (const state of live.run.entities) {
    if (level.entities.some(entity => entity.id === state.id && entity.kind === 'crumbling-ledge')) Object.assign(state, { ledgePhase: 'crumbled', ledgeSeconds: 0 });
  }
  // The sole position fixture is the initial finish. All later movement is ordinary input.
  live.player.x = level.finish.x; live.player.y = level.finish.y - 34;
  scene.update(1 / 60, neutral);
  const run = live.run;
  buildYourWord(scene);
  scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
  const events: { type: string; entityId?: string }[] = [];
  const springs = new Set<string>();
  for (const direction of [-1, 1]) {
    let held = 0;
    for (let frame = 0; frame < 60 * 180 && (direction < 0 ? scene.playerX > 310 : scene.screenState === 'playing'); frame++) {
      const x = scene.playerX;
      const slime = level.entities.some(entity => entity.kind === 'slime' && isEntityActive(live.run, entity.id) && entityPosition(live.run, entity).squashProgress === undefined && (entityPosition(live.run, entity).x - x) * direction > -18 && (entityPosition(live.run, entity).x - x) * direction < 65);
      const rise = surfaceY(level, x + direction * 50) < surfaceY(level, x) - 28;
      const drop = direction < 0 && surfaceY(level, x + direction * 50) > surfaceY(level, x) + 60;
      const jump = live.player.onGround && (slime || rise || drop);
      if (jump) held = 24;
      const target = scene.education.pickups.filter(pickup => !scene.education.hasLetter(pickup.id)).sort((a, b) => (a.x - b.x) * direction)[0];
      const stop = x + Math.sign(live.player.vx) * live.player.vx ** 2 / 2400;
      const horizontal = target && Math.abs(target.x - x) < 120 ? (stop < target.x - 3 ? 1 : stop > target.x + 3 ? -1 : 0) : direction;
      scene.update(1 / 60, { ...neutral, horizontal, jumpPressed: jump, jumpHeld: held-- > 0 });
      const frameEvents = (scene as unknown as { events: { type: string; entityId?: string }[] }).events;
      events.push(...frameEvents);
      for (const event of frameEvents) if (event.type === 'spring') springs.add(event.entityId!);
    }
    if (direction < 0) {
      expect(scene.playerX, `${level.id} reverse stop`).toBeLessThanOrEqual(310);
      console.log(`${level.id} reverse x=${scene.playerX} letters=${scene.education.letterCount} recoveries=${events.filter(event => event.type === 'recover').length}`);
      expect(scene.education.letterCount, `${level.id} missing IDs: ${scene.education.pickups.filter(pickup => !scene.education.hasLetter(pickup.id)).map(pickup => pickup.id)}`).toBe(4);
      expect(scene.education.hasWordSticker).toBe(false);
    }
  }
  expect(scene.screenState).toBe('finish');
  buildYourWord(scene);
  expect(live.run).toBe(run);
  expect(events.filter(event => event.type === 'recover'), `${level.id} recovered`).toEqual([]);
  console.log(`${level.id}: reverse/return complete; ${springs.size} springs, ${events.filter(event => event.type === 'damage').length} damage, ${live.run.collectedGems.size} gems, ${live.run.collectedSpecials.size} stars`);
});

it('allows either independent HILL L in either matching slot without reuse', () => {
  const session = new EducationSession(); session.selectTrail('plains');
  session.pickups.forEach(pickup => session.collect(pickup.id));
  expect(session.place('plains-letter-l2', 2)).toBe(true);
  expect(session.place('plains-letter-l2', 3)).toBe(false);
  expect(session.place('plains-letter-l1', 3)).toBe(true);
  expect(session.wordProgress).toBe('_ _ L L');
  expect(session.stickers).toEqual([]);
});
