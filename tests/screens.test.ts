import { describe, expect, it } from 'vitest';
import { BrowserInput } from '../src/core/input';
import { createPlayer } from '../src/game/movement';
import { GameplayPreviewScene } from '../src/game/gameplay-preview';
import { AdventureScene } from '../src/game/adventure-scene';
import type { GameAudio } from '../src/core/audio';
import { PLAINS_LEVEL } from '../src/world/level';
import { QUARRY_RUN, SANDY_COVE } from '../src/world/levels';
import { ScreenController } from '../src/game/screens';

const alternateLevel = { ...PLAINS_LEVEL,
  id: 'alternate', name: 'ALTERNATE', start: { x: 120, y: 198 },
  finish: { ...PLAINS_LEVEL.finish, x: 180 },
};
const worlds = { plains: {} as never, timbers: {} as never, frost: {} as never, cove: {} as never };

function silentAudio(): GameAudio {
  return {
    unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
    play: () => {}, stop: () => {}, dispose: () => {},
  };
}

describe('game screen flow', () => {
  it('starts the adventure from the supplied level data', () => {
    const audio: GameAudio = {
      unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
      play: () => {}, stop: () => {}, dispose: () => {},
    };
    const scene = new AdventureScene({} as never, worlds, audio, alternateLevel);
    expect(scene.playerX).toBe(alternateLevel.start.x);
  });

  it('selects one level per horizontal input edge and starts the selection', () => {
    const audio: GameAudio = {
      unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
      play: () => {}, stop: () => {}, dispose: () => {},
    };
    const scene = new AdventureScene({} as never, worlds, audio, PLAINS_LEVEL);
    const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
    expect(scene.selectedLevelName).toBe('PLAINS');
    scene.update(1 / 60, { ...neutral, horizontal: 1 });
    expect(scene.selectedLevelName).toBe(QUARRY_RUN.name);
    scene.update(1 / 60, { ...neutral, horizontal: 1 });
    expect(scene.selectedLevelName).toBe(QUARRY_RUN.name);
    scene.update(1 / 60, neutral);
    scene.update(1 / 60, { ...neutral, horizontal: -1 });
    expect(scene.selectedLevelName).toBe('PLAINS');
    scene.update(1 / 60, neutral);
    scene.update(1 / 60, { ...neutral, horizontal: -1 });
    expect(scene.selectedLevelName).toBe(SANDY_COVE.name);
    (scene as unknown as { run: { health: number } }).run.health = 1;
    scene.update(1 / 60, { ...neutral, jumpPressed: true });
    expect(scene.screenState).toBe('playing');
    expect(scene.playerX).toBe(SANDY_COVE.start.x);
    expect((scene as unknown as { run: { health: number } }).run.health).toBe(3);
  });

  it('starts the supplied registered level without requiring picker input', () => {
    const audio: GameAudio = {
      unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
      play: () => {}, stop: () => {}, dispose: () => {},
    };
    const scene = new AdventureScene({} as never, worlds, audio, QUARRY_RUN);
    const input = { horizontal: 0, jumpHeld: false, jumpPressed: true, pausePressed: false, mutePressed: false };
    expect(scene.selectedLevelName).toBe(QUARRY_RUN.name);
    scene.update(1 / 60, input);
    expect(scene.screenState).toBe('playing');
    expect(scene.playerX).toBe(QUARRY_RUN.start.x);
  });

  it('rejects a world asset map that cannot render every picker level', () => {
    const audio: GameAudio = {
      unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
      play: () => {}, stop: () => {}, dispose: () => {},
    };
    expect(() => new AdventureScene({} as never, { plains: {} } as never, audio, PLAINS_LEVEL))
      .toThrow('Missing world assets: timbers');
  });

  it('does not advance the picker when replaying with a held direction', () => {
    const audio: GameAudio = {
      unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
      play: () => {}, stop: () => {}, dispose: () => {},
    };
    const scene = new AdventureScene({} as never, worlds, audio, PLAINS_LEVEL);
    const input = { horizontal: 0, jumpHeld: false, jumpPressed: true, pausePressed: false, mutePressed: false };
    scene.update(1 / 60, input);
    (scene as unknown as { player: { x: number } }).player.x = PLAINS_LEVEL.finish.x;
    scene.update(1 / 60, { ...input, jumpPressed: false });
    scene.update(1 / 60, { ...input, horizontal: 1 });
    expect(scene.screenState).toBe('title');
    expect(scene.selectedLevelName).toBe(PLAINS_LEVEL.name);
    scene.update(1 / 60, { ...input, jumpPressed: false, horizontal: 1 });
    expect(scene.selectedLevelName).toBe(PLAINS_LEVEL.name);
  });

  it('plays the completion effect once when the adventure reaches the finish', () => {
    const effects: string[] = [];
    let stops = 0;
    const audio: GameAudio = {
      unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
      play: (effect) => effects.push(effect), stop: () => { stops++; }, dispose: () => {},
    };
    const scene = new AdventureScene({} as never, worlds, audio, PLAINS_LEVEL);
    scene.enter();
    scene.update(1 / 60, { horizontal: 0, jumpHeld: false, jumpPressed: true, pausePressed: false, mutePressed: false });
    scene.update(1 / 60, { horizontal: 0, jumpHeld: true, jumpPressed: true, pausePressed: false, mutePressed: false });
    expect(effects.filter((effect) => effect === 'jump')).toHaveLength(1);
    (scene as unknown as { player: { x: number } }).player.x = PLAINS_LEVEL.finish.x;
    scene.update(1 / 60, { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false });
    scene.update(1 / 60, { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false });
    expect(effects.filter((effect) => effect === 'complete')).toHaveLength(1);
    scene.exit();
    expect(stops).toBe(1);
  });

  it('moves title through loading and gameplay, then finish and replay', () => {
    const screens = new ScreenController();
    expect(screens.state).toBe('title');
    screens.start();
    expect(screens.state).toBe('loading');
    screens.loaded();
    expect(screens.state).toBe('playing');
    screens.pause();
    expect(screens.state).toBe('paused');
    screens.resume();
    screens.complete(7);
    expect(screens.state).toBe('finish');
    expect(screens.gems).toBe(7);
    screens.replay();
    expect(screens.state).toBe('title');
  });
  it('keeps loading errors readable and retryable', () => {
    const screens = new ScreenController();
    screens.start();
    screens.fail('Atlas missing');
    expect(screens.state).toBe('error');
    expect(screens.error).toBe('Atlas missing');
    screens.retry();
    expect(screens.state).toBe('loading');
  });
  it('does not advance simulation while paused or on non-gameplay screens', () => {
    const screens = new ScreenController();
    let updates = 0;
    screens.update(() => updates++);
    screens.start(); screens.loaded(); screens.update(() => updates++);
    screens.pause(); screens.update(() => updates++);
    screens.resume(); screens.update(() => updates++);
    screens.complete(0); screens.update(() => updates++);
    expect(updates).toBe(2);
  });
});

// Exercise the adventure's actual proximity checks while walking, without jumping.
it.each(PLAINS_LEVEL.checkpoints)('activates $id from the ground', (checkpoint) => {
  const effects: string[] = [];
  const audio: GameAudio = {
    unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
    play: (effect) => effects.push(effect), stop: () => {}, dispose: () => {},
  };
  const scene = new AdventureScene({} as never, worlds, audio, PLAINS_LEVEL);
  const input = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
  scene.update(1 / 60, { ...input, horizontal: 0, jumpPressed: true });
  Object.assign(scene, { player: createPlayer(checkpoint.x - 50, PLAINS_LEVEL) });
  for (let frame = 0; frame < 40; frame++) scene.update(1 / 60, { ...input, horizontal: 1 });
  expect(scene.playerX).toBeGreaterThan(checkpoint.x);
  expect(effects.filter((effect) => effect === 'checkpoint')).toHaveLength(1);
});

it('returns to the latest checkpoint after three unavoided hits', () => {
  const effects: string[] = [];
  const audio: GameAudio = {
    unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
    play: (effect) => effects.push(effect), stop: () => {}, dispose: () => {},
  };
  const scene = new AdventureScene({} as never, worlds, audio, PLAINS_LEVEL);
  const input = { horizontal: 1, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
  scene.update(1 / 60, { ...input, horizontal: 0, jumpPressed: true });
  for (let frame = 0; frame < 60 * 30 && effects.filter((effect) => effect === 'damage').length < 3; frame++) {
    scene.update(1 / 60, input);
  }
  const run = (scene as unknown as { run: import('../src/game/interactions').RunState }).run;
  const checkpoint = PLAINS_LEVEL.checkpoints[0];
  expect(effects.filter((effect) => effect === 'damage')).toHaveLength(3);
  expect(run.checkpointId).toBe(checkpoint.id);
  expect(scene.playerX).toBe(checkpoint.x);
  expect(run.health).toBe(3);
  expect(scene.screenState).toBe('playing');
});

it.each(['keyboard', 'controller'])('%s replay immediately restores the initial camera and fresh player/run state', (device) => {
  const audio: GameAudio = {
    unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
    play: () => {}, stop: () => {}, dispose: () => {},
  };
  const scene = new AdventureScene({} as never, worlds, audio, PLAINS_LEVEL);
  const state = scene as unknown as {
    player: import('../src/game/movement').Player;
    run: import('../src/game/interactions').RunState;
    camera: import('../src/world/camera').Camera;
  };
  const initialCamera = state.camera.position;
  const input = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
  scene.update(1 / 60, { ...input, jumpPressed: true });
  state.run.collectedGems.add('gem-001');
  state.run.entities.find((entity) => entity.id === 'gem-001')!.active = false;
  state.run.checkpointId = 'checkpoint-meadow';
  state.run.invulnerableSeconds = 1;
  state.run.health = 1;
  state.run.healthFlashSeconds = 0.2;
  state.player.x = PLAINS_LEVEL.finish.x;
  state.player.vx = 100;
  state.player.vy = -100;
  scene.update(1 / 60, input);
  expect(scene.screenState).toBe('finish');
  expect(state.camera.position.x).toBeGreaterThan(0);
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { connected: true, mapping: 'standard', axes: [0], buttons };
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [pad] } });
  const controls = new BrowserInput(target as unknown as Window, () => {});
  if (device === 'controller') buttons[0].pressed = true;
  else target.dispatchEvent(Object.assign(new Event('keydown'), { code: 'Space', repeat: false }));
  scene.update(1 / 60, controls.poll());
  controls.dispose();
  expect(scene.screenState).toBe('title');
  expect(state.camera.position).toEqual(initialCamera);
  expect(state.player).toEqual(createPlayer(PLAINS_LEVEL.start.x, PLAINS_LEVEL));
  expect(state.run.collectedGems.size).toBe(0);
  expect(state.run.checkpointId).toBeNull();
  expect(state.run.invulnerableSeconds).toBe(0);
  expect(state.run.health).toBe(3);
  expect(state.run.healthFlashSeconds).toBe(0);
  expect(state.run.entities.every((entity) => entity.active)).toBe(true);
});

it.each([
  ['adventure', () => new AdventureScene({} as never, worlds, silentAudio(), PLAINS_LEVEL)],
  ['gameplay preview', () => new GameplayPreviewScene({} as never, {} as never, silentAudio(), PLAINS_LEVEL)],
] as const)('the %s scene respawns on the last pip through shared health logic', (_name, createScene) => {
  const scene = createScene();
  const input = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
  if (scene instanceof AdventureScene) scene.update(1 / 60, { ...input, jumpPressed: true });
  const state = scene as unknown as {
    player: import('../src/game/movement').Player;
    run: import('../src/game/interactions').RunState;
  };
  const checkpoint = PLAINS_LEVEL.checkpoints[0];
  const hazard = PLAINS_LEVEL.entities.find((entity) => entity.kind === 'hazard')!;
  state.run.checkpointId = checkpoint.id;
  state.run.health = 1;
  Object.assign(state.player, createPlayer(hazard.x, PLAINS_LEVEL));
  scene.update(1 / 60, input);
  expect(state.player.x).toBe(checkpoint.x);
  expect(state.run.health).toBe(3);
});

for (const SceneClass of [AdventureScene, GameplayPreviewScene]) {
  it.each([0, 0.25, 1])(`${SceneClass.name} launches once per contact at input %s`, (horizontal) => {
    const effects: string[] = [];
    const audio: GameAudio = {
      unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
      play: (effect) => effects.push(effect), stop: () => {}, dispose: () => {},
    };
    const scene = SceneClass === AdventureScene
      ? new AdventureScene({} as never, worlds, audio, PLAINS_LEVEL)
      : new GameplayPreviewScene({} as never, {} as never, audio, PLAINS_LEVEL);
    const input = { horizontal, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
    if (scene instanceof AdventureScene) scene.update(1 / 60, { ...input, horizontal: 0, jumpPressed: true });
    const spring = PLAINS_LEVEL.entities.find((entity) => entity.id === 'spring-001')!;
    const henry = createPlayer(spring.x, PLAINS_LEVEL);
    henry.vx = horizontal * 200;
    Object.assign(scene, { player: henry });
    for (let frame = 0; frame < 3; frame++) scene.update(1 / 60, input);
    expect(effects.filter((effect) => effect === 'spring')).toHaveLength(1);
    expect(henry.vy).toBeGreaterThan(-620);
    // Leave the contact window, then land on the same spring again.
    henry.x = spring.x - 100;
    scene.update(1 / 60, input);
    Object.assign(henry, createPlayer(spring.x, PLAINS_LEVEL));
    scene.update(1 / 60, input);
    expect(effects.filter((effect) => effect === 'spring')).toHaveLength(2);
    expect(henry.vy).toBe(-620);
  });
}
