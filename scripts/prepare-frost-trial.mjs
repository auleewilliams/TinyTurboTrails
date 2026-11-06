import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { decodePng, encodePng, crop, wholeImageAtHeight } from './timbers-art.mjs';
const source = new URL('../assets/source/frost/ledge-trial-v1/', import.meta.url);
const hash = b => createHash('sha256').update(b).digest('hex');
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
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const output = process.argv[2] ?? 'public/assets/frost/ledge-trial-v1';
  mkdirSync(output, { recursive: true });
  for (const [name, bytes] of prepareFrostTrial()) writeFileSync(`${output}/${name}`, bytes);
  console.log('Prepared exactly four whole Frost trial ledges');
}
