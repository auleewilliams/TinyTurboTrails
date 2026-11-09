import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = readFileSync(new URL('../assets/source/hud-top-ribbon/presentation-delta.json', import.meta.url));
assert.equal(hash(raw), 'dd9d329d7e4f74cb676f7ff3df18da328b1138f9fce7fe4cc60e738bbecfc883', 'sealed top ribbon relocation');
export const hudRibbonRecord = JSON.parse(raw);
// Separate layer: only the corrected fixture may return to the sealed 95 bytes.
const fixtureRaw = readFileSync(new URL('../assets/source/hud-top-ribbon/fixture-oracle-delta.json', import.meta.url));
assert.equal(hash(fixtureRaw), '5b27ef44503692c4d5f0498bf69e384e0f247a3dd8f25cceaf9b551f26f98b6c', 'sealed fixture-only oracle correction');
export const hudFixtureRecord = JSON.parse(fixtureRaw);
export function beforeHudFixture(path, bytes) {
  const entry = hudFixtureRecord.files[path];
  if (!entry || hash(bytes) !== entry.currentSHA256) return bytes;
  let text = bytes.toString();
  for (const change of [...entry.changes].reverse()) {
    assert.equal(text.split(change.after).length, 2, 'unique fixture oracle hunk');
    text = text.replace(change.after, change.before);
  }
  const prior = Buffer.from(text);
  assert.equal(hash(prior), entry.beforeSHA256, 'complete sealed 95 fixture source');
  return prior;
}
/** Exact relocation/observer bytes only; historical pins remain independent. */
export function beforeHudRibbon(path, bytes) {
  bytes = beforeHudFixture(path, bytes);
  const entry = hudRibbonRecord[path];
  if (!entry || hash(bytes) !== entry.currentSHA256) return bytes;
  let text = bytes.toString();
  for (const change of [...entry.changes].reverse()) {
    assert.equal(text.split(change.after).length, 2, 'unique relocation hunk');
    text = text.replace(change.after, change.before);
  }
  const prior = Buffer.from(text);
  assert.equal(hash(prior), entry.beforeSHA256, 'complete pre-relocation source');
  return prior;
}
