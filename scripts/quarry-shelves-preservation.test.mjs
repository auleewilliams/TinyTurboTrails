import { beforeQuarryRepresentative } from './quarry-representative-preservation.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeQuarryShelves } from './quarry-shelves-preservation.mjs';
const h = bytes => createHash('sha256').update(bytes).digest('hex');
const record = JSON.parse(readFileSync('assets/source/quarry/whole-ledges-v1/presentation-delta.json'));
test('projects only exact four-shelf presentation changes before the accepted byte oracles', () => {
  for (const [path, entry] of Object.entries(record.files)) {
    const current = beforeQuarryRepresentative(path, readFileSync(path)); assert.equal(h(beforeQuarryShelves(path, current)), entry.baselineSha256);
    const changed = Buffer.concat([current, Buffer.from('\n// unrelated\n')]);
    assert.throws(() => beforeQuarryShelves(path, changed), /exact Quarry/);
  }
});
