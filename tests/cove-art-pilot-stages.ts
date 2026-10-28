import type { TimberPilotStage } from './timbers-browser-pilot';

/** Only the illustrated-art view route. Near-stone approaches keep takeoffs within reach;
 * the reverse approach settles on the bank before the original final pose. */
export const COVE_ART_PILOT_STAGES = {
  underpass: [{ kind: 'walk', x: 1040 }],
  hollowSlope: [{ kind: 'walk', x: 1110 }],
  firstStone: [{ kind: 'walk', x: 1600 }, { kind: 'walk', x: 1690 }, { kind: 'jump', x: 1750, y: 296 }],
  upperLanding: [
    { kind: 'walk', x: 2070 }, { kind: 'walk', x: 2210 }, { kind: 'jump', x: 2260, y: 296 },
    { kind: 'walk', x: 2300 }, { kind: 'jump', x: 2395, y: 284 },
    { kind: 'walk', x: 2600 }, { kind: 'walk', x: 2940 }, { kind: 'jump', x: 3020, y: 272 },
    { kind: 'walk', x: 3080 }, { kind: 'jump', x: 3170, y: 260 },
  ],
  upperRest: [{ kind: 'walk', x: 3280 }, { kind: 'jump', x: 3360, y: 272 }],
  reverseBank: [
    { kind: 'jump', x: 3280, y: 260 }, { kind: 'walk', x: 3160 }, { kind: 'jump', x: 3080, y: 272 },
    { kind: 'walk', x: 3020 }, { kind: 'walk', x: 2900 }, { kind: 'walk', x: 2940 },
  ],
} as const satisfies Record<string, readonly TimberPilotStage[]>;
