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
