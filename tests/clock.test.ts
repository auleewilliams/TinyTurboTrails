import { describe, expect, it } from 'vitest';
import { SimulationClock } from '../src/core/clock';

// Catches frame-dependent motion, retained pause debt and unbounded catch-up.
describe('simulation clock', () => {
  it.each([30, 60, 144])('simulates one second at %i render frames/sec', (fps) => {
    const clock = new SimulationClock();
    let seconds = 0;
    clock.advance(0, (dt) => { seconds += dt; });
    for (let frame = 1; frame <= fps; frame++) {
      clock.advance(frame * 1000 / fps, (dt) => { seconds += dt; });
    }
    expect(seconds).toBeCloseTo(1, 9);
  });

  it('discards partial steps and wall time across focus loss', () => {
    const clock = new SimulationClock();
    let steps = 0;
    const update = () => { steps++; };
    clock.advance(0, update);
    clock.advance(10, update);
    clock.setPaused(true);
    clock.advance(50000, update);
    clock.setPaused(false);
    clock.advance(60000, update);
    clock.advance(60010, update);
    expect(steps).toBe(0);
    clock.advance(60020, update);
    expect(steps).toBe(1);
  });

  it('bounds catch-up after a long frame and discards excess debt', () => {
    const clock = new SimulationClock();
    let steps = 0;
    const update = () => { steps++; };
    clock.advance(0, update);
    clock.advance(10000, update);
    expect(steps).toBe(6);
    clock.advance(10000, update);
    expect(steps).toBe(6);
  });
});
