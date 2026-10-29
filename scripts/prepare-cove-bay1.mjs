import { readFileSync, writeFileSync } from 'node:fs';
import { prepareBay1, bay1Hash } from './cove-bay1.mjs';
const root = new URL('../assets/source/cove/bay1-b-v1/', import.meta.url);
const record = JSON.parse(readFileSync(new URL('preparation.json', root)));
const result = prepareBay1(readFileSync(new URL('source.png', root)));
if (bay1Hash(result.png) !== record.outputSha256 || JSON.stringify(result.repairs) !== JSON.stringify(record.repairs)) throw new Error('Bay1 preparation record differs');
for (const path of [new URL('prepared/platform.png', root), new URL('../public/assets/cove/bay1-b-v1/platform.png', import.meta.url)]) writeFileSync(path, result.png);
console.log(JSON.stringify({ pngSha256: bay1Hash(result.png), repairs: result.repairs }));
