import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeQuarryRepresentative } from './quarry-representative-preservation.mjs';
import { beforeQuarryShelves } from './quarry-shelves-preservation.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const record = JSON.parse(readFileSync('assets/source/quarry/representative-v1/presentation-delta.json'));
const S = JSON.parse(readFileSync('assets/source/quarry/whole-ledges-v1/presentation-delta.json'));
test('new exact layer restores immutable S bytes and each named guard rejects mutations in its own domain', () => {
 for(const [path,p] of Object.entries(record.files)){
  const current=readFileSync(path),prior=beforeQuarryRepresentative(path,current);
  assert.equal(hash(prior),p.baselineSHA256);
  assert.equal(hash(beforeQuarryShelves(path,prior)),S.files[path].baselineSha256);
  assert.throws(()=>beforeQuarryRepresentative(path,Buffer.concat([current,Buffer.from('x')])),/exact (?:representative|approved floor)/);
  assert.throws(()=>beforeQuarryShelves(path,Buffer.concat([prior,Buffer.from('x')])),/exact Quarry pilot/);
  assert.equal(beforeQuarryRepresentative(path,prior),prior);
 }
 const gameplay=readFileSync('src/game/movement.ts');assert.equal(beforeQuarryRepresentative('src/game/movement.ts',gameplay),gameplay);
});
