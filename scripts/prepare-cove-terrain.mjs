import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prepareCoveKit } from './cove-terrain.mjs';

const source = 'assets/source/cove/terrain-kit';
const record = JSON.parse(await readFile(`${source}/preparation.json`, 'utf8'));
const sources = Object.fromEntries(await Promise.all(Object.entries(record.sources)
  .map(async ([name, entry]) => [name, await readFile(`${source}/${entry.file}`)])));
const geometry = JSON.parse(await readFile(`${source}/geometry-pin.json`, 'utf8'));
const result = prepareCoveKit(sources, record, geometry);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const regenerate = process.argv.includes('--regenerate');
const outputIndex = process.argv.indexOf('--output-dir');
const target = outputIndex < 0 ? 'public/assets/cove/terrain-kit' : resolve(process.argv[outputIndex + 1]);
if (regenerate) Object.assign(record, { pixelSha256: hash(result.image.data), outputSha256: hash(result.png), removedBackgroundPixels: result.removed, groundPixelSha256: hash(result.ground.data), groundOutputSha256: hash(result.groundPng) });
else if (record.pixelSha256 !== hash(result.image.data) || record.outputSha256 !== hash(result.png)) throw new Error('Cove preparation does not reproduce approved outputs');
if (!regenerate && (record.groundPixelSha256 !== hash(result.ground.data) || record.groundOutputSha256 !== hash(result.groundPng))) throw new Error('Cove ground does not reproduce');
// Every source/crop/pixel has passed before any output writes.
await mkdir(target, { recursive: true });
await writeFile(`${target}/atlas.png`, result.png);
await writeFile(`${target}/ground.png`, result.groundPng);
await writeFile(`${target}/manifest.json`, `${JSON.stringify(result.manifest, null, 2)}\n`);
if (regenerate) {
  await mkdir(`${source}/prepared`, { recursive: true });
  await writeFile(`${source}/prepared/atlas.png`, result.png);
  await writeFile(`${source}/prepared/ground.png`, result.groundPng);
  await writeFile(`${source}/preparation.json`, `${JSON.stringify(record, null, 2)}\n`);
}
console.log(JSON.stringify({ target, pieces: Object.keys(result.manifest.pieces).length, pixelSha256: hash(result.image.data), outputSha256: hash(result.png), removed: result.removed }));
