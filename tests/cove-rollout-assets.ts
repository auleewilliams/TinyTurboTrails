import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SANDY_COVE } from '../src/world/sandy-cove';
import type { RolloutRole } from './cove-rollout-observer';
const art: Record<string, [string, number]> = {
  'cove-hollow-shelf':['whole-three-v1/hollow.png',30],
  'cove-pool-stone-1':['whole-three-v1/pool1.png',22],
  'cove-pool-stone-2':['whole-three-v1/pool2.png',18],
  'cove-pool-stone-3':['remaining-two-v1/pool3.png',18],
  'cove-bay-ledge-1':['bay1-b-v1/platform.png',30],
  'cove-bay-ledge-2':['bay2-whole-v1/platform.png',35],
  'cove-bay-ledge-3':['bay3-b-v1/platform.png',30],
};
export const rolloutRoles: (RolloutRole & { sha256: string })[] = SANDY_COVE.platforms!.map(p=>{
  const [file,height]=art[p.id],path='/assets/cove/'+file;
  return {id:p.id,path,x:p.from.x,top:p.from.y,width:p.width,height,sha256:createHash('sha256').update(readFileSync(new URL('../public'+path,import.meta.url))).digest('hex')};
});
export const changedRolloutRoles=rolloutRoles.filter(r=>!['cove-bay-ledge-1','cove-bay-ledge-2'].includes(r.id));
