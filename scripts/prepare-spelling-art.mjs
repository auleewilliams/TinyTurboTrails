import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { decodePng, encodePng, prepareSticker } from './spelling-stickers.mjs';

// The reviewed native-size PNGs are canonical. Copy them exactly rather than
// resampling them again or importing the high-resolution generated sources.
// Chroma-keyed trail stickers are also re-derived from their generated sources
// and must reproduce the committed pixels. `--regenerate` rewrites only those
// prepared files and their computed record fields.
const source = 'assets/source/spelling/sprites';
const recordPath = `${source}/preparation.json`;
const record = JSON.parse(await readFile(recordPath, 'utf8'));
const target = 'public/assets/spelling';
const regenerate = process.argv.includes('--regenerate');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const approved = [];
for (const [name, entry] of Object.entries(record.sprites)) {
  if (entry.preparation === 'chroma-key') {
    const sourceBytes = await readFile(`${source}/${entry.source}`);
    if (sha256(sourceBytes) !== entry.sourceSha256) throw new Error(`Changed generated source: ${name}`);
    const prepared = prepareSticker(decodePng(sourceBytes), entry.logicalSize, entry.padding);
    if (regenerate) {
      const bytes = encodePng(prepared.image);
      await writeFile(`${source}/${entry.image}`, bytes);
      Object.assign(entry, {
        outputSha256: sha256(bytes), pixelSha256: sha256(prepared.image.data),
        sourceBounds: prepared.sourceBounds, contentRect: prepared.contentRect, removedBackgroundPixels: prepared.removed,
        preparedVisiblePixels: prepared.image.data.filter((_, index) => index % 4 === 3 && _).length,
      });
    } else if (sha256(prepared.image.data) !== entry.pixelSha256) throw new Error(`Preparation no longer reproduces ${name}`);
  }
  const bytes = await readFile(`${source}/${entry.image}`);
  if (sha256(bytes) !== entry.outputSha256) throw new Error(`Changed approved sprite: ${name}`);
  if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a'
    || bytes.readUInt32BE(16) !== entry.logicalSize.width || bytes.readUInt32BE(20) !== entry.logicalSize.height
    || bytes[25] !== 6) throw new Error(`Invalid RGBA sprite: ${name}`);
  if (entry.pixelSha256 && sha256(decodePng(bytes).data) !== entry.pixelSha256) throw new Error(`Changed sprite pixels: ${name}`);
  approved.push({ name, bytes });
}
if (regenerate) await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
await mkdir(target, { recursive: true });
for (const { name, bytes } of approved) await writeFile(`${target}/${name}.png`, bytes);
console.log(`Copied ${approved.length} approved spelling sprites with verified dimensions and SHA-256 hashes.`);
