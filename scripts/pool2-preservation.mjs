import {beforePool1} from './pool1-preservation.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../assets/source/cove/pool2-b-v1/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
export function beforePool2(path,bytes){bytes=beforePool1(path,bytes);if(path!=='src/world/cove-terrain.ts')return bytes;const raw=readFileSync(new URL('presentation-delta.json',root));assert.equal(hash(raw),'5656a2baa53f6e2cb4ae3b0c4afdac49f92a51c1dc4d9cafed6fed993b05c9f6');const r=JSON.parse(raw);assert.equal(r.path,path);const baseline=readFileSync(new URL('baseline/cove-terrain.ts',root));assert.equal(hash(baseline),r.baselineSha256);let expected=baseline.toString();for(const c of r.changes){assert.equal(expected.split(c.before).length,2);expected=expected.replace(c.before,c.after);}assert.equal(hash(Buffer.from(expected)),r.currentSha256);assert.equal(bytes.toString(),expected,'only exact pool2 source delta');return baseline;}
