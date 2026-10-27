import type { MovingPlatform } from '../game/platforms';
import type { LevelData, WorldEntity } from './level';

function girder(id: string, left: number, right: number, y: number): MovingPlatform {
  return { id: `site-${id}`, from: { x: left, y }, to: { x: left, y }, width: right - left, seconds: 1 };
}

// Three connected bays. Permanent tops are authored together with their return
// edges; machinery and braces are scenery. The lower crane deck spans both docks.
const platforms: readonly MovingPlatform[] = [
  girder('entrance', 0, 720, 560),
  girder('first-1', 160, 340, 500),
  girder('first-b', 0, 430, 440),
  girder('first-3', 160, 340, 380),
  girder('high-deck', 260, 470, 320),
  girder('far-dock', 650, 800, 320),
  girder('crane-catch', 340, 1050, 380),
  girder('first-left-1', 0, 180, 500),
  girder('first-right', 400, 560, 500),
  girder('lower-catch', 0, 1160, 620),
  girder('descent-outside', 700, 980, 560),
  { id: 'site-crane-ferry', from: { x: 470, y: 320 }, to: { x: 554, y: 320 }, width: 96, seconds: 1.4, pause: 1.2 },
  girder('descent-1', 980, 1160, 440),
  girder('descent-e', 1080, 1400, 500),
  girder('descent-3', 1300, 1500, 560),
  girder('yard', 1160, 1800, 620),
  girder('descent-left-1', 800, 1020, 500),
  girder('descent-left-2', 980, 1180, 560),
  girder('final-1', 1720, 1900, 560),
  girder('final-2', 1840, 2020, 500),
  girder('rest', 1940, 2200, 440),
  girder('final-4', 1840, 2020, 380),
  girder('final-5', 1940, 2120, 320),
  girder('final-6', 2040, 2280, 260),
  girder('final-m', 1940, 2160, 200),
  girder('roof', 2080, 2400, 140),
  // Local wrong-end catches, with ordinary fixed jumps back into the frame.
  girder('final-base-catch', 1800, 2400, 620),
  girder('final-right-560', 1980, 2400, 560),
  girder('final-right-500', 2160, 2400, 500),
  girder('final-left-440', 1740, 1880, 440),
  girder('final-right-380', 2060, 2400, 380),
  girder('final-right-320', 2160, 2400, 320),
  girder('final-left-320', 1680, 1880, 320),
  girder('final-left-260', 1820, 2000, 260),
  girder('final-outside-380', 1540, 1780, 380),
  girder('final-outside-440', 1420, 1680, 440),
  girder('final-outside-500', 1500, 1780, 500),
  girder('final-outside-560', 1660, 1800, 560),
];

const checkpoints = [
  { id: 'site-checkpoint-girders', x: 350, y: 320 },
  { id: 'site-checkpoint-descent', x: 1310, y: 500 },
  { id: 'site-checkpoint-yard', x: 1530, y: 620 },
  { id: 'site-checkpoint-scaffold', x: 2080, y: 440 },
];

const gemPlaces: readonly (readonly [number, number])[] = [
  [100, 560], [160, 560], [220, 560], [210, 500], [290, 500],
  [280, 440], [350, 440], [400, 440], [200, 380], [280, 380],
  [300, 320], [390, 320], [430, 320], [500, 380], [570, 380],
  [680, 320], [740, 320], [780, 320], [700, 380], [800, 380],
  [900, 380], [1020, 440], [1110, 440], [1120, 500], [1200, 500],
  [1280, 500], [1360, 500], [1340, 560], [1430, 560], [1570, 620],
  [1600, 620], [1660, 620], [1720, 620], [1760, 560], [1850, 560],
  [1880, 500], [1970, 500], [1980, 440], [2035, 440], [2150, 440],
  [1880, 380], [1970, 380], [1980, 320], [2070, 320], [2080, 260],
  [2170, 260], [1980, 200], [2060, 200], [2120, 200], [2110, 140],
  [2160, 140], [2190, 140], [2250, 140], [2290, 140], [1925, 500], [2025, 320],
  [120, 440], [470, 500], [870, 500], [1060, 560], [1820, 440], [1930, 260],
];
const entities: WorldEntity[] = [
  ...gemPlaces.map(([x, supportY], index) => ({
    id: index < 56 ? `site-gem-${String(index + 1).padStart(3, '0')}` : `site-bonus-${String(index - 55).padStart(3, '0')}`,
    kind: 'gem' as const, x, y: supportY - 18, asset: 'gem', layer: 'world' as const,
  })),
  ...checkpoints.map(point => ({ ...point, kind: 'checkpoint' as const, asset: 'checkpoint', layer: 'world' as const })),
  ...[[100, 560, 'cave'], [880, 380, 'bush'], [1600, 620, 'cave']].map(([x, y, asset], index) => ({
    id: `site-deco-${index + 1}`, kind: 'decoration' as const, x: x as number, y: y as number,
    asset: asset as string, layer: 'back' as const,
  })),
];

export const SUNSET_SITE: LevelData = {
  id: 'sunset', name: 'SUNSET SITE', atlas: 'site',
  theme: {
    slimeAccessory: 'hard-hat', material: 'gravel', sky: '#e88f6a', ground: '#5a3b4a', edge: '#cda66b',
    sun: { x: 340, y: 96, radius: 22, color: '#ffe08a', glow: '#ffb36a66' },
    parallax: [{ asset: 'hills', x: 240, y: 170, scale: 3 }, { asset: 'hills', x: 720, y: 170, scale: 3 }],
  },
  width: 2400, height: 760, minX: 0, maxX: 2400,
  start: { x: 60, y: 560 },
  finish: { x: 2330, y: 140, asset: 'finish-arch', supportOnly: true, boundedWidth: 46, rearmBelowY: 200, rearmLeftX: 2150 },
  retrace: { x: 2210, y: 140 }, verticalCamera: true, cameraLead: 110, checkpointActivation: 'grounded',
  surfaces: [{ x1: 0, x2: 2400, y1: 680, y2: 680 }],
  platforms, checkpoints, entities,
};
