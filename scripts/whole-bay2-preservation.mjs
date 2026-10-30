import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const root=new URL('../assets/source/cove/bay2-whole-v1/',import.meta.url);
function record(){const bytes=readFileSync(new URL('presentation-delta.json',root));assert.equal(hash(bytes),'37a04f76904ea5c3ce0367a1641b73ee84fd4ac86eb48d435b501015049c4a99');return JSON.parse(bytes);}
export function beforeWholeBay2(path,bytes){
 const r=record(),entry=r.files[path];if(!entry)return bytes;
 assert.deepEqual(Object.keys(r.files).sort(),['src/world/cove-terrain.ts','src/world/sandy-cove.ts']);
 assert.equal(r.baselineRevision,'b371181142804185e66a6545efdfd99c5e5fc666');
 const baseline=readFileSync(new URL(entry.baselineCopy,root));assert.equal(hash(baseline),entry.baselineSha256);let expected=baseline.toString();
 for(const c of entry.changes){assert.ok(c.before.length&&expected.split(c.before).length===2);expected=expected.replace(c.before,c.after);}
 assert.equal(hash(Buffer.from(expected)),entry.currentSha256);assert.equal(bytes.toString(),expected,'only exact wholebay2/ONEgem literal');return baseline;
}
export function beforeWholeBay2Level(level){
 const r=record(),bytes=readFileSync(new URL('baseline/level.json',root));assert.equal(hash(bytes),r.levelBaselineSha256);
 const copy=structuredClone(level),gem=copy.entities.find(e=>e.id==='cove-bonus-4');assert.ok(gem);assert.deepEqual(gem,{id:'cove-bonus-4',kind:'gem',asset:'gem',x:3240,y:242,layer:'world'});gem.y=299;
 assert.deepEqual(copy,JSON.parse(bytes),'only ONE optionalgem may differ; completelevel remains strict');return copy;
}
