import { expect, it } from 'vitest';
import { BrowserInput } from '../src/core/input';

it('combines independent touch fingers, retains a short jump edge and only emits it once', () => {
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [] } });
  let interactions = 0;
  const input = new BrowserInput(target as unknown as Window, () => { interactions++; });
  input.pressTouch(10, 'right');
  input.pressTouch(20, 'jump');
  expect(input.poll()).toMatchObject({ source: 'touch', horizontal: 1, jumpHeld: true, jumpPressed: true });
  expect(input.poll()).toMatchObject({ source: 'touch', horizontal: 1, jumpHeld: true, jumpPressed: false });
  input.releaseTouch(20);
  expect(input.poll()).toMatchObject({ horizontal: 1, jumpHeld: false });
  input.pressTouch(30, 'jump'); input.releaseTouch(30);
  expect(input.poll()).toMatchObject({ jumpPressed: true, jumpHeld: false });
  expect(input.poll().jumpPressed).toBe(false);
  input.releaseTouch(10);
  expect(input.poll()).toMatchObject({ source: 'touch', horizontal: 0 });
  expect(interactions).toBe(3);
  input.dispose();
});

it('keeps an action held until its final finger releases and cancels opposing directions', () => {
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  input.pressTouch(1, 'left'); input.pressTouch(2, 'right');
  input.pressTouch(3, 'jump'); input.pressTouch(4, 'jump');
  expect(input.poll()).toMatchObject({ horizontal: 0, jumpHeld: true, jumpPressed: true });
  input.releaseTouch(2); input.releaseTouch(3);
  expect(input.poll()).toMatchObject({ horizontal: -1, jumpHeld: true, jumpPressed: false });
  input.releaseTouch(4);
  expect(input.poll().jumpHeld).toBe(false);
  input.dispose();
});

it('cancels pending touch jumps and clears held fingers across pause/focus boundaries', () => {
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  input.pressTouch(1, 'jump'); input.releaseTouch(1, true);
  expect(input.poll()).toMatchObject({ jumpHeld: false, jumpPressed: false });
  input.pressTouch(2, 'right'); input.pressTouch(3, 'jump');
  input.clearForResume();
  expect(input.poll()).toMatchObject({ horizontal: 0, jumpHeld: false, jumpPressed: false });
  input.setFocused(false); input.pressTouch(4, 'left');
  input.setFocused(true);
  expect(input.poll()).toMatchObject({ horizontal: 0, jumpHeld: false, jumpPressed: false });
  input.releaseTouch(2); input.releaseTouch(3);
  input.pressTouch(5, 'left');
  expect(input.poll().horizontal).toBe(-1);
  input.dispose();
});

it('switches from touch to keyboard and controller on use, retaining touch with no controller', () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
  const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons };
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => pad.connected ? [pad] : [] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  target.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch' }));
  expect(input.poll().source).toBe('touch');
  target.dispatchEvent(Object.assign(new Event('keydown'), { code: 'ArrowRight', repeat: false }));
  expect(input.poll().source).toBe('keyboard');
  buttons[0].pressed = true;
  expect(input.poll().source).toBe('controller');
  input.pressTouch(1, 'left');
  expect(input.poll().source).toBe('touch');
  pad.connected = false;
  expect(input.poll().source).toBe('touch');
  input.dispose();
});

it('emits T once per press, ignores repeats and clears it on focus loss', () => {
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  const key = (type: string, repeat = false) => target.dispatchEvent(Object.assign(new Event(type), { code: 'KeyT', repeat }));
  key('keydown');
  expect(input.poll().trailsPressed).toBe(true);
  key('keydown', true);
  expect(input.poll().trailsPressed).toBe(false);
  key('keyup'); key('keydown');
  input.setFocused(false);
  expect(input.poll().trailsPressed).toBeFalsy();
  input.setFocused(true);
  expect(input.poll().trailsPressed).toBe(false);
  key('keydown');
  expect(input.poll().trailsPressed).toBe(true);
  input.dispose();
});

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

it('emits deliberate activity E / standard D-pad up edges and blocks held activity input across clear', () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
  const pad = { connected: true, mapping: 'standard', axes: [0, 0], buttons };
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [pad] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  const key = (type: string, repeat = false) => target.dispatchEvent(Object.assign(new Event(type), { code: 'KeyE', repeat }));
  key('keydown'); expect(input.poll().activityPressed).toBe(true);
  key('keydown', true); expect(input.poll().activityPressed).toBe(false);
  key('keyup');
  buttons[12].pressed = true;
  expect(input.poll()).toMatchObject({ activityPressed: true, source: 'controller', jumpPressed: false });
  expect(input.poll().activityPressed).toBe(false);
  input.clear();
  expect(input.poll().activityPressed).toBe(false);
  buttons[12].pressed = false; input.poll();
  buttons[12].pressed = true; expect(input.poll().activityPressed).toBe(true);
  input.setFocused(false); expect(input.poll().activityPressed).toBeFalsy();
  input.setFocused(true); expect(input.poll().activityPressed).toBe(false);
  input.dispose();
});

it('leaves R and the controller View button unbound now the picture story is retired', () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'standard', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0], buttons, vibrationActuator: null };
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [pad] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  expect(input.poll()).not.toHaveProperty('storyPressed');
  const r = Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyR', repeat: false });
  target.dispatchEvent(r);
  expect(r.defaultPrevented).toBe(false);
  buttons[8].pressed = true;
  const frame = input.poll();
  expect(frame).not.toHaveProperty('storyPressed');
  expect(frame).toMatchObject({ source: 'keyboard', horizontal: 0, jumpPressed: false, pausePressed: false, activityPressed: false });
  input.dispose();
});

it('clears held menu directions on resume while retaining movement first pressed on the resume frame', () => {
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  const key = (code: string) => target.dispatchEvent(Object.assign(new Event('keydown'), { code, repeat: false }));
  key('ArrowRight'); input.poll(); input.poll();
  input.clearForResume(); expect(input.poll().horizontal).toBe(0);
  key('ArrowLeft'); input.poll();
  input.clearForResume(); expect(input.poll().horizontal).toBe(-1);
  input.clear();
  key('ArrowRight');
  target.dispatchEvent(Object.assign(new Event('keyup'), { code: 'ArrowRight' }));
  input.poll(); input.clearForResume();
  expect(input.poll().horizontal).toBe(0);
  input.dispose();
});
