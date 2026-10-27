import { expect, it } from 'vitest';
import { FINAL_CLIMB, FIRST_CLIMB, sunsetPilot, walk, drop } from './sunset-pilot';

const cadences = [[0.016], [0.032], [0.016, 0.032, 0.024]];
for (const cadence of cadences) for (const attempt of ['held-right', 'entrance-edge', 'first-girder-edge', 'lower-floor-running-jump', 'edge-coyote-jump'] as const) {
  it(`keeps ${attempt} recovery in the first section before a final-climb attempt / ${cadence}`, () => {
    const route = sunsetPilot(cadence);
    if (attempt === 'first-girder-edge') route.run(FIRST_CLIMB.slice(0, 2));
    if (attempt === 'entrance-edge' || attempt === 'lower-floor-running-jump' || attempt === 'edge-coyote-jump') {
      route.run([drop(720, 1, 780, 620)]);
    }
    if (attempt === 'lower-floor-running-jump' || attempt === 'edge-coyote-jump') {
      route.run([walk(940)]);
      for (let i = 0; i < 100 && route.player.x < (attempt === 'edge-coyote-jump' ? 1005 : 980); i++) route.tick(1);
      let elapsed = route.tick(1, true, true);
      for (; elapsed < 2;) elapsed += route.tick(1, false, elapsed < 0.6);
    }
    // Real input throughout. Include ordinary deliberate catch-edge travel,
    // then attempt the same final-climb/finish sequence that proved the bypass.
    for (let elapsed = 0; elapsed < 12;) elapsed += route.tick(1);
    let failure = '';
    try { route.run([...FINAL_CLIMB, { kind: 'finish' }]); } catch (error) { failure = String(error); }
    expect(failure).toContain('"kind":"walk"');
    expect(failure).toContain('stalled');
    expect(route.scene.screenState).toBe('playing');
    expect(route.events.some(e => e.type === 'checkpoint' && /yard|scaffold/.test(e.entityId ?? ''))).toBe(false);
    for (const support of ['site-high-deck', 'site-crane-catch', 'site-yard', 'site-final-base-catch']) expect(route.supports.has(support), support).toBe(false);
    console.info(JSON.stringify({ attempt, cadence, supports: [...route.supports], outcome: route.scene.screenState,
      checkpoints: route.events.filter(e => e.type === 'checkpoint'), finalAttempt: failure }));
  });
}
