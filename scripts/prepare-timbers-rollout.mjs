import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decodePng, encodePng, assembleWood } from './timbers-art.mjs';

const source = 'assets/source/timbers/rollout-v1/';
const kit = 'public/assets/timbers/terrain-kit-v1/';
const output = process.argv[2] ?? kit;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const accepted = JSON.parse(readFileSync(source + 'accepted-preview.json'));
const preview = JSON.parse(readFileSync(source + 'accepted-manifest.json'));
const inventory = JSON.parse(readFileSync('docs/evidence/issue-241/inventory.json'));
const masterBytes = readFileSync(kit + 'branch-master.png');
if (hash(masterBytes) !== accepted.files[kit + 'branch-master.png']) throw new Error('Changed accepted branch source');
const master = decodePng(masterBytes);
const platforms = {}, records = {};
mkdirSync(output, { recursive: true });
for (const support of inventory.supports) {
  const image = `branch-${support.width}.png`;
  if (!records[image]) {
    const pixels = assembleWood(master, support.width, 27), bytes = encodePng(pixels);
    const existing = accepted.files[kit + image];
    // Accepted compressed copies remain byte-identical, including across encoders.
    if (existing) {
      const original = readFileSync(kit + image), decoded = decodePng(original);
      if (hash(original) !== existing || Buffer.compare(Buffer.from(decoded.data), Buffer.from(pixels.data))) throw new Error('Changed accepted branch pixels');
      writeFileSync(`${output}/${image}`, original);
    } else writeFileSync(`${output}/${image}`, bytes);
    const shipped = readFileSync(`${output}/${image}`);
    records[image] = { width: pixels.width, height: pixels.height, pngSha256: hash(shipped), pixelSha256: hash(pixels.data), columns: pixels.columns, accepted: Boolean(existing) };
  }
  platforms[support.id] = { image, width: support.width, height: 17 };
}
for (const [id, piece] of Object.entries(preview.platforms)) {
  if (JSON.stringify(platforms[id]) !== JSON.stringify(piece)) throw new Error('Changed accepted support mapping');
}
const manifest = { version: 1, ground: preview.ground, platforms };
writeFileSync(`${output}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
const record = { acceptedRevision: accepted.revision, masterSha256: hash(masterBytes), capWidth: 27,
  method: 'Copy the accepted native master columns with unchanged whole 27px caps and mirrored/repeated designed centre. No new scaling, crop, alpha edits or generation. Preserve all accepted PNG bytes.', records };
writeFileSync(`${output}/rollout-preparation.json`, JSON.stringify(record, null, 2) + '\n');
console.log(`Prepared all ${Object.keys(platforms).length} supports from the accepted source; no generation calls`);
