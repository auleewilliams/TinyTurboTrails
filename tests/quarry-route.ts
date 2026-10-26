export interface QuarryWaypoint { x: number; y: number; jump?: boolean; waitFor?: { id: string; y: number }; tag: string }
export const QUARRY_DESCENT: QuarryWaypoint[] = [
  { x: 550, y: 210, tag: 'first terrace' }, { x: 410, y: 280, tag: 'second terrace' },
  { x: 260, y: 350, tag: 'third terrace' }, { x: 420, y: 420, tag: 'upper workings' },
  { x: 580, y: 490, tag: 'mine approach' }, { x: 450, y: 560, tag: 'middle terrace' },
  { x: 300, y: 630, tag: 'lower mine terrace' }, { x: 440, y: 700, tag: 'mine landing' },
  { x: 580, y: 770, tag: 'lower approach' }, { x: 400, y: 840, tag: 'low terrace' },
  { x: 260, y: 910, tag: 'floor approach' }, { x: 440, y: 980, tag: 'floor' },
];

export const QUARRY_RETURN: QuarryWaypoint[] = [
  { x: 330, y: 980, tag: 'K' },
  { x: 180, y: 980, waitFor: { id: 'quarry-lift-c', y: 980 }, tag: 'wait C floor' },
  { x: 112, y: 980, tag: 'board C floor' }, { x: 112, y: 700, tag: 'C up' },
  { x: 220, y: 700, tag: 'C letter' }, { x: 450, y: 700, tag: 'mine checkpoint up' },
  { x: 540, y: 700, tag: 'B approach' }, { x: 625, y: 700, jump: true, tag: 'B lower dock' },
  { x: 625, y: 700, waitFor: { id: 'quarry-lift-b', y: 700 }, tag: 'wait B mine' },
  { x: 708, y: 700, tag: 'board B mine' }, { x: 708, y: 420, tag: 'B up' },
  { x: 625, y: 420, tag: 'B upper exit' }, { x: 540, y: 420, jump: true, tag: 'return main upper' },
  { x: 450, y: 420, tag: 'upper checkpoint up' }, { x: 370, y: 420, tag: 'O' },
  { x: 180, y: 420, waitFor: { id: 'quarry-lift-a', y: 420 }, tag: 'wait A upper' },
  { x: 112, y: 420, tag: 'board A upper' }, { x: 112, y: 140, tag: 'A up' },
  { x: 230, y: 140, tag: 'R' },
];

export const QUARRY_STARS: QuarryWaypoint[] = [
    ...QUARRY_DESCENT.slice(0,2), { x: 515, y: 280, tag: 'upper star approach' },
    { x: 630, y: 280, jump: true, tag: 'upper star outward jump' }, { x: 660, y: 280, tag: 'star 1' },
    { x: 620, y: 280, tag: 'upper star return approach' }, { x: 490, y: 210, jump: true, tag: 'upper star return jump' }, { x: 410, y: 280, tag: 'upper star reconnect' },
    ...QUARRY_DESCENT.slice(2,4), { x: 540, y: 420, tag: 'star 2 approach' },
    { x: 625, y: 420, jump: true, tag: 'star 2' }, { x: 540, y: 420, jump: true, tag: 'star 2 return' },
    ...QUARRY_DESCENT.slice(4,10), { x: 530, y: 840, tag: 'lower star approach' },
    { x: 630, y: 840, jump: true, tag: 'lower star outward jump' }, { x: 660, y: 840, tag: 'star 3' },
    { x: 620, y: 840, tag: 'lower star return approach' }, { x: 510, y: 770, jump: true, tag: 'lower star return jump' }, { x: 400, y: 840, tag: 'lower star reconnect' },
    ...QUARRY_DESCENT.slice(10),
];
