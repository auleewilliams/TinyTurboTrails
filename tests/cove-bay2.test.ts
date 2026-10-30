import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { drawCovePlatform, type CoveTerrainAssets } from '../src/world/cove-terrain';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { platformBodyAt } from '../src/game/platforms';
it('routes EXACT bay2 to whole160x35, preserves every other support and fractional camera',()=>{
 const manifest=JSON.parse(readFileSync('public/assets/cove/terrain-kit/manifest.json','utf8'));
 const image={},bay1={},bay2={},calls:unknown[][]=[];
 const ctx={save(){},restore(){},drawImage(...args:unknown[]){calls.push(args);}} as unknown as CanvasRenderingContext2D;
 const kit={manifest,image,ground:{},bay1,bay2} as unknown as CoveTerrainAssets;
 for(const p of SANDY_COVE.platforms!){calls.length=0;drawCovePlatform(ctx,kit,SANDY_COVE,platformBodyAt(p,0),{x:.25,y:.5});const c=calls[0];expect(c).toBeDefined();
 if(p.id==='cove-bay-ledge-2')expect(c).toEqual([bay2,0,0,160,35,p.from.x-.25,p.from.y-.5,160,35]);
 else expect(c[0]).toBe(p.id==='cove-bay-ledge-1'?bay1:image);
 }
});

it('keeps old-kit fallback when optional bay2 image is absent, rejects wrong exact-ID width and restores state',()=>{
 const manifest=JSON.parse(readFileSync('public/assets/cove/terrain-kit/manifest.json','utf8')),image={};
 const body=platformBodyAt(SANDY_COVE.platforms!.find(p=>p.id==='cove-bay-ledge-2')!,0),calls:unknown[][]=[];
 let balance=0;const ctx={save(){balance++;},restore(){balance--;},drawImage(...a:unknown[]){calls.push(a);}} as unknown as CanvasRenderingContext2D;
 drawCovePlatform(ctx,{manifest,image,ground:{}} as unknown as CoveTerrainAssets,SANDY_COVE,body,{x:0,y:0});
 expect(calls[0][0]).toBe(image);expect(calls[0].slice(3,5)).toEqual([160,12]);expect(balance).toBe(0);
 const kit={manifest,image,ground:{},bay2:{}} as unknown as CoveTerrainAssets;
 expect(()=>drawCovePlatform(ctx,kit,SANDY_COVE,{...body,width:159},{x:0,y:0})).toThrow('width');
 const throwing={save(){balance++;},restore(){balance--;},drawImage(){throw Error('draw failure');}} as unknown as CanvasRenderingContext2D;
 expect(()=>drawCovePlatform(throwing,kit,SANDY_COVE,body,{x:0,y:0})).toThrow('draw failure');expect(balance).toBe(0);
});

it('accepts the preview approach/rest/lower-return in the unchanged physical simulation (not native gameplay)',async()=>{
 const {covePilot,walk,jump}=await import('./cove-pilot');const p=covePilot();
 p.run([walk(3140),walk(3240),walk(3320),walk(3240)]);expect(p.player.y+34).toBe(344);
 p.run([walk(2940),jump(3020,272),walk(3080),jump(3170,260),walk(3210)]);
 expect(p.player.platformId).toBe('cove-bay-ledge-2');expect(p.player.y+34).toBe(260);expect(Math.abs(p.player.vx)).toBeLessThan(20);
 p.run([walk(3280),walk(3320)]);expect(p.player.y+34).toBe(344);
});
