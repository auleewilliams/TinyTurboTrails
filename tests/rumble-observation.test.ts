import { describe, expect, it } from 'vitest';
import { observedDamage, type ActuatorCall } from './rumble-observation';

const pulse = (time: number, duration: number, strongMagnitude: number, weakMagnitude: number): ActuatorCall => ({
  time, parameters: { duration, strongMagnitude, weakMagnitude, startDelay: 0 },
});
const damage = pulse(100, 100, 0.55, 0.3);
const spring = pulse(20, 45, 0.12, 0.22);
const springEnd = pulse(65, 70, 0.24, 0.45);
const star = pulse(80, 45, 0.05, 0.45);
const health = [{ time: 90, health: 3 }, { time: 110, health: null }, { time: 470, health: 2 }];

describe('actual actuator classification and rendered health boundaries', () => {
  it('accepts legitimate spring/star prefixes and still requires exact damage', () => {
    expect(observedDamage([spring, springEnd, star, damage], health)).toEqual(damage);
  });
  it('permits an omitted spring tail under the existing expiry policy', () => {
    expect(observedDamage([spring, damage], health)).toEqual(damage);
  });
  it('does not accept any known non-damage output as damage', () => {
    expect(observedDamage([spring, springEnd, star], health)).toBeUndefined();
  });
  it.each([pulse(20, 46, 0.12, 0.22), pulse(100, 100, 0.54, 0.3), springEnd])('rejects unknown, wrong-damage or orphan-tail output %#', wrong => {
    expect(() => observedDamage([wrong, damage], health)).toThrow();
  });
  it('requires health loss or defeat recovery to bracket the damage timestamp', () => {
    expect(observedDamage([damage], [{ time: 10, health: 3 }, { time: 20, health: 2 }])).toBeUndefined();
    expect(observedDamage([damage], [{ time: 90, health: 1 }, { time: 470, health: 3 }])).toEqual(damage);
  });
  it('ignores yellow/unknown frames without manufacturing a health transition', () => {
    expect(observedDamage([damage], [{ time: 90, health: 3 }, { time: 110, health: null }, { time: 470, health: 3 }])).toBeUndefined();
  });
});
