import { beforeQuarryOwnerRevision } from './quarry-owner-revision-preservation.mjs';
import { beforeSiteArt } from './site-art-preservation.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforeTimbersOwnerFeedback } from './timbers-owner-feedback.mjs';

test('owner feedback restores the full pre-feedback files and rejects any other edits', () => {
  const record = JSON.parse(readFileSync('docs/evidence/issue-241/owner-feedback/presentation-delta.json'));
  assert.deepEqual(Object.keys(record.files).sort(), ['public/assets/timbers/manifest.json', 'src/game/interactions.ts', 'src/world/renderer.ts', 'src/world/treetop-timbers.ts']);
  for (const [path, entry] of Object.entries(record.files)) {
    // Reverse the exact Sunset integration before mutating historical Timbers hunks.
    const bytes = beforeSiteArt(path, readFileSync(path)), baseline = beforeTimbersOwnerFeedback(path, bytes);
    assert.equal(createHash('sha256').update(baseline).digest('hex'), entry.baselineSha256);
    assert.throws(() => beforeTimbersOwnerFeedback(path, baseline));
    assert.throws(() => beforeTimbersOwnerFeedback(path, Buffer.concat([bytes, Buffer.from(' ')])));
    const mutationDomain = beforeQuarryOwnerRevision(path, bytes);
    for (const change of entry.changes) {
      const altered = Buffer.from(mutationDomain.toString().replace(change.after, '// missing authorized change\n'));
      assert.notDeepEqual(altered, mutationDomain);
      assert.throws(() => beforeTimbersOwnerFeedback(path, altered));
    }
  }
});
