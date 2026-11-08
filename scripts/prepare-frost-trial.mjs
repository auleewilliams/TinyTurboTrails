import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { decodePng, encodePng, crop, wholeImageAtHeight } from './timbers-art.mjs';
import { assertPngPixelContract } from './png-pixel-contract.mjs';
const source = new URL('../assets/source/frost/ledge-trial-v1/', import.meta.url);
const hash = b => createHash('sha256').update(b).digest('hex');
/** Portable generated encoding; the approved committed encoding remains immutable. */
export function assertFrostPreparedPng(actual, committed, expected) {
  assert.equal(hash(committed), expected.pngSha256, 'immutable approved Frost PNG bytes');
  assertPngPixelContract(actual, committed, expected);
}
function transpose(image) {
  const data = new Uint8Array(image.data.length);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++)
    data.set(image.data.subarray((y * image.width + x) * 4, (y * image.width + x + 1) * 4), (x * image.height + y) * 4);
  return { width: image.height, height: image.width, data };
}
/** Shared exact integer-weight premultiplied sampler, transposed to set width.
 * BOTH axes use source.width/width; fractional final row has transparent ceil padding. */
export function wholeImageAtWidth(image, width) {
  if (!Number.isInteger(width) || width < 1 || width > image.width) throw new Error('Invalid Frost native width');
  return transpose(wholeImageAtHeight(transpose(image), width));
}
export function prepareFrostTrial() {
  const bytes = readFileSync(new URL('proposed-key63-NONCOMPLIANT-UNAPPROVED.png', source));
  assert.equal(hash(bytes), '6e45cee8032aef41d3eceb5bfe28baa04772172bcbc02363257795baa70d18b2');
  const sheet = decodePng(bytes), proof = JSON.parse(readFileSync(new URL('proof-checkpoint.json', source)));
  const assignments = [[4, 2, 180], [5, 4, 210], [9, 6, 200], [10, 5, 200]];
  const files = new Map(), platforms = {}, records = {};
  for (const [id, variant, width] of assignments) {
    // Original whole boxes encompass every retained pixel, including both ends.
    const [x, y, right, bottom] = proof.key31_components_unchanged_inventory[variant - 1].bbox;
    const rect = { x, y, width: right - x, height: bottom - y };
    const image = wholeImageAtWidth(crop(sheet, rect), width), png = encodePng(image);
    const name = `ledge-v${variant}-${width}.png`;
    files.set(name, png);
    platforms[`frost-return-${id}`] = { image: name, width, height: image.height, variant };
    records[name] = { sourceRect: rect, uniformRatio: [width, rect.width], width, height: image.height,
      pngSha256: hash(png), pixelSha256: hash(image.data) };
  }
  files.set('manifest.json', Buffer.from(JSON.stringify({ version: 1, diagnosticTrial: true, platforms }, null, 2) + '\n'));
  files.set('preparation.json', Buffer.from(JSON.stringify({ sourceSha256: hash(bytes), records,
    method: 'Whole component crop from surrounding transparent space; shared isotropic premultiplied integer-weight box sampler; transparent ceil padding only. No masks, repairs, notches, end/body crops, tiling or runtime scaling.',
    exception: 'human-trial-approval.json permits this exact key63 source for diagnostic preview only. Historical source-fit and clearance FAIL remain FAIL. Rounded rims, deep bodies and residual pink fringe retained; native readability UNPERFORMED.' }, null, 2) + '\n'));
  return files;
}
/** Additive owner-approved remaining placement preparation. Historical four-file output stays reproducible. */
export function prepareFrostExtension() {
  const baseline = JSON.parse(readFileSync(new URL('extension/presentation-delta.json', source)))['public/assets/frost/ledge-trial-v1/manifest.json'];
  const manifest = JSON.parse(baseline.before);
  assert.equal(hash(Buffer.from(baseline.before)), '82d36f58b4bdfaaadd1e24e33c2a2bfa26e866dd3feaa32c34c918407707c288');
  const files = new Map();
  for (const piece of Object.values(manifest.platforms)) {
    const png = readFileSync(new URL('../public/assets/frost/ledge-trial-v1/' + piece.image, import.meta.url));
    files.set(piece.image, png);
  }
  files.set('preparation.json', readFileSync(new URL('../public/assets/frost/ledge-trial-v1/preparation.json', import.meta.url)));
  const bytes = readFileSync(new URL('proposed-key63-NONCOMPLIANT-UNAPPROVED.png', source));
  assert.equal(hash(bytes), '6e45cee8032aef41d3eceb5bfe28baa04772172bcbc02363257795baa70d18b2');
  assert.equal(hash(files.get('preparation.json')), '131e93d19cbcd93a878bd5d89b54459feac217d45522cbec6c666aaec7fa5578');
  const acceptedRecords = JSON.parse(files.get('preparation.json')).records;
  for (const [name, record] of Object.entries(acceptedRecords)) assert.equal(hash(files.get(name)), record.pngSha256);
  const sheet = decodePng(bytes), records = {};
  for (const [id, variant, width, rect, expected, height, pixelSha256] of [
    [1, 1, 140, { x: 187, y: 116, width: 456, height: 78 }, '5897de57c44b1c194266519d6cae9c9558b294f64e2fce6fa14029c91f785f07', 24, '60f3a99cd187fb6b8d27ed31687384d5cc81acee443536eada856b81949229c6'],
    [2, 3, 190, { x: 102, y: 425, width: 628, height: 107 }, 'c9c938700b14b6bdd8e38250a9548361c9a9608d7c4c101d5e10e4336942504c', 33, '7c33ff4f5e0900ce5173dd376484733d540ef870441faccff421485ed71a75ea'],
  ]) {
    const image = wholeImageAtWidth(crop(sheet, rect), width), png = encodePng(image);
    const name = `ledge-v${variant}-${width}.png`;
    const committed = readFileSync(new URL('../public/assets/frost/ledge-trial-v1/' + name, import.meta.url));
    assertFrostPreparedPng(png, committed, { width, height, pixelSha256, pngSha256: expected });
    files.set(name, png);
    manifest.platforms[`frost-return-${id}`] = { image: name, width, height: image.height, variant };
    records[name] = { sourceRect: rect, uniformRatio: [width, rect.width], width, height: image.height,
      pngSha256: hash(png), pixelSha256: hash(image.data) };
  }
  const reused = files.get('ledge-v4-210.png');
  assert.equal(hash(reused), 'bdcfa27e460280365a5c6a6dfe77fa8b120ba44312c4c02669a70f3764081065');
  for (const id of [3, 6, 7, 8]) manifest.platforms[`frost-return-${id}`] = { ...manifest.platforms['frost-return-5'] };
  files.set('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  files.set('extension-preparation.json', Buffer.from(JSON.stringify({ sourceSha256: hash(bytes), records,
    reused: { image: 'ledge-v4-210.png', pngSha256: hash(reused), ids: [3, 6, 7, 8] },
    approval: 'assets/source/frost/ledge-trial-v1/extension/extension-approval.json', historicalPreparation: 'preparation.json',
    method: 'Shared wholeImageAtWidth equal-axis sampler; complete whole paint/body/ends, transparent ceil padding only. V4 exact-byte reuse. No source repair or geometry/pickup change.',
    limitations: 'Historical source/fit FAIL retained. Ground1 -4px/39 cells, ground8 -0.65px/2 cells, lower partial -6px and gem6 27 core-alpha253 intersections are disclosed model risks; native readability pending.' }, null, 2) + '\n'));
  return files;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const output = process.argv[2] ?? 'public/assets/frost/ledge-trial-v1';
  mkdirSync(output, { recursive: true });
  for (const [name, bytes] of prepareFrostExtension()) {
    // Accepted PNGs/preparation are copied only when preparing a separate output directory.
    if (output === 'public/assets/frost/ledge-trial-v1' && (name === 'preparation.json' || ['ledge-v2-180.png', 'ledge-v4-210.png', 'ledge-v6-200.png', 'ledge-v5-200.png'].includes(name))) continue;
    writeFileSync(`${output}/${name}`, bytes);
  }
  console.log('Prepared ten mappings: two additional whole sources and four exact V4 reuses; accepted four unchanged');
}
