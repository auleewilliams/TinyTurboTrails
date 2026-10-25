import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { decodePng, encodePng } from './spelling-stickers.mjs';
import { prepareKitPiece } from './interface-kit.mjs';

// Re-derives every interface-kit piece from its generated source and checks the
// committed prepared PNG before copying it to public/. `--regenerate` rewrites the
// prepared files and their computed record fields.
const source = 'assets/source/interface';
const recordPath = `${source}/preparation.json`;
const record = JSON.parse(await readFile(recordPath, 'utf8'));
const target = 'public/assets/interface';
const regenerate = process.argv.includes('--regenerate');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const outputs = [];
for (const [name, entry] of Object.entries(record.pieces)) {
  const sourceBytes = await readFile(`${source}/${entry.source}`);
  if (sha256(sourceBytes) !== entry.sourceSha256) throw new Error(`Changed generated source: ${name}`);
  const decoded = decodePng(sourceBytes);
  const prepared = prepareKitPiece(decoded, entry.logicalSize);
  let bytes;
  if (regenerate) {
    bytes = encodePng(prepared.image);
    Object.assign(entry, {
      sourceSize: { width: decoded.width, height: decoded.height }, sourceBounds: prepared.sourceBounds,
      removedBackgroundPixels: prepared.removed, outputSha256: sha256(bytes), pixelSha256: sha256(prepared.image.data),
    });
  } else {
    if (sha256(prepared.image.data) !== entry.pixelSha256) throw new Error(`Preparation no longer reproduces ${name}`);
    bytes = await readFile(`${source}/${entry.image}`);
  }
  if (sha256(bytes) !== entry.outputSha256) throw new Error(`Changed prepared interface art: ${name}`);
  if (bytes.readUInt32BE(16) !== entry.logicalSize.width || bytes.readUInt32BE(20) !== entry.logicalSize.height
    || bytes[25] !== 6) throw new Error(`Invalid RGBA interface art: ${name}`);
  if (sha256(decodePng(bytes).data) !== entry.pixelSha256) throw new Error(`Changed interface art pixels: ${name}`);
  outputs.push({ name, entry, bytes });
}
// Nothing is written until every piece passes.
await mkdir(`${source}/prepared`, { recursive: true });
await mkdir(target, { recursive: true });
for (const { name, entry, bytes } of outputs) {
  if (regenerate) await writeFile(`${source}/${entry.image}`, bytes);
  await writeFile(`${target}/${name}.png`, bytes);
}
if (regenerate) await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
console.log(`Prepared ${outputs.length} interface-kit pieces with verified dimensions and SHA-256 hashes.`);
