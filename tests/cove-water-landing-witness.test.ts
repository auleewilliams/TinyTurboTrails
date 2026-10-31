import {expect,it} from 'vitest';
import {SANDY_COVE} from '../src/world/sandy-cove';
import {coveDryLandingTarget,isCoveLandingContact} from './cove-water-landing-witness';
it('accepts the actual failed-trace dry contact at authored pool1 plane, rejecting obsolete/other contacts',()=>{
 const target=coveDryLandingTarget(SANDY_COVE.platforms!);expect(target).toEqual({id:'cove-pool-stone-1',left:1700,right:1800,top:283});
 expect(isCoveLandingContact('dust',1746,283,target)).toBe(true);
 expect(isCoveLandingContact('dust',1746,296,target)).toBe(false);
 expect(isCoveLandingContact('dust',1750,344,target)).toBe(false);
 for(const x of [target.left,target.right])expect(isCoveLandingContact('dust',x,target.top,target)).toBe(true);
 for(const x of [target.left-.001,target.right+.001])expect(isCoveLandingContact('dust',x,target.top,target)).toBe(false);
});
it('preserves exact water shared-edge boundaries and rejects missing/duplicate/moving/empty targets',()=>{
 const target=coveDryLandingTarget(SANDY_COVE.platforms!);expect(isCoveLandingContact('splash',1830,344,target)).toBe(true);
 for(const [x,feet]of [[1809,344],[1851,344],[1830,343],[1830,345]])expect(isCoveLandingContact('splash',x,feet,target)).toBe(false);
 expect(()=>coveDryLandingTarget([])).toThrow();const p=SANDY_COVE.platforms!.find(p=>p.id===target.id)!;
 expect(()=>coveDryLandingTarget([p,p])).toThrow();for(const change of [{...p,width:0},{...p,to:{...p.to,y:p.to.y+1}},{...p,to:{...p.to,x:p.to.x+1}}])expect(()=>coveDryLandingTarget([change])).toThrow();
});

it('executes the same serialized self-contained gate supplied to the actual browser observer',()=>{const gate=new Function(`return (${isCoveLandingContact.toString()});`)() as typeof isCoveLandingContact,target=coveDryLandingTarget(SANDY_COVE.platforms!);expect(gate('dust',1746,283,target)).toBe(true);expect(gate('dust',1746,296,target)).toBe(false);expect(gate('splash',1830,344,target)).toBe(true);expect(gate('dust',target.right+.001,target.top,target)).toBe(false);});
