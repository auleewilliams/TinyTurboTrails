import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforePlainsMerge, beforeTimbersMerge } from './timbers-plains-integration.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const record = JSON.parse(readFileSync(new URL('../docs/evidence/issue-241/main-integration/presentation-delta.json', import.meta.url)));
for (const [name, project] of Object.entries({ beforePlainsMerge, beforeTimbersMerge })) {
  test(`${name} restores exact parent bytes and rejects altered or historical input`, () => {
    for (const [path, entry] of Object.entries(record.projections[name])) {
      const bytes = readFileSync(path), baseline = project(path, bytes);
      assert.equal(hash(baseline), entry.baselineSha256, path);
      assert.throws(() => project(path, baseline), { code: 'ERR_ASSERTION' });
      assert.throws(() => project(path, Buffer.concat([bytes, Buffer.from(' ')])), { code: 'ERR_ASSERTION' });
      // Exercise every integrated hunk, including both trails' guards and drawing calls.
      for (const change of entry.changes) if (change.after) {
        const altered = Buffer.from(bytes.toString().replace(change.after, change.after + '// changed\n'));
        assert.notDeepEqual(altered, bytes);
        assert.throws(() => project(path, altered), { code: 'ERR_ASSERTION' });
      }
    }
    const untouched = readFileSync('src/game/movement.ts');
    assert.equal(project('src/game/movement.ts', untouched), untouched);
  });
}
