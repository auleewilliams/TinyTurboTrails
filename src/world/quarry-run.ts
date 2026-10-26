import type { MovingPlatform } from '../game/platforms';
import type { LevelData, WorldEntity } from './level';

/** Permanent one-way rock shelves above the single continuous quarry floor. */
function shelf(id: string, x: number, y: number, width: number): MovingPlatform {
  return { id, from: { x, y }, to: { x, y }, width, seconds: 1 };
}
const checkpoints = [
  { id: 'quarry-checkpoint-upper', x: 450, y: 420 },
  { id: 'quarry-checkpoint-mine', x: 450, y: 700 },
  { id: 'quarry-checkpoint-floor', x: 450, y: 980 },
];
const platforms: readonly MovingPlatform[] = [
  shelf('quarry-rim', 160, 140, 360),
  shelf('quarry-terrace-1', 440, 210, 140),
  shelf('quarry-terrace-2', 280, 280, 240),
  shelf('quarry-star-upper', 600, 280, 160),
  shelf('quarry-terrace-3', 180, 350, 180),
  shelf('quarry-upper', 160, 420, 400),
  shelf('quarry-b-upper-dock', 600, 420, 60),
  shelf('quarry-terrace-4', 480, 490, 160),
  shelf('quarry-terrace-5', 320, 560, 240),
  shelf('quarry-terrace-6', 180, 630, 220),
  shelf('quarry-mine', 160, 700, 400),
  shelf('quarry-b-lower-dock', 600, 700, 60),
  shelf('quarry-terrace-7', 420, 770, 180),
  shelf('quarry-terrace-8', 280, 840, 260),
  shelf('quarry-star-lower', 600, 840, 160),
  shelf('quarry-terrace-9', 180, 910, 200),
  // One-way catch bridges overlap the shafts so an absent carriage costs a local drop.
  // Riding support retains the carriage through these bridges in both directions;
  // the phase/timestep suite verifies that handoff rather than assuming clearance.
  ...[164, 234, 304, 374, 444, 724, 794, 864, 934].flatMap(y => [
    shelf(`quarry-left-outer-${y}`, 0, y, 112),
    ...y === 374 ? [] : [shelf(`quarry-left-inner-${y}`, 112, y, 112)],
  ]),
  ...[444, 514, 584, 654, 724].flatMap(y => [
    // The lower waiting ledge itself catches the inner side near y654;
    // omitting that overhead slab leaves headroom for the approach jump.
    ...y === 654 ? [] : [shelf(`quarry-right-inner-${y}`, 600, y, 108)],
    shelf(`quarry-right-outer-${y}`, 708, y, 112),
  ]),
  { id: 'quarry-lift-a', from: { x: 64, y: 140 }, to: { x: 64, y: 420 }, width: 96, seconds: 4, pause: 1.5 },
  { id: 'quarry-lift-b', from: { x: 660, y: 420 }, to: { x: 660, y: 700 }, width: 96, seconds: 4, pause: 1.5 },
  { id: 'quarry-lift-c', from: { x: 64, y: 700 }, to: { x: 64, y: 980 }, width: 96, seconds: 4, pause: 1.5 },
];
const gems: readonly (readonly [number, number])[] = [
  [340,122], [410,122], [490,122], [550,192], [470,192],
  [450,262], [370,262], [310,262], [630,262], [700,262],
  [220,332], [320,332], [270,402], [470,402], [625,402],
  [540,472], [600,472], [500,542], [410,542], [350,542],
  [230,612], [330,612], [300,682], [500,682], [625,682],
  [540,752], [500,752], [480,822], [380,822], [310,822],
  [630,822], [710,822], [240,892], [330,892], [280,962], [500,962], [570,962],
];

export const QUARRY_RUN: LevelData = {
  id: 'quarry', name: 'QUARRY RUN', atlas: 'plains',
  theme: {
    slimeAccessory: 'miner', material: 'stone',
    weather: { kind: 'dust', count: 20, color: '#d7c2a650', drift: 2, fall: 1, sway: 3 },
    backdrop: { row: 0, support: '#4b535860' },
    sky: '#657b8c', ground: '#59616a', edge: '#b1c77d',
    parallax: [],
  },
  width: 820, height: 1080, minX: 0, maxX: 820,
  start: { x: 300, y: 140 },
  finish: { x: 680, y: 980, asset: 'finish-arch', supportOnly: true },
  retrace: { x: 470, y: 980 }, progressAxis: 'y', checkpointActivation: 'grounded',
  surfaces: [{ x1: 0, x2: 820, y1: 980, y2: 980 }],
  checkpoints, platforms, landingBands: [{ x: 450, width: 100 }],
  entities: [
    ...gems.map(([x, y], index): WorldEntity => ({
      id: index < 31 ? `quarry-gem-${String(index + 1).padStart(3, '0')}` : `quarry-bonus-${String(index - 30).padStart(3, '0')}`,
      kind: 'gem', asset: 'gem', layer: 'world', x, y,
    })),
    ...[[660,262], [625,402], [660,822]].map(([x,y], index): WorldEntity => ({
      id: `quarry-special-${index + 1}`, kind: 'special', asset: 'special', layer: 'world', x, y,
    })),
    ...checkpoints.map(point => ({ ...point, kind: 'checkpoint' as const, asset: 'checkpoint', layer: 'world' as const })),
  ],
};
