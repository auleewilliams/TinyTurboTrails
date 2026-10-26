import { expect, it, vi } from 'vitest';
import { SilentAudio } from '../src/core/audio';
import { EFFECTS } from '../src/core/audio-effects';
import { AdventureScene } from '../src/game/adventure-scene';
import { GameplayPreviewScene } from '../src/game/gameplay-preview';
import type { Player } from '../src/game/movement';
import { entityState, type RunState } from '../src/game/interactions';
import { LEVELS } from '../src/world/levels';
import type { Feedback } from '../src/game/feedback';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
const worlds = Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never]));

it.each(LEVELS)('$name adventure and preview emit one soft squish, no reward or damage', level => {
  for (const preview of [false, true]) {
    const audio = new SilentAudio(), play = vi.spyOn(audio, 'play');
    const scene = preview ? new GameplayPreviewScene({} as never, {} as never, audio, level)
      : new AdventureScene({} as never, {} as never, worlds, audio, level);
    if (scene instanceof AdventureScene) { scene.startSelected(); scene.update(1 / 60, neutral); }
    const live = scene as unknown as { player: Player; run: RunState; feedback: Feedback };
    const slime = level.entities.find(entity => entity.kind === 'slime')!;
    const state = entityState(live.run, slime.id)!;
    Object.assign(live.player, { x: state.x, y: state.y - 56, vx: 0, vy: 200, onGround: false, coyoteSeconds: 0 });
    play.mockClear();
    scene.update(1 / 60, neutral);
    expect(play.mock.calls).toEqual([['squash']]);
    expect(live.run.health).toBe(3);
    expect(state.squashed).toBe(true);
    expect(live.feedback.effects).toEqual([]);
    const rewards = [live.run.collectedGems.size, live.run.collectedSpecials.size];
    for (let frame = 0; frame < 75; frame++) scene.update(1 / 60, neutral);
    expect(play.mock.calls.filter(([effect]) => effect === 'squash')).toHaveLength(1);
    expect([live.run.collectedGems.size, live.run.collectedSpecials.size]).toEqual(rewards);
  }
});

it('does not add a terrain landing thump when a fast fall actually squashes first', () => {
  const level = LEVELS[0];
  for (const preview of [false, true]) {
    const audio = new SilentAudio(), play = vi.spyOn(audio, 'play');
    const scene = preview ? new GameplayPreviewScene({} as never, {} as never, audio, level)
      : new AdventureScene({} as never, {} as never, worlds, audio, level);
    if (scene instanceof AdventureScene) { scene.startSelected(); scene.update(1 / 60, neutral); }
    const live = scene as unknown as { player: Player; run: RunState; feedback: Feedback };
    const state = entityState(live.run, level.entities.find(e => e.kind === 'slime')!.id)!;
    Object.assign(live.player, { x: state.x, y: state.y - 110, vx: 0, vy: 1000, onGround: false, coyoteSeconds: 0 });
    play.mockClear(); scene.update(0.1, neutral);
    expect(play.mock.calls).toEqual([['squash']]);
    expect(live.feedback.effects).toEqual([]);
    expect(live.run.health).toBe(3);
  }
});

it('scores squish as a short rounded quiet effect rather than a damage or reward cue', () => {
  expect(EFFECTS.squash.volume).toBeLessThanOrEqual(0.15);
  expect(EFFECTS.squash.volume).toBeLessThan(EFFECTS.gem.volume);
  expect(EFFECTS.squash.tones.every(tone => tone[2] === 'sine' || tone[2] === 'triangle')).toBe(true);
  expect(EFFECTS.squash.tones.reduce((sum, tone) => sum + tone[1], 0)).toBeLessThan(0.2);
});
