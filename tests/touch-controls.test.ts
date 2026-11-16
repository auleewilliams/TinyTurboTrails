import { readFileSync } from 'node:fs';
import { transformSync } from 'rolldown/utils';
import { fitGameViewport, fitTouchViewport, fitViewport } from '../src/core/viewport';
import { expect, it } from 'vitest';
import { BrowserInput } from '../src/core/input';
import { TouchControls } from '../src/game/touch-controls';

function setup() {
  const captures = new Set<number>();
  const buttons = ['left', 'right', 'jump'].map(action => {
    const button = { dataset: { touch: action, held: 'false' }, disabled: false,
      setPointerCapture: (id: number) => captures.add(id), hasPointerCapture: (id: number) => captures.has(id),
      releasePointerCapture: (id: number) => captures.delete(id), closest: () => button };
    return button;
  });
  const element = Object.assign(new EventTarget(), { hidden: true, querySelectorAll: () => buttons });
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  const controls = new TouchControls(element as unknown as HTMLElement, input);
  const pointer = (type: string, id: number, index: number) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { pointerId: id, button: 0 });
    Object.defineProperty(event, 'target', { value: buttons[index] });
    element.dispatchEvent(event);
  };
  return { input, controls, buttons, element, captures, pointer };
}

it('captures every finger, shows held feedback and independently cancels lost captures', () => {
  const { input, controls, buttons, element, captures, pointer } = setup();
  controls.update(true);
  expect(element.hidden).toBe(false);
  pointer('pointerdown', 10, 1); pointer('pointerdown', 20, 2);
  expect(captures).toEqual(new Set([10, 20]));
  expect(input.poll()).toMatchObject({ horizontal: 1, jumpPressed: true, jumpHeld: true });
  pointer('lostpointercapture', 20, 2);
  expect(input.poll()).toMatchObject({ horizontal: 1, jumpHeld: false, jumpPressed: false });
  expect(buttons[2].dataset.held).toBe('false');
  pointer('pointerup', 10, 1);
  expect(captures.size).toBe(0);
  expect(input.poll().horizontal).toBe(0);
  controls.dispose(); input.dispose();
});

it('disables controls and releases capture at transitions, without reviving old gestures', () => {
  const { input, controls, buttons, element, captures, pointer } = setup();
  pointer('pointerdown', 1, 1);
  expect(input.poll().horizontal).toBe(0);
  controls.update(true);
  pointer('pointerdown', 2, 2);
  controls.update(false);
  expect(element.hidden).toBe(true);
  expect(buttons.every(button => button.disabled && button.dataset.held === 'false')).toBe(true);
  expect(captures.size).toBe(0);
  controls.update(true); pointer('pointerup', 2, 2);
  expect(input.poll()).toMatchObject({ horizontal: 0, jumpPressed: false, jumpHeld: false });
  controls.dispose(); pointer('pointerdown', 3, 1);
  expect(input.poll().horizontal).toBe(0);
  input.dispose();
});

// Execute the shipped callers with real touch/input adapters; no browser is launched.
const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
function caller(start: string, end: string): string {
  const from = mainSource.indexOf(start), to = mainSource.indexOf(end, from);
  expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from);
  return mainSource.slice(from, to);
}

it.each([[1366, 1024], [1024, 600], [852, 480], [1024, 1366], [2048, 768]])
('shipped resize fits the full camera and binds overlay coordinates at %ix%i', (width, height) => {
  const { input, controls: touch, captures, pointer } = setup();
  const properties = new Map<string, string>();
  const main = { clientWidth: width, clientHeight: height,
    style: { setProperty: (key: string, value: string) => properties.set(key, value) } };
  const canvas = { style: {} as Record<string, string> };
  const harness = `let pendingJump = true; const touchMode = true;
    const getComputedStyle = () => ({ paddingLeft: '24px', paddingRight: '8px', paddingTop: '12px', paddingBottom: '20px' });
    const feedbackControls = { getBoundingClientRect: () => ({ width: 999, height: 96 }),
      classList: { toggle: (name, enabled) => main.style.setProperty('class:' + name, String(enabled)) } };
    const touchRail = { getBoundingClientRect: () => { throw new Error('overlay must never reserve a measured rail'); } };
    ${caller('  const resize =', '  const applyTouchMode =')}
    resize(); return pendingJump;`;
  touch.update(true); pointer('pointerdown', 10, 1); pointer('pointerdown', 20, 2);
  expect(input.poll()).toMatchObject({ horizontal: 1, jumpHeld: true });
  const pending = new Function('touch', 'main', 'canvas', 'fitTouchViewport', 'fitGameViewport',
    transformSync('touch-resize-caller.ts', harness, {}).code)(touch, main, canvas, fitTouchViewport, fitGameViewport);
  expect(pending).toBe(false);
  const size = fitViewport(width - 32, height - 32);
  expect(parseFloat(canvas.style.width)).toBeCloseTo(size.width);
  expect(parseFloat(canvas.style.height)).toBeCloseTo(size.height);
  for (const key of ['width', 'height', 'left', 'top']) expect(properties.get(`--camera-${key}`)).toBe(canvas.style[key]);
  const cameraBottom = parseFloat(canvas.style.top) + size.height;
  expect(properties.get('class:touch-letterbox')).toBe(String(height - 20 - cameraBottom >= 112));
  expect(captures.size).toBe(0);
  touch.update(true); pointer('pointerup', 10, 1); pointer('pointerup', 20, 2);
  expect(input.poll()).toMatchObject({ horizontal: 0, jumpHeld: false, jumpPressed: false });
  touch.dispose(); input.dispose();
});

it.each(['pause', 'focus', 'menu', 'activity', 'loading', 'mode'])
('shipped visibility caller clears simultaneous input at the %s boundary', boundary => {
  const { input, controls: touch, captures, pointer, element } = setup();
  const harness = `let touchMode = true, focused = true, userPaused = false, assetState = 'ready';
    const scene = { screenState: 'playing', educationOverlay: { open: false } };
    const educationScene = () => scene;
    ${caller('  const syncTouchControls =', '  const refreshPause =')}
    return { sync: syncTouchControls, leave: () => {
      if (boundary === 'pause') userPaused = true;
      if (boundary === 'focus') focused = false;
      if (boundary === 'menu') scene.screenState = 'finish';
      if (boundary === 'activity') scene.educationOverlay.open = true;
      if (boundary === 'loading') assetState = 'loading';
      if (boundary === 'mode') touchMode = false;
      syncTouchControls();
    } };`;
  const driver = new Function('touch', 'boundary', transformSync('touch-visibility-caller.ts', harness, {}).code)(touch, boundary);
  driver.sync(); pointer('pointerdown', 10, 1); pointer('pointerdown', 20, 2);
  // Leave before polling: a buffered jump must be cancelled as well as held input.
  driver.leave();
  expect(element.hidden).toBe(true); expect(captures.size).toBe(0);
  pointer('pointerdown', 30, 0);
  expect(input.poll()).toMatchObject({ horizontal: 0, jumpHeld: false, jumpPressed: false });
  touch.dispose(); input.dispose();
});

it('keeps movement independent of repeated held-jump polls and jump cancellation', () => {
  const { input, controls, pointer } = setup(); controls.update(true);
  pointer('pointerdown', 1, 1); pointer('pointerdown', 2, 2);
  expect(input.poll()).toMatchObject({ horizontal: 1, jumpPressed: true, jumpHeld: true });
  expect(input.poll()).toMatchObject({ horizontal: 1, jumpPressed: false, jumpHeld: true });
  pointer('pointercancel', 2, 2);
  expect(input.poll()).toMatchObject({ horizontal: 1, jumpPressed: false, jumpHeld: false });
  controls.dispose(); input.dispose();
});

// This is a constraint on the shipped stylesheet, not a claim about composed boxes.
it('keeps utility placement out of the camera-relative bottom-centre', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const rule = css.match(/\.touch-mode \.feedback-controls \{([^}]+)\}/)![1];
  expect(rule).not.toMatch(/left:\s*calc\(var\(--camera-left\) \+ var\(--camera-width\) \/ 2\)/);
  expect(rule).not.toMatch(/bottom:\s*calc\(100% - var\(--camera-top\) - var\(--camera-height\)/);
});
