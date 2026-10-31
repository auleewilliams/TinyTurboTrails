import { afterEach, expect, it, vi } from 'vitest';
import { bay1KeyboardPilotInit } from './cove-bay1-input';
afterEach(() => vi.unstubAllGlobals());
it('forwards every actual RAF timestamp unchanged, including long native intervals', () => {
  let scheduled: FrameRequestCallback = () => {};
  const schedule = (callback: FrameRequestCallback) => { scheduled = callback; return 1; };
  const scope = { requestAnimationFrame: schedule, dispatchEvent() {} };
  vi.stubGlobal('window', scope); vi.stubGlobal('requestAnimationFrame', schedule);
  vi.stubGlobal('document', { querySelector: () => ({ textContent: '' }) });
  bay1KeyboardPilotInit([]);
  const observed: number[] = [];
  for (const now of [1000, 1016, 3000]) {
    scope.requestAnimationFrame(time => observed.push(time)); scheduled(now);
  }
  expect(observed).toEqual([1000, 1016, 3000]);
});
