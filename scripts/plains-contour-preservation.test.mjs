import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforePlainsContour } from './plains-contour-preservation.mjs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const before = {
  "public/assets/plains/manifest.json": "5201702a38da318dbd0394bedf568a71bae43b0f1cbd92e193498ff4cf6d21fd",
  "src/world/level.ts": "626f85c1303f8934624eb2a02eda010db761b847265b07f1e0ba1f6c6b02cf23",
  "src/world/assets.ts": "9322228ed80f316a8e5a1fbe5707658f38334a54b2911c147b1de113a279499e",
  "src/world/renderer.ts": "c59b777d2462036f4c500a7e77cd5b76ba0cb4877c69e8b3dd9d79751cc19417",
  "src/world/trail-presentation.ts": "5d98d1b7a4caf27e12830e57a86de771e326c2649468d8569927de32191ca342"
};
const intendedAssertion = error => error?.code === 'ERR_ASSERTION';
function reject(path, mutate) {
  const original = read(path), corrupted = Buffer.from(mutate(original.toString('utf8')));
  assert.notEqual(hash(corrupted), hash(original), 'negative control actually changes input');
  assert.throws(() => beforePlainsContour(path, corrupted), intendedAssertion);
}
test('only five exact approved deltas reverse completely to the immutable source-head bytes', () => {
  for (const [path, pinned] of Object.entries(before)) {
    const current = read(path), projected = beforePlainsContour(path, current);
    assert.notEqual(hash(current), pinned);
    assert.equal(hash(projected), pinned, path);
    assert.throws(() => beforePlainsContour(path, projected), intendedAssertion, 'old bytes cannot masquerade as current approved linkage');
  }
});
test('every approved path rejects even unrelated trailing bytes through intended assertions', () => {
  for (const path of Object.keys(before)) reject(path, text => `${text} `);
});
test('metadata/path/anchor corruptions cannot hide behind the authorized grass declaration', () => {
  const path = 'public/assets/plains/manifest.json';
  reject(path, text => text.replace('  \"plainsContour\": \"contour-prototype-v1/grass.png\",\n', ''));
  reject(path, text => text.replace('contour-prototype-v1/grass.png', 'contour-prototype-v1/wrong.png'));
  reject(path, text => { const data = JSON.parse(text); data.cellSize++; return JSON.stringify(data, null, 2) + '\n'; });
  reject(path, text => { const data = JSON.parse(text); data.anchors.tree.y++; return JSON.stringify(data, null, 2) + '\n'; });
});
test('checkpoint, deferred flowers, other entity, terrain and bush changes are rejected', () => {
  const path = 'src/world/level.ts';
  reject(path, text => text.replace("id: 'checkpoint-meadow', x: 740", "id: 'checkpoint-meadow', x: 741"));
  reject(path, text => text.replace("[240, 'flowers']", "[241, 'flowers']"));
  reject(path, text => text.replace("id: 'spring-001'", "id: 'spring-corrupted'"));
  reject(path, text => text.replace("[772, 'bush']", "[773, 'bush']"));
  reject(path, text => text.replace('[620, 188]', '[620, 189]'));
  reject(path, text => text.replace('start: { x: 60, y: 206 }', 'start: { x: 61, y: 206 }'));
});
test('renderer/linkage and typed API corruptions reject rather than normalize a broader delta', () => {
  reject('src/world/renderer.ts', text => text.replace('drawPlainsContourGround(ctx, assets, level, offset)', 'drawPlainsContourGround(ctx, assets, level, { x: 1, y: 2 })'));
  reject('src/world/assets.ts', text => text.replace('naturalWidth !== 80', 'naturalWidth !== 81'));
  reject('src/world/trail-presentation.ts', text => text.replace('ctx.lineWidth = 7', 'ctx.lineWidth = 8'));
});
test('unlisted physics/HUD/other-trail bytes remain untouched and are rejected by byte oracles', () => {
  for (const [path, from, to] of [
    ['src/game/movement.ts', 'gravity: 1500', 'gravity: 1499'],
    ['src/game/hud.ts', 'export ', '// corruption\nexport '],
    ['public/assets/cove/manifest.json', '"image"', '"wrongImage"'],
  ]) {
    const original = read(path), bad = Buffer.from(original.toString('utf8').replace(from, to));
    assert.notDeepEqual(bad, original);
    assert.equal(beforePlainsContour(path, original), original, 'unknown paths remain identity');
    assert.equal(beforePlainsContour(path, bad), bad, 'no blanket exception');
    assert.throws(() => assert.equal(hash(beforePlainsContour(path, bad)), hash(original), `${path}: existing hash oracle`), intendedAssertion);
  }
});

test('C soil declaration/path/dimensions are an exact approved delta, not a broader exception', () => {
  reject('public/assets/plains/manifest.json', text => text.replace('  "plainsContourSoil": "contour-prototype-v1/soil.png",\n', ''));
  reject('public/assets/plains/manifest.json', text => text.replace('contour-prototype-v1/soil.png', 'contour-prototype-v1/other.png'));
  reject('src/world/assets.ts', text => text.replace('soil.naturalWidth !== 64', 'soil.naturalWidth !== 63'));
});
