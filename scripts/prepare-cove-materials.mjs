import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prepareCoveMaterials } from './cove-materials.mjs';
const source = new URL('../assets/source/cove/materials/', import.meta.url);
const result = prepareCoveMaterials(readFileSync(new URL('source.png', source)), JSON.parse(readFileSync(new URL('preparation.json', source))));
// All generation and validation complete before any output is written.
const outputs = [['atlas.png', result.png], ['manifest.json', Buffer.from(JSON.stringify(result.manifest, null, 2) + '\n')],
  ['pixel-hashes.json', Buffer.from(JSON.stringify({ pixelSha256: result.pixelSha256, removed: result.removed }, null, 2) + '\n')]];
const paths = process.argv[2] ? [resolve(process.argv[2])] : [new URL('../public/assets/cove/materials/', import.meta.url), new URL('prepared/', source)];
for (const path of paths) { mkdirSync(path, { recursive: true }); for (const [name, bytes] of outputs) writeFileSync(typeof path === 'string' ? resolve(path, name) : new URL(name, path), bytes); }
console.log(JSON.stringify({ pixelSha256: result.pixelSha256, removed: result.removed, outputs: paths.map(String) }));
