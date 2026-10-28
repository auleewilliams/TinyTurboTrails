import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { transformSync } from 'rolldown/utils';
import { decodePng, isChromaKey } from './spelling-stickers.mjs';
import { prepareCoveKit } from './cove-terrain.mjs';

const root = new URL('../assets/source/cove/terrain-kit/', import.meta.url);
const read = name => readFileSync(new URL(name, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('actual generated Cove sources reproduce the complete RGBA atlas without losing cream', () => {
  const record = JSON.parse(read('preparation.json'));
  const sources = Object.fromEntries(['ground', 'platform'].map(name => [name, read(`${name}-source.png`)]));
  assert.equal(hash(sources.ground), 'd61a31eae616e347ba0e10182d37355d16b39733db93bdd077cc64a795825bb2');
  assert.equal(hash(sources.platform), 'ed16a3fbdfe9ece989c83a1c1f1eb2c9eeb47499150ce43335660575650e1f96');
  const result = prepareCoveKit(sources, record);
  assert.deepEqual(result.png, read('prepared/atlas.png'));
  assert.deepEqual(result.png, readFileSync(new URL('../public/assets/cove/terrain-kit/atlas.png', import.meta.url)));
  assert.equal(hash(result.image.data), record.pixelSha256);
  const atlas = decodePng(result.png);
  let transparent = 0, cream = 0;
  for (let i = 0; i < atlas.data.length; i += 4) {
    const [r, g, b, a] = atlas.data.subarray(i, i + 4);
    if (!a) { transparent++; assert.equal(r + g + b, 0); }
    else { assert.equal(isChromaKey(r, g, b), false, 'no opaque magenta fringe'); if (r > 220 && g > 190 && b > 130) cream++; }
  }
  assert.ok(transparent > 1000); assert.ok(cream > 100);
  for (const [name, part] of Object.entries(result.manifest.pieces)) {
    let visible = 0;
    for (let y = 0; y < part.height; y++) for (let x = 0; x < part.width; x++) {
      const alpha = atlas.data[((part.y + y) * atlas.width + part.x + x) * 4 + 3];
      if (alpha) visible++;
      if (name.startsWith('stone') && y === 0) assert.equal(alpha, 255, `${name} entire landing top`);
    }
    assert.ok(visible > part.width, `${name} nonempty actual-source crop`);
  }
  assert.throws(() => prepareCoveKit({ ...sources, ground: Buffer.alloc(0) }, record), /source/i);
});

test('generation metadata retains actual prompts and all requested/reported discrepancies', () => {
  const generation = JSON.parse(read('generation-record.json'));
  assert.equal(generation.ground.reported_quality, 'low');
  assert.equal(generation.platform.requested_size, '1536x1024');
  assert.equal(generation.platform.pixel_size, '1774x887');
  assert.match(generation.platform.prompt, /1024x512/);
  assert.match(generation.draft_prompt_note, /draft/i);
});

test('real prepared stone pixels cover every support top and respect native depth, repeats and hollow taper', () => {
  const names = ['game/movement.ts', 'game/platforms.ts', 'world/sandy-cove.ts', 'world/cove-terrain.ts'];
  const code = names.map(name => transformSync(name, readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code).join('\n');
  const { draw, bodies, validate, repeat } = new Function(`${code}\nreturn { draw: drawCovePlatform, bodies: platformBodiesAt(SANDY_COVE.platforms,0), validate: validateCoveTerrain, repeat: coveRepeatColumn };`)();
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/terrain-kit/manifest.json', import.meta.url)));
  const atlas = decodePng(read('prepared/atlas.png'));
  const kit = { image: atlas, manifest };
  validate(manifest);
  for (const mutate of [m => m.width--, m => m.pieces['stone-thin-left'].height++, m => m.pieces['sand-fill'].x = NaN,
    m => m.pieces['sand-fill'].x = 250, m => m.pieces['stone-thin-left'].x = m.pieces['stone-thin-repeat'].x]) {
    const bad = structuredClone(manifest); mutate(bad); assert.throws(() => validate(bad), /Cove terrain/);
  }
  const level = JSON.parse(read('geometry-pin.json'));
  for (const body of bodies) for (const offset of [{ x: 0, y: 0 }, { x: 800.25, y: 220.5 }]) {
    const calls = [], ctx = { save() {}, restore() {}, drawImage(...args) { calls.push(args); } };
    draw(ctx, kit, level, body, offset);
    assert.equal(calls.length, body.width, body.id);
    const pixels = Array.from({ length: body.width }, () => []);
    for (const [image, sx, sy, sw, sh, dx, dy, dw, dh] of calls) {
      assert.equal(image, atlas); assert.equal(sw, 1); assert.equal(dw, 1); assert.equal(sh, dh, 'crop without vertical squeezing');
      assert.equal(dy, body.y - offset.y); assert.ok(dh >= 1 && dh <= (body.id.includes('shelf') || /stone-[12]$/.test(body.id) ? 6 : 12));
      const x = dx + offset.x - body.x; assert.ok(x >= 0 && x < body.width);
      for (let y = 0; y < sh; y++) pixels[x][y] = [...atlas.data.subarray(((sy + y) * atlas.width + sx) * 4, ((sy + y) * atlas.width + sx) * 4 + 4)];
    }
    for (const column of pixels) assert.equal(column[0][3], 255, 'actual pixels cover entire collision top');
    for (const x of [16, body.width - 16]) for (let y = 0; y < Math.min(pixels[x].length, pixels[x - 1].length); y++) {
      const a = pixels[x][y], b = pixels[x - 1][y];
      if (a[3] && b[3]) assert.ok(a.slice(0, 3).reduce((n, v, i) => n + Math.abs(v - b[i]), 0) <= 360, `${body.id} actual cap seam`);
    }
    if (body.id === 'cove-hollow-shelf') { assert.equal(pixels[0].length, 6); assert.equal(pixels.at(-1).length, 1); }
  }
  for (const width of [32, 64]) for (let boundary = -width * 2; boundary <= width * 3; boundary += width) {
    assert.equal(repeat(boundary - 1, width), repeat(boundary, width), 'mirrored native repeats share identical actual edge columns');
  }
});

test('all approved existing images/provenance and gameplay declarations remain byte-for-byte pinned', () => {
  const pins = JSON.parse(read('preserved-files.json'));
  for (const pin of pins.files) assert.equal(hash(readFileSync(new URL(`../${pin.path}`, import.meta.url))), pin.sha256, pin.path);
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/manifest.json', import.meta.url)));
  assert.equal(manifest.terrainKit, 'terrain-kit/manifest.json'); delete manifest.terrainKit;
  assert.deepEqual(manifest, pins.coveManifestBefore, 'existing world metadata is unchanged apart from additive linkage');
});
