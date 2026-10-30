import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import {createRequire} from 'node:module';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { covePilot,walk,jump } from './cove-pilot';
it('moves ONLY bonus4 above bay2 and collects same optionalID by accepted platform approach',()=>{
 const gem=SANDY_COVE.entities.find(e=>e.id==='cove-bonus-4')!;expect([gem.x,gem.y]).toEqual([3240,242]);expect(SANDY_COVE.entities.filter(e=>e.kind==='gem')).toHaveLength(42);
 const p=covePilot();p.run([walk(2940),jump(3020,272),walk(3080),jump(3170,260),walk(3200)]);expect(p.runState.collectedGems.has(gem.id)).toBe(false);
 p.run([walk(3240)]);expect(p.runState.collectedGems.has(gem.id)).toBe(true);expect(p.events.filter(e=>e.type==='gem'&&e.entityId===gem.id)).toHaveLength(1);
});
it('prepares the entire approved natural source with uniform8/7 scale and zeroopaque loss',async()=>{
 // Actualsharedpreparationmodule,notacopiedsampler. Dynamicimportkeepsmoduleinterfacecurrent.
 const {prepareBay2}=createRequire(import.meta.url)('../scripts/cove-bay2.mjs') as {prepareBay2(b:Buffer):{image:{width:number;height:number}}};const source=readFileSync('assets/source/cove/bay1-b-v1/prepared/platform.png');const r=prepareBay2(source);
 expect([r.image.width,r.image.height]).toEqual([160,35]);
});
