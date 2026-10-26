export interface ActuatorCall {
  time: number;
  parameters: { duration: number; strongMagnitude: number; weakMagnitude: number; startDelay: number };
}
export interface HealthObservation { time: number; health: number | null }

/** Classify actual calls, then require rendered health to bracket an exact damage pulse. */
export function observedDamage(calls: ActuatorCall[], samples: HealthObservation[]): ActuatorCall | undefined {
  const kinds = calls.map((call, index) => {
    const p = call.parameters;
    const matches = (duration: number, strong: number, weak: number): boolean =>
      p.duration === duration && p.strongMagnitude === strong && p.weakMagnitude === weak && p.startDelay === 0;
    if (matches(100, 0.55, 0.3)) return 'damage';
    if (matches(45, 0.12, 0.22)) return 'spring';
    if (matches(45, 0.05, 0.45)) return 'star';
    // A tail is optional under the source's expiry policy; do not require delivery timing.
    const previous = calls[index - 1];
    if (matches(70, 0.24, 0.45) && previous?.parameters.duration === 45
      && previous.parameters.strongMagnitude === 0.12 && previous.parameters.weakMagnitude === 0.22
      && call.time >= previous.time) return 'spring-tail';
    throw new Error(`Unknown or orphan actuator pulse: ${JSON.stringify(call)}`);
  });
  let previous: HealthObservation | undefined;
  for (const sample of samples) {
    if (sample.health === null) continue;
    if (previous && previous.health !== null
      && (sample.health < previous.health || previous.health === 1 && sample.health === 3)) {
      const damage = calls.find((call, index) => kinds[index] === 'damage'
        && call.time >= previous!.time && call.time <= sample.time);
      if (damage) return damage;
    }
    previous = sample;
  }
  return undefined;
}

/** Require sustained fresh controller travel, excluding coasting and step jitter. */
export function sustainedControllerMovement(samples: { time: number; x: number; velocity: number; axis: number }[], after: number, startX: number): boolean {
  return samples.some((_, index) => {
    const window = samples.slice(index, index + 6);
    return window.length === 6 && Math.abs(window[5].x - startX) >= 10
      && window.every(frame => frame.time > after && Math.abs(frame.axis) === 1
        && Math.sign(frame.velocity) === frame.axis && Math.abs(frame.velocity) >= 100);
  });
}
