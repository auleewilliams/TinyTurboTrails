import type { MovingPlatform } from '../game/platforms';
import type { LevelData, WorldEntity } from './level';

function bough(id: string, left: number, right: number, y: number): MovingPlatform {
  return { id: `timber-${id}`, from: { x: left, y }, to: { x: left, y }, width: right - left, seconds: 1 };
}

// Top faces are authored with the return at the same time as the ascent. The
// zigzag uses the opposite end of each bough; no top needs drop-through input.
const platforms: readonly MovingPlatform[] = [
  bough('low-1', 240, 440, 1020),
  bough('low-2', 360, 560, 960),
  bough('star-1', 60, 230, 960),
  bough('fork', 170, 620, 900),
  bough('fork-left-1', 180, 400, 840),
  bough('fork-right-1', 470, 640, 840),
  bough('fork-left-2', 260, 470, 780),
  bough('fork-right-2', 420, 620, 780),
  bough('shared', 360, 540, 720),
  bough('middle', 40, 620, 660),
  bough('spring', 40, 190, 600),
  bough('approach-1', 230, 450, 600),
  bough('approach-2', 320, 560, 540),
  bough('spring-reward', 40, 200, 510),
  bough('spring-catch', 130, 280, 540),
  bough('approach-3', 240, 460, 480),
  bough('canopy', 180, 620, 420),
  bough('upper-1', 330, 550, 360),
  bough('star-3-catch', 40, 250, 360),
  bough('upper-2', 230, 450, 300),
  bough('star-3', 60, 200, 300),
  bough('upper-3', 350, 530, 240),
  bough('lookout', 250, 590, 180),
  ...[
    [240, 570, 740], [300, 520, 660], [360, 580, 740],
    [480, 580, 740], [540, 520, 660], [600, 580, 740],
    [720, 580, 740], [780, 520, 660], [840, 580, 740],
    // The low y960 bough ends at 560; this separate return starts at 620,
    // leaving 60px for a full-body left walk-off onto the y1020 return.
    [960, 620, 740], [1020, 520, 660],
  ].map(([y, left, right]) => bough(`return-${y}`, left, right, y)),
  // Outer wrong-end walk-offs land here, then feed back into the zigzag.
  ...[300, 420, 540, 660, 780, 900, 1020].map(y => bough(`outer-catch-${y}`, 700, 820, y)),
  bough('middle-left-catch', 40, 290, 720),
  bough('middle-left-catch-2', 40, 250, 780),
  bough('middle-left-catch-3', 40, 250, 840),
];

const checkpoints = [
  { id: 'timber-checkpoint-fork', x: 510, y: 900 },
  { id: 'timber-checkpoint-middle', x: 260, y: 660 },
  { id: 'timber-checkpoint-canopy', x: 500, y: 420 },
];

// Support heights, not terrain heights: all thirty-three remain local to a
// branch approach or landing and retain stable collectible IDs.
const gemPlaces: readonly (readonly [number, number])[] = [
  [260, 1080], [330, 1020], [410, 1020], [410, 960], [500, 960],
  [120, 960], [270, 900], [370, 900], [540, 900],
  [240, 840], [350, 840], [530, 840], [320, 780], [440, 780], [550, 780],
  [440, 720], [490, 720], [160, 660], [360, 660], [540, 660],
  [310, 600], [390, 600], [100, 600], [115, 510],
  [370, 540], [480, 540], [300, 480], [410, 480],
  [270, 420], [410, 420], [400, 360], [320, 300], [440, 240],
];

const entities: WorldEntity[] = [
  ...gemPlaces.map(([x, supportY], index) => ({
    id: `timber-gem-${String(index + 1).padStart(3, '0')}`, kind: 'gem' as const,
    x, y: supportY - 18, asset: 'gem', layer: 'world' as const,
  })),
  ...[[115, 960], [110, 510], [110, 300]].map(([x, supportY], index) => ({
    id: `timbers-special-${index + 1}`, kind: 'special' as const, x,
    y: supportY - 25, asset: 'special', layer: 'world' as const,
  })),
  { id: 'timber-spring-1', kind: 'spring', x: 100, y: 600, asset: 'spring', layer: 'world' },
  ...checkpoints.map(point => ({ ...point, kind: 'checkpoint' as const, asset: 'checkpoint', layer: 'world' as const })),
];

export const TREETOP_TIMBERS: LevelData = {
  id: 'timbers', name: 'TREETOP TIMBERS', atlas: 'timbers',
  theme: {
    slimeAccessory: 'leaf', material: 'wood',
    weather: { kind: 'leaves', count: 14, color: '#b5a05b80', drift: 6, fall: 8, sway: 10 },
    backdrop: { row: 1, support: '#60443260' },
    sky: '#d97667', ground: '#704126', edge: '#e6a04b', parallax: [],
  },
  width: 820, height: 1180, minX: 0, maxX: 820,
  start: { x: 100, y: 1080 },
  finish: { x: 530, y: 180, asset: 'finish-arch', supportOnly: true, boundedWidth: 46, rearmBelowY: 240, rearmLeftX: 300 },
  retrace: { x: 440, y: 180 }, progressAxis: 'y', checkpointActivation: 'grounded',
  surfaces: [{ x1: 0, x2: 820, y1: 1080, y2: 1080 }],
  checkpoints, platforms, entities,
  landingBands: [{ x: 330, width: 120 }, { x: 270, width: 150 }, { x: 440, width: 140 }],
};
