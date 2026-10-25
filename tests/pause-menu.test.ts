import { expect, it, vi } from 'vitest';
import { PauseMenu } from '../src/game/pause-menu';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };

it('requires a separate confirmation and lets the safe action cancel without resuming', () => {
  const resume = vi.fn(); const leave = vi.fn();
  const menu = new PauseMenu(resume, leave);
  menu.update({ ...neutral, trailsPressed: true });
  expect(menu.confirming).toBe(true);
  expect(menu.targets[0]).toMatchObject({ label: 'Keep playing', selected: true });
  expect(leave).not.toHaveBeenCalled();
  menu.update({ ...neutral, jumpPressed: true });
  expect(menu.confirming).toBe(false);
  expect(resume).not.toHaveBeenCalled();
  menu.update({ ...neutral, trailsPressed: true });
  menu.update(neutral);
  menu.update({ ...neutral, trailsPressed: true });
  expect(leave).toHaveBeenCalledOnce();
});

it('moves controller selection once per direction press and guards held confirm input', () => {
  const leave = vi.fn();
  const menu = new PauseMenu(vi.fn(), leave);
  for (let frame = 0; frame < 10; frame++) menu.update({ ...neutral, horizontal: 1 });
  expect(menu.targets[1].selected).toBe(true);
  menu.update({ ...neutral, horizontal: 1, jumpHeld: true, jumpPressed: true });
  expect(menu.confirming).toBe(true);
  for (let frame = 0; frame < 10; frame++) menu.update({ ...neutral, horizontal: 1, jumpHeld: true });
  expect(menu.targets[0].selected).toBe(true);
  expect(leave).not.toHaveBeenCalled();
  menu.update(neutral);
  menu.update({ ...neutral, horizontal: 1 });
  menu.update({ ...neutral, jumpPressed: true });
  expect(leave).toHaveBeenCalledOnce();
  menu.reset();
  expect(menu.targets[0]).toMatchObject({ label: 'Resume', selected: true });
});

it('keeps focused native button actions aligned with controller selection', () => {
  const resume = vi.fn();
  const menu = new PauseMenu(resume, vi.fn());
  menu.targets[1].focus!();
  menu.update({ ...neutral, jumpPressed: true });
  expect(menu.confirming).toBe(true);
  menu.targets[0].action();
  expect(menu.confirming).toBe(false);
  menu.targets[0].action();
  expect(resume).toHaveBeenCalledOnce();
});

it('keeps all four sound/rumble states independent from navigation selection', () => {
  let sound = true; let rumble = true;
  const menu = new PauseMenu(vi.fn(), vi.fn(), {
    hasRun: () => true, soundEnabled: () => sound, rumbleEnabled: () => rumble,
    toggleSound: () => { sound = !sound; }, toggleRumble: () => { rumble = !rumble; },
  });
  for (const [expectedSound, expectedRumble] of [[true, true], [false, true], [false, false], [true, false]]) {
    expect(menu.targets.find(target => target.label === 'Sound')?.pressed).toBe(expectedSound);
    expect(menu.targets.find(target => target.label === 'Controller rumble')?.pressed).toBe(expectedRumble);
    for (const target of menu.targets) target.focus!();
    expect(menu.targets.find(target => target.label === 'Sound')?.pressed).toBe(expectedSound);
    expect(menu.targets.find(target => target.label === 'Controller rumble')?.pressed).toBe(expectedRumble);
    menu.targets.find(target => target.label === (sound === rumble ? 'Sound' : 'Controller rumble'))!.action();
  }
});

it('offers settings and Resume on the map without a run-reset action or T shortcut', () => {
  const leave = vi.fn();
  const menu = new PauseMenu(vi.fn(), leave, {
    hasRun: () => false, soundEnabled: () => true, rumbleEnabled: () => false,
    toggleSound: vi.fn(), toggleRumble: vi.fn(),
  });
  expect(menu.targets.map(target => target.label)).toEqual(['Resume', 'Sound', 'Controller rumble']);
  menu.update({ ...neutral, trailsPressed: true });
  expect(menu.confirming).toBe(false); expect(leave).not.toHaveBeenCalled();
});
