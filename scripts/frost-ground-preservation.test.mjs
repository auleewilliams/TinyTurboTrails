import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforeFrostGround, frostGroundRecord, frostGroundBindings, verifyFrostGroundFiles } from './frost-ground-preservation.mjs';
import { beforeFrostExtension } from './frost-extension-preservation.mjs';
import { beforeFrostTrial } from './frost-trial-preservation.mjs';
import { frostSlimeRecord } from './frost-slime-preservation.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
test('bounded ground projection admits only complete exact final presentation bytes before the historical chain', () => {
  assert.deepEqual(Object.keys(frostGroundRecord).sort(), ['public/assets/frost/manifest.json', 'scripts/frost-extension-preservation.mjs', 'src/game/adventure-scene.ts', 'src/world/assets.ts', 'src/world/renderer.ts', 'tests/browser.spec.ts', 'tests/hud-owner-layout.spec.ts', 'tests/renderer-fixtures.test.ts', 'tests/world-assets.test.ts']);
  for (const [path, entry] of Object.entries(frostGroundRecord)) {
    const bytes = readFileSync(path), before = beforeFrostGround(path, bytes);
    assert.equal(hash(bytes), entry.currentSHA256, path);
    assert.equal(hash(before), entry.beforeSHA256, path);
    for (const bad of [Buffer.concat([bytes, Buffer.from(' ')]), Buffer.from(bytes.toString().replace(/Frost|frost/, 'CORRUPT'))]) {
      assert.notDeepEqual(bad, bytes); assert.equal(beforeFrostGround(path, bad), bad);
      assert.equal(beforeFrostExtension(path, bad), bad); assert.equal(beforeFrostTrial(path, bad), bad);
    }
  }
  const geometry = readFileSync('src/world/frost-ridge.ts');
  assert.equal(hash(beforeFrostGround('src/world/frost-ridge.ts', geometry)), frostSlimeRecord['src/world/frost-ridge.ts'].beforeSHA256);
  for (const p of ['src/game/movement.ts', 'public/assets/frost/ledge-trial-v1/manifest.json']) {
    const b = readFileSync(p); assert.equal(beforeFrostGround(p, b), b);
  }
});

test('new material, source packet and helper identities reject corruption independently of historical projections', () => {
  verifyFrostGroundFiles();
  for (const path of ['src/world/frost-ground.ts', 'public/assets/frost/ground-ice-v1/terrain.png', 'public/assets/frost/ground-ice-v1/ice.png', 'assets/source/frost/ground-ice-v1/Terrain1-raw.png', 'assets/source/frost/ground-ice-v1/Ice1-raw.png']) {
    assert.ok(frostGroundBindings[path]);
    assert.throws(() => verifyFrostGroundFiles(url => {
      const bytes = readFileSync(url);
      return url.pathname.endsWith('/' + path) ? Buffer.concat([bytes, Buffer.from('corrupt')]) : bytes;
    }), /exact bounded source\/asset bytes/);
  }
});
