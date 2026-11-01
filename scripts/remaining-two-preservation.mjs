import {beforeBay3} from './bay3-preservation.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../assets/source/cove/remaining-two-v1/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
export function beforeRemainingTwo(path,bytes){
 bytes=beforeBay3(path,bytes);
 if(path!=='src/world/cove-terrain.ts')return bytes;
 const raw=readFileSync(new URL('presentation-delta.json',root));assert.equal(hash(raw),'d9d786f9ccf6aeb2885f5ec0a5bbc7ebfdd53cefaaa8ffaed394c733b7abfb24');const r=JSON.parse(raw);assert.equal(r.path,path);assert.equal(r.baselineRevision,'69bfa79d8fb96b395154a0f3dcb52450c32920ce');
 const baseline=readFileSync(new URL('baseline/cove-terrain.ts',root));assert.equal(hash(baseline),r.baselineSha256);let expected=baseline.toString();for(const c of r.changes){assert.equal(expected.split(c.before).length,2);expected=expected.replace(c.before,c.after);}assert.equal(hash(Buffer.from(expected)),r.currentSha256);assert.equal(bytes.toString(),expected,'only exact two-role presentation delta');return baseline;
}
