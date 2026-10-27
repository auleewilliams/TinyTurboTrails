import { expect, it } from 'vitest';
import { HudPresentation } from '../src/game/hud';
import { SUNSET_SITE } from '../src/world/levels';
import { neutral } from './sunset-pilot';

it('names the current final tower and rooftop independently of four checkpoint slots', () => {
  const hud = new HudPresentation();
  for (const [x, feet, name] of [[2440, 560, 'Final scaffold'], [2930, 140, 'Rooftop'],
    [2750, 200, 'Final scaffold'], [2250, 620, 'Lower work yard'], [2030, 500, 'Frame descent']] as const) {
    hud.update(0.016, neutral, SUNSET_SITE, x, false, feet);
    expect(hud.location).toBe(name);
  }
});
