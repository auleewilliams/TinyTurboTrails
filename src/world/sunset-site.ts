import { withSlimePatrols, SLIME_SPEED } from './slimes';
import type { MovingPlatform } from '../game/platforms';
import type { LevelData, WorldEntity } from './level';
import { contourTerrain, levelKit, type Contour } from './level-kit';

// Sunset Site is one left-to-right ground profile split into six construction sections,
// plus a late checkpoint so the double pit at the end never sends Henry far back.
const contour: Contour = [
  // Site gate (0–1650): a gentle ramp onto the first girder, then a spring step up.
  [0, 198], [360, 198], [470, 168], [760, 168], [860, 198], [1100, 198],
  [1116, 148], [1380, 148], [1480, 198], [1650, 198],
  // Girder stairs (1650–3300): stepped ramps up to a hazard deck and back down.
  [1800, 198], [1900, 174], [2000, 174], [2100, 150], [2200, 150], [2300, 126],
  [2560, 126], [2660, 150], [2760, 150], [2860, 174], [2960, 174], [3060, 198], [3300, 198],
  // Cement yard (3300–5000): low mounds, patrolling slimes and a crane ferry over two hazards.
  [3700, 198], [3800, 180], [4100, 180], [4200, 198], [5000, 198],
  // Trench (5000–6800): back-to-back pneumatic-jack pits, then a long open run.
  [5240, 198], [5252, 380], [5320, 380], [5332, 210], [5480, 210], [5492, 380],
  [5560, 380], [5572, 222], [5900, 222], [6000, 198], [6100, 170], [6800, 170],
  // Scaffold climb (6800–8400): up the scaffold, across a hazard deck and down again.
  [6900, 170], [7000, 146], [7100, 146], [7200, 126], [7500, 126], [7600, 146],
  [7700, 146], [7800, 170], [7900, 170], [8000, 198], [8400, 198],
  // Sunset summit (8400–10000): a last rise, a double pit and the finish arch.
  [8800, 198], [8900, 174], [9100, 174], [9200, 198], [9300, 198], [9312, 380],
  [9380, 380], [9392, 210], [9540, 210], [9552, 380], [9620, 380], [9632, 222],
  [9800, 222], [9900, 198], [10000, 198],
];

const terrain = contourTerrain(contour);
const kit = levelKit(terrain);
const { gem, thing, decoration } = kit;

const checkpoints = kit.checkpoints([
  { id: 'site-checkpoint-gate', x: 560 },
  { id: 'site-checkpoint-girders', x: 1650 },
  { id: 'site-checkpoint-yard', x: 3400 },
  { id: 'site-checkpoint-trench', x: 4900 },
  { id: 'site-checkpoint-scaffold', x: 6850 },
  { id: 'site-checkpoint-summit', x: 8500 },
  { id: 'site-checkpoint-finale', x: 9000 },
]);

/**
 * One optional crane ferry over the yard's paired hazards: slow, parked at both ends and
 * docked over the walkable flat, so a missed boarding costs a landing, never a life.
 */
const platforms: readonly MovingPlatform[] = [
  { id: 'site-crane-ferry', from: { x: 4330, y: 156 }, to: { x: 4462, y: 156 }, width: 48, seconds: 2.2, pause: 0.8 },
];

// Main-route gems sit in the walking window along the ground; every id is derived from its x.
const mainGems = [
  200, 300, 560, 680, 940, 1000, 1200, 1300, 1520, 1740,
  1860, 2050, 2150, 2380, 2520, 2710, 2900, 3140, 3240,
  3460, 3600, 3900, 4050, 4250, 4620, 4780, 4950,
  5100, 5160, 5400, 5440, 5700, 5820, 6050, 6250, 6450, 6650,
  6760, 6960, 7150, 7260, 7450, 7650, 7850, 8100, 8250,
  8560, 8700, 8950, 9050, 9420, 9480, 9700, 9780, 9850, 9940,
].map((x, index): WorldEntity => gem(`site-gem-${String(index + 1).padStart(3, '0')}`, x));

export const SUNSET_SITE: LevelData = withSlimePatrols({
  id: 'sunset',
  name: 'SUNSET SITE',
  atlas: 'site',
  theme: {
    slimeAccessory: 'hard-hat',
    material: 'gravel',
    sky: '#e88f6a',
    ground: '#5a3b4a',
    edge: '#cda66b',
    sun: { x: 300, y: 96, radius: 22, color: '#ffe08a', glow: '#ffb36a66' },
    parallax: [
      { asset: 'hills', x: 240, y: 170, scale: 3 },
      { asset: 'hills', x: 720, y: 170, scale: 3 },
      { asset: 'hills', x: 1200, y: 170, scale: 3 },
      { asset: 'hills', x: 1680, y: 170, scale: 3 },
      { asset: 'hills', x: 2160, y: 170, scale: 3 },
    ],
  },
  width: 10000,
  height: 240,
  minX: terrain.minX,
  maxX: terrain.maxX,
  start: { x: 60, y: 198 },
  finish: { x: 9950, y: 198, asset: 'finish-arch' },
  surfaces: terrain.surfaces,
  checkpoints,
  platforms,
  entities: [
    ...mainGems,
    // Site gate
    thing('slime', 'site-slime-001', 660, { minX: 620, maxX: 700, speed: SLIME_SPEED }),
    thing('spring', 'site-spring-001', 1060),
    gem('site-bonus-001', 1240, 50),
    decoration('site-deco-001', 330, 'cave'),
    decoration('site-deco-002', 1300, 'bush'),
    // Girder stairs
    thing('hazard', 'site-hazard-001', 2400),
    thing('hazard', 'site-hazard-002', 2470),
    gem('site-bonus-002', 2435, 45),
    thing('slime', 'site-slime-002', 3200, { minX: 3120, maxX: 3260, speed: SLIME_SPEED }),
    decoration('site-deco-003', 2240, 'bush'),
    decoration('site-deco-004', 2950, 'cave'),
    // Cement yard
    thing('slime', 'site-slime-003', 3520, { minX: 3440, maxX: 3620, speed: SLIME_SPEED }),
    thing('slime', 'site-slime-004', 3950, { minX: 3860, maxX: 4040, speed: SLIME_SPEED }),
    thing('hazard', 'site-hazard-003', 4380),
    thing('hazard', 'site-hazard-004', 4440),
    gem('site-bonus-003', 4560, 50),
    thing('slime', 'site-slime-005', 4780, { minX: 4680, maxX: 4860, speed: SLIME_SPEED }),
    decoration('site-deco-005', 3350, 'bush'),
    decoration('site-deco-006', 4700, 'cave'),
    // Trench
    thing('spring', 'site-spring-002', 5220),
    thing('spring', 'site-spring-003', 5460),
    gem('site-bonus-004', 5540, 120, 5460),
    thing('hazard', 'site-hazard-005', 5760),
    thing('slime', 'site-slime-006', 6250, { minX: 6150, maxX: 6350, speed: SLIME_SPEED }),
    thing('hazard', 'site-hazard-006', 6550),
    decoration('site-deco-007', 5950, 'bush'),
    decoration('site-deco-008', 6700, 'cave'),
    // Scaffold climb
    thing('hazard', 'site-hazard-007', 7320),
    thing('hazard', 'site-hazard-008', 7390),
    gem('site-bonus-005', 7355, 45),
    thing('slime', 'site-slime-007', 8200, { minX: 8080, maxX: 8300, speed: SLIME_SPEED }),
    decoration('site-deco-009', 7000, 'bush'),
    decoration('site-deco-010', 7950, 'cave'),
    // Sunset summit
    thing('slime', 'site-slime-008', 8620, { minX: 8520, maxX: 8720, speed: SLIME_SPEED }),
    thing('spring', 'site-spring-004', 9280),
    thing('spring', 'site-spring-005', 9520),
    gem('site-bonus-006', 9600, 120, 9520),
    // Past the spring's landing zone (9640–9720), so the launch never ends in a knockback into the pit.
    thing('slime', 'site-slime-009', 9770, { minX: 9740, maxX: 9800, speed: SLIME_SPEED }),
    decoration('site-deco-011', 8850, 'cave'),
    decoration('site-deco-012', 9980, 'bush'),
    ...kit.checkpointEntities(checkpoints),
  ],
});
