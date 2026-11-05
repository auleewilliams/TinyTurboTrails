import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { decodePng } from './spelling-stickers.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');

/** Exact-source preparation, with no family-wide repair or threshold allowance. */
export function prepareQuarryMasters(sourceBytes, contract, ledgerBytes, approvedBytes) {
  assert.equal(contract.sourceSHA256, '5e53a2214b9325d8cd16442d6a57093ea49f549b675a6f6527b88f60d9c04188', 'approved source identity');
  assert.equal(contract.ledgerSHA256, '89cc39afc94163e838c3afbcc4b7b7758711f9a51c4ded074690ff66e21be2fc', 'approved ledger identity');
  const pixelPins = { '400': 'f9ff17da3b95945b49943a4111f0d9845af6f1bf5a9c571d43b23ad40a300bd8', '240': 'ac84555e234c03006b1ec2b997a4dd1e5c8188977fc947a6f87240e02a666c8a', '160': 'b90c55fe341b1eefbf697c66fdc7e3a72d2f5f8fea51337154533f59f779da11' };
  assert.equal(hash(sourceBytes), contract.sourceSHA256, 'immutable S05 source');
  assert.equal(hash(ledgerBytes), contract.ledgerSHA256, 'exact owner-approved correction ledger');
  const ledger = JSON.parse(ledgerBytes), source = decodePng(sourceBytes);
  const { width, height } = source, exterior = new Uint8Array(width * height), queue = new Int32Array(width * height);
  const eligible = i => { const [r, g, b] = source.data.subarray(i * 4, i * 4 + 3); return r >= 220 && b >= 200 && g <= 50 && r - g >= 170 && b - g >= 150 && Math.abs(r - b) <= 40; };
  let head = 0, tail = 0;
  const add = i => { if (!exterior[i] && eligible(i)) { exterior[i] = 1; queue[tail++] = i; } };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) { const i = queue[head++], x = i % width; if (x) add(i - 1); if (x < width - 1) add(i + 1); if (i >= width) add(i - width); if (i < width * (height - 1)) add(i + width); }
  const result = {};
  for (const [key, piece] of Object.entries(contract.files)) {
    const [x0, y0, x1, y1] = piece.sourceBBox, [num, den] = piece.scale;
    const data = new Uint8Array(piece.width * piece.height * 4);
    for (let y = 0; y < piece.height; y++) for (let x = 0; x < piece.width; x++) {
      const sx = Math.floor((2 * x + 1) * den / (2 * num)), sy = Math.floor((2 * y + 1) * den / (2 * num));
      if (sx > x1 - x0 || sy > y1 - y0) continue;
      const src = ((y0 + sy) * width + x0 + sx), dst = (y * piece.width + x) * 4;
      data.set(source.data.subarray(src * 4, src * 4 + 4), dst); data[dst + 3] = exterior[src] ? 0 : 255;
    }
    const unmodified = data.slice(), entries = ledger.allChanges.filter(change => change.canonicalWidth === piece.width), unique = new Set();
    assert.equal(entries.filter(x => x.category === 'boundary-RGB').length, piece.width === 400 ? 72 : piece.width === 240 ? 68 : 24);
    assert.equal(entries.filter(x => x.category === 'top-alpha-RGBA').length, piece.width === 240 ? 1 : 2);
    for (const entry of entries) {
      const [x, y] = entry.destination, [dx, dy] = entry.donor, i = (y * piece.width + x) * 4, donor = (dy * piece.width + dx) * 4;
      assert.ok(x >= 0 && x < piece.width && y >= 0 && y < piece.height && !unique.has(i)); unique.add(i);
      assert.deepEqual([...unmodified.subarray(i, i + 4)], entry.originalRGBA, 'exact destination before');
      assert.deepEqual([...unmodified.subarray(donor, donor + 4)], entry.donorOriginalRGBA, 'exact original donor');
      const output = entry.category === 'boundary-RGB' ? [...entry.donorOriginalRGBA.slice(0, 3), entry.originalRGBA[3]] : entry.donorOriginalRGBA;
      assert.deepEqual(output, entry.resultRGBA); data.set(output, i);
    }
    const approved = approvedBytes[key]; assert.equal(hash(approved), piece.approvedPNGsha256, 'approved PNG bytes');
    const decoded = decodePng(approved); assert.equal(decoded.width, piece.width); assert.equal(decoded.height, piece.height);
    assert.equal(Buffer.compare(Buffer.from(data), Buffer.from(decoded.data)), 0, 'exact approved RGBA');
    assert.equal(piece.approvedRGBAsha256, pixelPins[key], 'approved pixel identity');
    assert.equal(hash(data), piece.approvedRGBAsha256, 'immutable approved pixel hash');
    for (let x = 0; x < piece.width; x++) assert.equal(data[x * 4 + 3], 255, 'full standing top');
    assert.ok(data.some((value, i) => i % 4 === 3 && value === 0), 'real underside alpha');
    result[key] = { bytes: approved, data, width: piece.width, height: piece.height, corrections: entries.length };
  }
  return result;
}
