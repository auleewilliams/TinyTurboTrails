import type { TimberPilotStage } from './timbers-browser-pilot';
import { surfaceY } from '../src/game/movement';
import { SANDY_COVE } from '../src/world/sandy-cove';
const walk = (x: number): TimberPilotStage => ({ kind: 'walk', x });
const jump = (x: number, y: number): TimberPilotStage => ({ kind: 'jump', x, y });
export interface CoveRolloutRest { name: string; id: string; pose: 'standing' | 'underpass' | 'lower'; x: number; feet: number; stages: readonly TimberPilotStage[] }
const rest = (name: string, id: string, pose: CoveRolloutRest['pose'], x: number, stages: TimberPilotStage[], top?: number): CoveRolloutRest => ({ name, id, pose, x, feet: top ?? surfaceY(SANDY_COVE, x), stages });
/** Ordinary entrance-to-support route; no scene/player/clock/input state writes. */
export const COVE_ROLLOUT_RESTS: readonly CoveRolloutRest[] = [
  rest('hollow-under-forward','cove-hollow-shelf','underpass',1040,[walk(1040)]),
  rest('hollow-under-reverse','cove-hollow-shelf','underpass',1040,[walk(1160),walk(1040)]),
  rest('hollow-on','cove-hollow-shelf','standing',1040,[jump(1040,320),walk(1040)],320),
  rest('hollow-lower','cove-hollow-shelf','lower',960,[walk(960)]),
  rest('pool1-under-forward','cove-pool-stone-1','underpass',1750,[walk(1750)]),
  rest('pool1-under-reverse','cove-pool-stone-1','underpass',1750,[walk(1840),walk(1750)]),
  rest('pool1-on','cove-pool-stone-1','standing',1750,[walk(1690),jump(1750,296),walk(1750)],296),
  rest('pool1-lower','cove-pool-stone-1','lower',1840,[walk(1840)]),
  rest('pool2-under-forward','cove-pool-stone-2','underpass',2260,[walk(2260)]),
  rest('pool2-under-reverse','cove-pool-stone-2','underpass',2260,[walk(2340),walk(2260)]),
  rest('pool2-on','cove-pool-stone-2','standing',2260,[walk(2210),jump(2260,296),walk(2260)],296),
  rest('pool3-under-forward','cove-pool-stone-3','underpass',2420,[walk(2340),walk(2420)]),
  rest('pool3-under-reverse','cove-pool-stone-3','underpass',2420,[walk(2510),walk(2420)]),
  rest('pool3-on','cove-pool-stone-3','standing',2420,[walk(2380),jump(2420,284),walk(2420)],284),
  rest('pool3-lower','cove-pool-stone-3','lower',2350,[walk(2350)]),
  rest('frozen-bay1-on','cove-bay-ledge-1','standing',3020,[walk(2940),jump(3020,272),walk(3020)],272),
  rest('frozen-bay2-on','cove-bay-ledge-2','standing',3200,[walk(3080),jump(3170,260),walk(3200)],260),
  rest('bay3-under-forward','cove-bay-ledge-3','underpass',3360,[walk(3320),walk(3360)]),
  rest('bay3-under-reverse','cove-bay-ledge-3','underpass',3360,[walk(3550),walk(3360)]),
  rest('bay3-on','cove-bay-ledge-3','standing',3360,[jump(3360,272),walk(3360)],272),
  rest('bay3-lower-return','cove-bay-ledge-3','lower',3300,[walk(3300)]),
  rest('frozen-bay1-under-return','cove-bay-ledge-1','underpass',3020,[walk(3020)]),
];

export interface CoveRolloutRegion { name: string; rests: readonly CoveRolloutRest[] }
/** Partition only: every original rest object and input stage is retained exactly once. */
export const COVE_ROLLOUT_REGIONS: readonly CoveRolloutRegion[] = [
  { name: 'Hollow/Pools', rests: COVE_ROLLOUT_RESTS.slice(0,15) },
  { name: 'Bays', rests: COVE_ROLLOUT_RESTS.slice(15) },
];
