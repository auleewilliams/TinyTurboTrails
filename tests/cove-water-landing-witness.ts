import type { MovingPlatform } from '../src/game/platforms';
export interface DryLandingTarget { id: string; left: number; right: number; top: number }
export function coveDryLandingTarget(platforms: readonly MovingPlatform[]): DryLandingTarget {
  const matches=platforms.filter(p=>p.id==='cove-pool-stone-1');
  if(matches.length!==1)throw new Error('Expected exactly one authored Cove pool1');
  const p=matches[0];
  if(p.from.x!==p.to.x||p.from.y!==p.to.y||!Number.isFinite(p.from.x)||!Number.isFinite(p.from.y)||!Number.isFinite(p.width)||p.width<=0)throw new Error('Invalid fixed Cove pool1 support');
  return {id:p.id,left:p.from.x,right:p.from.x+p.width,top:p.from.y};
}
/** Shared actual-observer contact gate; self-contained for addInitScript serialization. */
export function isCoveLandingContact(kind: string, x: number, feet: number, target: DryLandingTarget): boolean {
  if(kind==='splash')return feet===344&&x>1809&&x<1851;
  return kind==='dust'&&feet===target.top&&x>=target.left&&x<=target.right;
}
