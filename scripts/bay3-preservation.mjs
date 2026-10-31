import {beforePool2} from './pool2-preservation.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../assets/source/cove/bay3-b-v1/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
export function beforeBay3(path,bytes){bytes=beforePool2(path,bytes);if(path!=='src/world/cove-terrain.ts')return bytes;const raw=readFileSync(new URL('presentation-delta.json',root));assert.equal(hash(raw),'c99d97096c174bcc0fca073de442cbc879913729f60062b0c044185764cce8a3');const r=JSON.parse(raw);assert.equal(r.path,path);const baseline=readFileSync(new URL('baseline/cove-terrain.ts',root));assert.equal(hash(baseline),r.baselineSha256);let expected=baseline.toString();for(const c of r.changes){assert.equal(expected.split(c.before).length,2);expected=expected.replace(c.before,c.after);}assert.equal(hash(Buffer.from(expected)),r.currentSha256);assert.equal(bytes.toString(),expected,'only exact bay3 source delta');return baseline;}
