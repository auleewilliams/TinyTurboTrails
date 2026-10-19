import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// The reviewed native-size PNGs are canonical. Copy them exactly rather than
// resampling them again or importing the high-resolution generated sources.
const source = 'assets/source/spelling/sprites';
const record = JSON.parse(await readFile(`${source}/preparation.json`, 'utf8'));
const target = 'public/assets/spelling';
const approved = [];
for (const name of ['pouch', 'tile', 'sunset-sticker']) {
  const entry = record.sprites[name];
  const bytes = await readFile(`${source}/${entry.image}`);
  if (createHash('sha256').update(bytes).digest('hex') !== entry.outputSha256) throw new Error(`Changed approved sprite: ${name}`);
  if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a'
    || bytes.readUInt32BE(16) !== entry.logicalSize.width || bytes.readUInt32BE(20) !== entry.logicalSize.height
    || bytes[25] !== 6) throw new Error(`Invalid RGBA sprite: ${name}`);
  approved.push({ name, bytes });
}
await mkdir(target, { recursive: true });
for (const { name, bytes } of approved) await writeFile(`${target}/${name}.png`, bytes);
console.log('Copied three approved spelling sprites with verified dimensions and SHA-256 hashes.');
