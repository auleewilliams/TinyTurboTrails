import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { transformSync } from 'rolldown/utils';
import { modeDownsample } from './interface-kit.mjs';
import { decodePng, isChromaKey, removeEdgeKey } from './spelling-stickers.mjs';
import { prepareCoveKit } from './cove-terrain.mjs';

const root = new URL('../assets/source/cove/terrain-kit/', import.meta.url);
const read = name => readFileSync(new URL(name, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('all modules of each material use one exact isotropic source/native scale', () => {
  const record = JSON.parse(read('preparation.json'));
  const scales = new Map();
  for (const [name, part] of Object.entries(record.pieces)) {
    const sx = part.crop.width / part.output.width, sy = part.crop.height / part.output.height;
    assert.equal(sx, sy, `${name}: no anisotropic preparation`);
    const material = part.source;
    if (scales.has(material)) assert.equal(sx, scales.get(material), `${name}: same material grain scale`);
    scales.set(material, sx);
  }
});

test('actual generated Cove sources reproduce the complete RGBA atlas without losing cream', () => {
  const record = JSON.parse(read('preparation.json'));
  const sources = Object.fromEntries(['ground', 'platform'].map(name => [name, read(`${name}-source.png`)]));
  assert.equal(hash(sources.ground), 'd61a31eae616e347ba0e10182d37355d16b39733db93bdd077cc64a795825bb2');
  assert.equal(hash(sources.platform), 'ed16a3fbdfe9ece989c83a1c1f1eb2c9eeb47499150ce43335660575650e1f96');
  const result = prepareCoveKit(sources, record, JSON.parse(read('geometry-pin.json')));
  assert.deepEqual(result.png, read('prepared/atlas.png'));
  assert.deepEqual(result.png, readFileSync(new URL('../public/assets/cove/terrain-kit/atlas.png', import.meta.url)));
  assert.equal(hash(result.image.data), record.pixelSha256);
  assert.deepEqual(result.groundPng, read('prepared/ground.png'));
  assert.equal(hash(result.ground.data), record.groundPixelSha256);
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
  assert.throws(() => prepareCoveKit({ ...sources, ground: Buffer.alloc(0) }, record, JSON.parse(read('geometry-pin.json'))), /source/i);
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
    assert.equal(calls.length, 1, body.id);
    const [image, sx, sy, sw, sh, dx, dy, dw, dh] = calls[0];
    assert.equal(image, atlas); assert.equal(sw, body.width); assert.equal(sw, dw); assert.equal(sh, dh);
    assert.equal(dx, body.x - offset.x); assert.equal(dy, body.y - offset.y);
    const cap = body.id.includes('shelf') || /stone-[12]$/.test(body.id) ? 14 : 12;
    for (const x of [cap, sw - cap]) for (let y = 0; y < sh; y++) {
      const a = atlas.data.subarray(((sy + y) * atlas.width + sx + x) * 4, ((sy + y) * atlas.width + sx + x) * 4 + 4);
      const b = atlas.data.subarray(((sy + y) * atlas.width + sx + x - 1) * 4, ((sy + y) * atlas.width + sx + x - 1) * 4 + 4);
      if (a[3] && b[3]) assert.ok(a.slice(0, 3).reduce((n, v, i) => n + Math.abs(v - b[i]), 0) <= 360, `${body.id} actual cap seam`);
    }
    const limit = body.id.includes('shelf') || /stone-[12]$/.test(body.id) ? 6 : 12;
    assert.ok(sh <= limit);
    for (let x = 0; x < sw; x++) {
      assert.equal(atlas.data[(sy * atlas.width + sx + x) * 4 + 3], 255, 'entire actual collision top');
      if (body.id === 'cove-hollow-shelf') {
        const top = level.surfaces.find(s => body.x + x >= s.x1 && body.x + x <= s.x2);
        const gy = top.y1 + (top.y2 - top.y1) * (body.x + x - top.x1) / (top.x2 - top.x1);
        const depth = Math.min(6, Math.max(1, Math.floor(gy - body.y - 42)));
        for (let y = depth; y < sh; y++) assert.equal(atlas.data[((sy + y) * atlas.width + sx + x) * 4 + 3], 0, 'taper masks source pixels without squeezing');
      }
    }
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

test('all 13 slope starts and ends bake in-range junction columns and exact adjacent source pixels', () => {
  const record = JSON.parse(read('preparation.json')), level = JSON.parse(read('geometry-pin.json'));
  const sources = Object.fromEntries(['ground', 'platform'].map(name => [name, read(`${name}-source.png`)]));
  const result = prepareCoveKit(sources, record, level);
  // Independent oracle: derive native pieces directly from the original ground sheet,
  // then assign columns by the latest authored start, never by the producer's lookup.
  const keyed = removeEdgeKey(decodePng(sources.ground)).image;
  const parts = Object.fromEntries(Object.entries(record.pieces).filter(([, p]) => p.source === 'ground')
    .map(([name, p]) => [name, modeDownsample(keyed, p.crop, p.output.width, p.output.height)]));
  const rgba = (image, x, y) => {
    assert.ok(x >= 0 && x < image.width && y >= 0 && y < image.height, `source coordinate ${x},${y} in ${image.width}x${image.height}`);
    return [...image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4)];
  };
  const mirror = (value, width) => { const n = value % (width * 2); return n < width ? n : width * 2 - 1 - n; };
  const slopes = level.surfaces.filter(s => s.y1 !== s.y2), mismatches = [];
  assert.equal(slopes.length, 13);
  for (const slope of slopes) for (const edge of ['start', 'end']) {
    const boundary = edge === 'start' ? slope.x1 : slope.x2, columns = new Set();
    // Entire 16-column junction window, plus its outside boundary and adjacent columns.
    const first = edge === 'start' ? boundary - 1 : boundary - 17;
    const last = edge === 'start' ? boundary + 16 : boundary + 1;
    for (let x = first; x <= last; x++) {
      const owner = level.surfaces.findLast(s => s.x1 <= x);
      const top = Math.floor(owner.y1 + (owner.y2 - owner.y1) * (x - owner.x1) / (owner.x2 - owner.x1));
      const junctionColumn = edge === 'start' ? x - slope.x1 : x - slope.x2 + 16;
      if (junctionColumn >= 0 && junctionColumn < 16) {
        assert.equal(owner, slope, `${edge} ${boundary} column ${junctionColumn} belongs to slope`);
        columns.add(junctionColumn);
      }
      for (let depth = 0; depth <= 16; depth++) {
        const fill = parts['sand-fill'];
        let expected = rgba(fill, mirror(x, fill.width), mirror(top + depth, fill.height));
        const lip = parts[owner.material === 'water' ? 'wet-sand-lip' : 'sand-lip'];
        let paint = depth < lip.height ? rgba(lip, mirror(x, lip.width), depth) : null;
        const rising = owner.y2 < owner.y1;
        if (owner.y1 !== owner.y2 && depth < 16) {
          const startColumn = x - owner.x1, endColumn = x - (owner.x2 - 16);
          const atStart = startColumn >= 0 && startColumn < 16, atEnd = endColumn >= 0 && endColumn < 16;
          if (atStart || atEnd) {
            const name = rising ? (atEnd ? 'up-to-flat' : 'flat-to-up') : (atEnd ? 'down-to-flat' : 'flat-to-down');
            paint = rgba(parts[name], atEnd ? endColumn : startColumn, depth);
          }
        }
        if (paint?.[3]) expected = paint;
        const actual = rgba(result.ground, x, top + depth);
        if (!actual.every((value, i) => value === expected[i])) mismatches.push({ edge, boundary, x, depth, expected, actual });
      }
    }
    assert.deepEqual([...columns].sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i), `${edge} ${boundary} uses source columns 0..15 exactly`);
  }
  // J1 must not move the existing water/sand pixels at unrelated flat joins.
  for (let i = 1; i < level.surfaces.length; i++) {
    const previous = level.surfaces[i - 1], next = level.surfaces[i];
    if (previous.y1 !== previous.y2 || next.y1 !== next.y2 || previous.material === next.material) continue;
    const x = next.x1, top = next.y1;
    for (let depth = 0; depth <= 16; depth++) {
      const lip = parts[previous.material === 'water' ? 'wet-sand-lip' : 'sand-lip'], fill = parts['sand-fill'];
      const paint = depth < lip.height ? rgba(lip, mirror(x, lip.width), depth) : null;
      const expected = paint?.[3] ? paint : rgba(fill, mirror(x, fill.width), mirror(top + depth, fill.height));
      assert.deepEqual(rgba(result.ground, x, top + depth), expected, `unchanged flat material boundary ${x} depth ${depth}`);
    }
  }
  assert.equal(mismatches.length, 0, JSON.stringify({ mismatchCount: mismatches.length, first: mismatches.slice(0, 12) }));
});
