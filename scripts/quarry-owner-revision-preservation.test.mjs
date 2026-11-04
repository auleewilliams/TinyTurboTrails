import { projectQuarrySiteSource } from './quarry-site-integration.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { beforeQuarryOwnerRevision } from './quarry-owner-revision-preservation.mjs';
import { prepareRepresentative } from './quarry-representative.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const record = JSON.parse(readFileSync('docs/evidence/issue-240/owner-revision1/amendment.json'));

test('every owner-authorized source delta restores its exact prior whole-file identity', () => {
  assert.deepEqual(Object.keys(record.files).sort(), [
    'src/game/interactions.ts', 'src/world/level.ts', 'src/world/quarry-run.ts',
    'src/world/renderer.ts', 'src/world/slimes.ts',
  ]);
  for (const [path, entry] of Object.entries(record.files)) {
    const integrated = readFileSync(path), current = projectQuarrySiteSource(path, integrated, 'quarry'), prior = beforeQuarryOwnerRevision(path, integrated);
    assert.equal(hash(current), entry.currentSHA256, path);
    assert.equal(hash(prior), entry.priorSHA256, path);
    assert.equal(beforeQuarryOwnerRevision(path, prior), prior);
    for (const bad of [Buffer.concat([current, Buffer.from('// unrelated')]),
      Buffer.from(current.toString().replace(entry.after, entry.before))]) {
      if (hash(bad) === entry.priorSHA256) continue;
      assert.throws(() => beforeQuarryOwnerRevision(path, bad), /current owner amendment/);
    }
    // Even an unrelated byte change outside the authorized hunk must fail.
    const unrelated = Buffer.from(current);
    unrelated[0] ^= 1;
    assert.throws(() => beforeQuarryOwnerRevision(path, unrelated), /current owner amendment/);
  }
});

test('geometry, reward, costume, patrol and shared movement mutations remain rejected', () => {
  const mutations = [
    ['src/world/quarry-run.ts', "shelf('quarry-terrace-2', 280, 280, 240)", "shelf('quarry-terrace-2', 280, 280, 241)"],
    ['src/world/quarry-run.ts', 'seconds: 4, pause: 1.5', 'seconds: 3, pause: 1.5'],
    ['src/world/quarry-run.ts', '[340,122]', '[341,122]'],
    ['src/world/quarry-run.ts', "slimeAccessory: 'miner'", "slimeAccessory: 'straw'"],
    ['src/world/quarry-run.ts', 'minX: 350, maxX: 430', 'minX: 350, maxX: 431'],
    ['src/world/level.ts', "id: 'checkpoint-meadow', x: 740", "id: 'checkpoint-meadow', x: 741"],
    ['src/world/slimes.ts', 'SLIME_SPEED = 36', 'SLIME_SPEED = 37'],
    ['src/game/interactions.ts', 'SQUASH_BOUNCE_VELOCITY = 260', 'SQUASH_BOUNCE_VELOCITY = 261'],
    ['src/world/renderer.ts', "level.id !== 'quarry' &&", "level.id !== 'cove' &&"],
  ];
  for (const [path, from, to] of mutations) {
    const bytes = readFileSync(path), bad = Buffer.from(bytes.toString().replace(from, to));
    assert.notEqual(hash(bytes), hash(bad), path + ': real mutation');
    assert.throws(() => beforeQuarryOwnerRevision(path, bad), /current owner amendment/);
  }
});

test('real representative preparation still rejects altered frozen gameplay after the exact amendment', () => {
  const contract = readFileSync('assets/source/quarry/representative-v1/preparation-contract.json');
  for (const path of ['src/world/quarry-run.ts', 'src/game/interactions.ts', 'src/game/movement.ts']) {
    assert.throws(() => prepareRepresentative(contract, p => {
      const bytes = readFileSync(p);
      return p === path ? Buffer.concat([bytes, Buffer.from('// unrelated')]) : bytes;
    }), /current owner amendment|frozen gameplay/);
  }
});
