import type { MovingPlatform } from '../game/platforms';
import type { LevelData, WorldEntity } from './level';

function girder(id: string, left: number, right: number, y: number): MovingPlatform {
  return { id: `site-${id}`, from: { x: left, y }, to: { x: left, y }, width: right - left, seconds: 1 };
}

// Three connected bays; the visible gap below the high crossing separates
// local recovery islands. A fall there uses the existing checkpoint recovery.
// First-tower catches never form a floor into the later yard.
// Permanent tops are authored together with their return
// edges; machinery and braces are scenery. The lower crane deck spans both docks.
const platforms: readonly MovingPlatform[] = [
  girder('entrance', 0, 300, 560),
  girder('first-low-right', 280, 720, 560),
  girder('first-1', 160, 340, 500),
  girder('first-b', 0, 430, 440),
  girder('first-3', 160, 340, 380),
  girder('high-deck', 260, 470, 320),
  girder('far-dock', 650, 800, 320),
  girder('crane-catch', 340, 1900, 380),
  girder('first-left-1', 0, 180, 500),
  girder('first-right', 400, 560, 500),
  girder('lower-catch', 0, 840, 620),
  girder('descent-outside', 1580, 1840, 560),
  girder('descent-base-catch', 1460, 1900, 620),
  { id: 'site-crane-ferry', from: { x: 470, y: 320 }, to: { x: 554, y: 320 }, width: 96, seconds: 1.4, pause: 1.2 },
  girder('descent-1', 1820, 2020, 440),
  girder('descent-e', 1800, 2120, 500),
  girder('descent-3', 2020, 2220, 560),
  girder('yard', 1880, 2520, 620),
  girder('descent-left-1', 1700, 1940, 500),
  girder('descent-left-2', 1700, 1900, 560),
  girder('final-1', 2440, 2620, 560),
  girder('final-2', 2560, 2740, 500),
  girder('rest', 2660, 2920, 440),
  girder('final-4', 2560, 2740, 380),
  girder('final-5', 2660, 2840, 320),
  girder('final-6', 2760, 3000, 260),
  girder('final-m', 2660, 2880, 200),
  girder('roof', 2800, 3120, 140),
  // Local wrong-end catches, with ordinary fixed jumps back into the frame.
  girder('final-base-catch', 2520, 3120, 620),
  girder('final-right-560', 2700, 3120, 560),
  girder('final-right-500', 2880, 3120, 500),
  girder('final-left-440', 2460, 2600, 440),
  girder('final-right-380', 2780, 3120, 380),
  girder('final-right-320', 2880, 3120, 320),
  girder('final-left-320', 2400, 2600, 320),
  girder('final-left-260', 2540, 2720, 260),
  girder('final-outside-380', 2260, 2500, 380),
  girder('final-outside-440', 2140, 2400, 440),
  girder('final-outside-500', 2220, 2500, 500),
  girder('final-outside-560', 2380, 2520, 560),
];

const checkpoints = [
  { id: 'site-checkpoint-girders', x: 350, y: 320 },
  { id: 'site-checkpoint-descent', x: 2030, y: 500 },
  { id: 'site-checkpoint-yard', x: 2250, y: 620 },
  { id: 'site-checkpoint-scaffold', x: 2800, y: 440 },
];

const gemPlaces: readonly (readonly [number, number])[] = [
  [100, 560], [160, 560], [220, 560], [210, 500], [290, 500],
  [280, 440], [350, 440], [400, 440], [200, 380], [280, 380],
  [300, 320], [390, 320], [430, 320], [500, 380], [570, 380],
  [680, 320], [740, 320], [780, 320], [700, 380], [1520, 380],
  [1620, 380], [1840, 440], [1830, 440], [1840, 500], [1920, 500],
  [2000, 500], [2080, 500], [2060, 560], [2150, 560], [2290, 620],
  [2320, 620], [2380, 620], [2440, 620], [2480, 560], [2570, 560],
  [2600, 500], [2690, 500], [2700, 440], [2755, 440], [2870, 440],
  [2600, 380], [2690, 380], [2700, 320], [2790, 320], [2800, 260],
  [2890, 260], [2700, 200], [2780, 200], [2840, 200], [2830, 140],
  [2880, 140], [2910, 140], [2970, 140], [3010, 140], [2645, 500], [2745, 320],
  [120, 440], [470, 500], [1740, 500], [1780, 560], [2540, 440], [2650, 260],
];
const entities: WorldEntity[] = [
  ...gemPlaces.map(([x, supportY], index) => ({
    id: index < 56 ? `site-gem-${String(index + 1).padStart(3, '0')}` : `site-bonus-${String(index - 55).padStart(3, '0')}`,
    kind: 'gem' as const, x, y: supportY - 18, asset: 'gem', layer: 'world' as const,
  })),
  ...checkpoints.map(point => ({ ...point, kind: 'checkpoint' as const, asset: 'checkpoint', layer: 'world' as const })),
  ...[[100, 560, 'cave'], [1600, 380, 'bush'], [2320, 620, 'cave']].map(([x, y, asset], index) => ({
    id: `site-deco-${index + 1}`, kind: 'decoration' as const, x: x as number, y: y as number,
    asset: asset as string, layer: 'back' as const,
  })),
];

// Owner-approved +2px gem offsets only where the representative steel preview
// introduces an18px overhead body. The other approved offsets await rollout.
const previewGemOffsets = new Set(['site-gem-001', 'site-gem-002', 'site-gem-003', 'site-gem-004', 'site-gem-005',
  'site-gem-006', 'site-gem-007', 'site-gem-008', 'site-gem-010', 'site-gem-014', 'site-gem-015', 'site-gem-019',
  'site-gem-022', 'site-gem-023']);
for (const entity of entities) if (previewGemOffsets.has(entity.id)) entity.y += 2;

export const SUNSET_SITE: LevelData = {
  id: 'sunset', name: 'SUNSET SITE', atlas: 'site',
  theme: {
    slimeAccessory: 'hard-hat', material: 'gravel', sky: '#e88f6a', ground: '#5a3b4a', edge: '#cda66b',
    sun: { x: 340, y: 96, radius: 22, color: '#ffe08a', glow: '#ffb36a66' },
    parallax: [{ asset: 'hills', x: 240, y: 170, scale: 3 }, { asset: 'hills', x: 720, y: 170, scale: 3 }],
  },
  width: 3120, height: 760, minX: 0, maxX: 3120,
  start: { x: 60, y: 560 },
  finish: { x: 3050, y: 140, asset: 'finish-arch', supportOnly: true, boundedWidth: 46, rearmBelowY: 200, rearmLeftX: 2870 },
  sections: [
    { x: 170, name: 'High girders' },
    { x: 1660, name: 'Frame descent' },
    { x: 1880, minY: 600, name: 'Lower work yard' },
    { x: 2440, name: 'Final scaffold' },
    { x: 2800, maxY: 175, name: 'Rooftop' },
  ],
  retrace: { x: 2930, y: 140 }, verticalCamera: true, cameraLead: 110, checkpointActivation: 'grounded',
  surfaces: [
    { x1: 0, x2: 960, y1: 680, y2: 680 },
    { x1: 960, x2: 980, y1: 680, y2: 1000 },
    { x1: 980, x2: 1320, y1: 1000, y2: 1000 },
    { x1: 1320, x2: 1340, y1: 1000, y2: 680 },
    { x1: 1340, x2: 3120, y1: 680, y2: 680 },
  ],
  platforms, checkpoints, entities,
};
