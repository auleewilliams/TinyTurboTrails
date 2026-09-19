import { expect, it } from 'vitest';
import { BrowserInput } from '../src/core/input';

it('requires controller release after controls are pressed while unfocused', () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'test', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0], buttons, vibrationActuator: null };
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [pad] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  input.setFocused(false);
  input.poll(); // Neutral frame while away must not release the focus guard.
  pad.axes[0] = 1;
  buttons[0].pressed = true;
  expect(input.poll()).toMatchObject({ horizontal: 0, jumpHeld: false, jumpPressed: false });
  input.setFocused(true);
  expect(input.poll()).toMatchObject({ horizontal: 0, jumpHeld: false, jumpPressed: false });
  pad.axes[0] = 0;
  buttons[0].pressed = false;
  input.poll();
  pad.axes[0] = 1;
  buttons[0].pressed = true;
  expect(input.poll()).toMatchObject({ horizontal: 1, jumpHeld: true, jumpPressed: true });
  expect(input.poll().jumpPressed).toBe(false);
  input.dispose();
});

it('maps a standard controller D-pad, face button and Start to gameplay actions', () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'standard', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0], buttons, vibrationActuator: null };
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [pad] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  pad.axes[0] = -0.75;
  buttons[0].pressed = true;
  buttons[9].pressed = true;
  expect(input.poll()).toMatchObject({ horizontal: -0.75, jumpHeld: true, jumpPressed: true, pausePressed: true });
  buttons[0].pressed = false;
  buttons[9].pressed = false;
  pad.axes[0] = 0;
  expect(input.poll()).toMatchObject({ horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false });
  input.dispose();
});

it('accepts any standard face button (A/B/X/Y) as jump, not just button 0', () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'face-buttons', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0], buttons, vibrationActuator: null };
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [pad] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  for (const index of [1, 2, 3]) {
    buttons[index].pressed = true;
    expect(input.poll()).toMatchObject({ jumpHeld: true, jumpPressed: true });
    buttons[index].pressed = false;
    expect(input.poll()).toMatchObject({ jumpHeld: false, jumpPressed: false });
  }
  input.dispose();
});

it('clears held controller input after disconnect until the controller is released', () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'disconnect', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    axes: [1, 0, 0, 0], buttons, vibrationActuator: null };
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [pad] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  expect(input.poll().horizontal).toBe(1);
  target.dispatchEvent(new Event('gamepaddisconnected'));
  expect(input.poll()).toMatchObject({ horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false });
  pad.axes[0] = 0;
  input.poll();
  pad.axes[0] = 1;
  expect(input.poll().horizontal).toBe(1);
  input.dispose();
});

it('tracks used input rather than mere controller connection, and falls back on disconnect', () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
  const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons };
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => pad.connected ? [pad] : [] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  expect(input.poll().source).toBe('keyboard');
  pad.axes[0] = 0.1;
  expect(input.poll().source).toBe('keyboard');
  pad.axes[0] = 1;
  expect(input.poll().source).toBe('controller');
  pad.axes[0] = 0;
  expect(input.poll().source).toBe('controller');
  const key = Object.assign(new Event('keydown'), { code: 'Space', repeat: false });
  target.dispatchEvent(key);
  expect(input.poll().source).toBe('keyboard');
  buttons[9].pressed = true;
  expect(input.poll().source).toBe('controller');
  pad.connected = false;
  target.dispatchEvent(new Event('gamepaddisconnected'));
  expect(input.poll()).toMatchObject({ source: 'keyboard', jumpHeld: false, horizontal: 0 });
});
