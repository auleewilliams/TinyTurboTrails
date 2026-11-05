import { beforeQuarryRollout } from './quarry-rollout-preservation.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = new URL('../assets/source/quarry/representative-v1/', import.meta.url);
const raw = readFileSync(new URL('presentation-delta.json', root));
assert.equal(hash(raw), '9b6cae9fdd0854d6d1d693219408d58a04ffe9a8784afcfd83ee78f6ffb050bf', 'sealed representative delta');
const record = JSON.parse(raw);
/** Reverse only the precise twelve additions, before immutable four-S and older layers. */
export function beforeQuarryRepresentative(path, bytes) {
 const p=record.files[path];if(!p)return bytes;
 if(hash(bytes)===p.baselineSHA256)return bytes;
 bytes = beforeQuarryRollout(path, bytes);
 assert.equal(hash(bytes),p.currentSHA256,`${path}: exact representative delta`);
 const baseline=readFileSync(new URL('baseline/'+p.baselineCopy,root));assert.equal(hash(baseline),p.baselineSHA256);return baseline;
}
