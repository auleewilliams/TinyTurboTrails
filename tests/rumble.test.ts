import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRumble } from '../src/core/rumble';
import { BrowserInput } from '../src/core/input';
import { SilentAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import { LEVELS } from '../src/world/levels';
import type { Player } from '../src/game/movement';
import type { LevelData } from '../src/world/level';
import type { RunState } from '../src/game/interactions';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
function setup() {
  const actuator = { playEffect: vi.fn().mockResolvedValue('complete'), reset: vi.fn().mockResolvedValue('complete') };
  const pad = { connected: true, mapping: 'standard' as const, index: 0, vibrationActuator: actuator };
  const rumble = new BrowserRumble();
  rumble.setController(pad, 'controller');
  rumble.setGameplay(true);
  return { rumble, pad, actuator };
}

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('browser rumble', () => {
  it('plays distinct short damage, rising spring and star effects, dropping rapid repeats', () => {
    const { rumble, actuator } = setup();
    rumble.play('damage');
    for (let i = 0; i < 50; i++) rumble.play('damage');
    vi.advanceTimersByTime(299);
    rumble.play('star');
    expect(actuator.playEffect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    rumble.play('spring');
    expect(actuator.playEffect).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(45);
    expect(actuator.playEffect).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(255);
    rumble.play('star');
    const pulses = actuator.playEffect.mock.calls.map(([, parameters]) => parameters);
    expect(pulses.map(pulse => pulse.duration)).toEqual([100, 45, 70, 45]);
    expect(pulses[2].strongMagnitude).toBeGreaterThan(pulses[1].strongMagnitude);
    expect(pulses[2].weakMagnitude).toBeGreaterThan(pulses[1].weakMagnitude);
    expect(pulses[0].strongMagnitude).toBeGreaterThan(pulses[2].strongMagnitude);
    expect(pulses[3].strongMagnitude).toBeLessThan(pulses[1].strongMagnitude);
    expect(pulses.every(pulse => pulse.startDelay === 0 && pulse.duration <= 100)).toBe(true);
  });

  it.each(['pause', 'off', 'map', 'keyboard', 'disconnect', 'switch'])(
    'stops immediately and cancels a scheduled spring rise on %s', mode => {
      const { rumble, pad, actuator } = setup();
      rumble.play('spring');
      if (mode === 'pause') rumble.setSuspended(true);
      else if (mode === 'off') rumble.setEnabled(false);
      else if (mode === 'map') rumble.setGameplay(false);
      else if (mode === 'keyboard') rumble.setController(pad, 'keyboard');
      else if (mode === 'disconnect') rumble.setController(null, 'keyboard');
      else rumble.setController({ ...pad, index: 1, vibrationActuator: null }, 'controller');
      expect(actuator.reset).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1000);
      rumble.play('star');
      expect(actuator.playEffect).toHaveBeenCalledTimes(1);
    });

  it('stays silent for idle attached pads, nonstandard pads, missing actuators and stale disconnected pads', () => {
    const { rumble, pad, actuator } = setup();
    rumble.setController(pad, 'keyboard'); rumble.play('damage');
    rumble.setController({ ...pad, mapping: '' }, 'controller'); rumble.play('damage');
    rumble.setController({ ...pad, vibrationActuator: null }, 'controller'); rumble.play('damage');
    rumble.setController(pad, 'controller'); pad.connected = false; rumble.play('damage');
    expect(actuator.playEffect).not.toHaveBeenCalled();
  });

  it('supports pulse-only actuators and stops them when reset is absent', () => {
    const { rumble } = setup();
    const pulse = vi.fn();
    rumble.setController({ connected: true, mapping: 'standard', index: 0, hapticActuators: [{ pulse }] }, 'controller');
    rumble.play('star');
    expect(pulse).toHaveBeenCalledWith(0.45, 45);
    rumble.stop();
    expect(pulse).toHaveBeenLastCalledWith(0, 0);
  });

  it('drops a spring rise delayed by a stalled browser and uses zero output when reset is absent', () => {
    const { rumble, actuator } = setup();
    rumble.play('spring');
    vi.spyOn(performance, 'now').mockReturnValue(200);
    vi.advanceTimersByTime(45);
    expect(actuator.playEffect).toHaveBeenCalledTimes(1);
    const playEffect = vi.fn();
    rumble.setController({ connected: true, mapping: 'standard', index: 0, vibrationActuator: { playEffect } }, 'controller');
    vi.mocked(performance.now).mockReturnValue(300);
    rumble.play('damage'); rumble.stop();
    expect(playEffect).toHaveBeenLastCalledWith('dual-rumble', { duration: 0, startDelay: 0, strongMagnitude: 0, weakMagnitude: 0 });
  });

  it('an overdue spring callback cannot erase a newer timer or pulse a replacement controller', () => {
    const { rumble, pad, actuator } = setup();
    const callbacks: (() => void)[] = [];
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => {
      callbacks.push(callback);
      return callbacks.length;
    }) as unknown as typeof setTimeout);
    const cancel = vi.spyOn(globalThis, 'clearTimeout').mockImplementation(() => {});
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    rumble.play('spring');
    now.mockReturnValue(400); rumble.play('spring');
    now.mockReturnValue(401); callbacks[0]();
    const replacement = { playEffect: vi.fn() };
    rumble.setController({ ...pad, index: 1, vibrationActuator: replacement }, 'controller');
    expect(cancel).toHaveBeenLastCalledWith(2);
    now.mockReturnValue(445); callbacks[1]();
    expect(actuator.playEffect).toHaveBeenCalledTimes(2);
    expect(replacement.playEffect).not.toHaveBeenCalled();
  });

  it('silently handles actuator getters, synchronous failures and rejected promises', async () => {
    const { rumble, pad, actuator } = setup();
    actuator.playEffect.mockImplementationOnce(() => { throw new Error('unsupported'); });
    expect(() => rumble.play('damage')).not.toThrow();
    vi.advanceTimersByTime(300);
    actuator.playEffect.mockRejectedValueOnce(new Error('disconnected'));
    actuator.reset.mockRejectedValueOnce(new Error('reset unsupported'));
    rumble.play('star'); rumble.stop();
    await Promise.resolve(); await Promise.resolve();
    vi.advanceTimersByTime(300);
    actuator.reset.mockImplementationOnce(() => { throw new Error('reset failed'); });
    rumble.play('damage');
    expect(() => rumble.stop()).not.toThrow();
    expect(() => rumble.setController({ ...pad, get vibrationActuator(): never { throw new Error('unsupported property'); } }, 'controller')).not.toThrow();
  });

  it('uses the pad polled by BrowserInput and clears output on blur, disconnect and disposal', () => {
    const { pad, actuator } = setup();
    const live = { ...pad, axes: [1, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
    const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [live] } });
    const input = new BrowserInput(target as unknown as Window, () => {});
    input.rumble.setGameplay(true);
    for (const mode of ['blur', 'disconnect', 'dispose']) {
      live.axes[0] = 0; input.poll(); live.axes[0] = 1; input.poll();
      input.rumble.play('spring');
      if (mode === 'blur') input.setFocused(false);
      else if (mode === 'disconnect') target.dispatchEvent(new Event('gamepaddisconnected'));
      else input.dispose();
      vi.advanceTimersByTime(300);
      input.setFocused(true);
    }
    expect(actuator.playEffect).toHaveBeenCalledTimes(3);
    expect(actuator.reset).toHaveBeenCalledTimes(3);
  });
});

describe('adventure rumble triggers', () => {
  function adventure() {
    const audio = new SilentAudio();
    const sound = vi.spyOn(audio, 'play');
    const rumble = { play: vi.fn(), stop: vi.fn() };
    const worlds = Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never]));
    const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds, audio, LEVELS[0], undefined, undefined, rumble);
    scene.startSelected();
    const live = scene as unknown as { player: Player; run: RunState; level: LevelData };
    return { scene, live, sound, rumble };
  }

  it.each([['slime', 'damage', 'damage'], ['spring', 'spring', 'spring'], ['special', 'star', 'gem']] as const)(
    'pairs %s with its existing run-event sound', (kind, effect, soundEffect) => {
      const { scene, live, sound, rumble } = adventure();
      live.level = { ...live.level, checkpoints: [], entities: [{ id: 'contact', kind, x: live.player.x, y: live.player.y + 34, asset: kind, layer: 'world' }] };
      live.run.entities = [{ id: 'contact', active: true, x: live.player.x, y: live.player.y + 34, direction: 1 }];
      scene.update(1 / 60, neutral);
      expect(rumble.play).toHaveBeenCalledExactlyOnceWith(effect);
      expect(sound).toHaveBeenCalledWith(soundEffect);
      scene.update(1 / 60, neutral);
      expect(rumble.play).toHaveBeenCalledTimes(1);
    });

  it('static obstacle passage produces no damage sound or rumble', () => {
    const { scene, live, sound, rumble } = adventure();
    live.level = { ...live.level, checkpoints: [], entities: [{ id: 'prop', kind: 'hazard', x: live.player.x, y: live.player.y + 34, asset: 'stone', layer: 'world' }] };
    live.run.entities = [{ id: 'prop', active: true, x: live.player.x, y: live.player.y + 34, direction: 1 }];
    scene.update(1 / 60, neutral);
    expect(rumble.play).not.toHaveBeenCalled();
    expect(sound).not.toHaveBeenCalledWith('damage');
    expect(live.run.health).toBe(3);
  });

  it('does not rumble on ordinary movement, gems, map or finish; stops output on exit', () => {
    const { scene, live, rumble } = adventure();
    for (let i = 0; i < 40; i++) scene.update(1 / 60, { ...neutral, horizontal: 1, jumpPressed: i === 2, jumpHeld: i < 4 });
    expect(rumble.play).not.toHaveBeenCalled();
    live.player.x = live.level.finish.x;
    scene.update(1 / 60, neutral);
    expect(scene.screenState).toBe('finish');
    expect(rumble.stop).toHaveBeenCalled();
    scene.activateFinish('Choose trail'); scene.update(1 / 60, neutral);
    expect(scene.screenState).toBe('title');
    expect(rumble.play).not.toHaveBeenCalled();
    rumble.stop.mockClear(); scene.exit();
    expect(rumble.stop).toHaveBeenCalledOnce();
  });
});
