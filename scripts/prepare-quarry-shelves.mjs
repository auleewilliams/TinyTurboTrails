import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { prepareQuarryMasters } from './quarry-shelves.mjs';
const source = 'assets/source/quarry/whole-ledges-v1/';
const output = process.argv[2] ?? 'public/assets/quarry/whole-ledges-v1/';
const contract = JSON.parse(readFileSync(source + 'preparation-contract.json'));
const masters = prepareQuarryMasters(readFileSync(source + 'source.png'), contract, readFileSync(source + 'approved-change-ledger.json'), Object.fromEntries(Object.keys(contract.files).map(w => [w, readFileSync(source + `approved-${w}.png`)])));
mkdirSync(output, { recursive: true });
for (const [width, master] of Object.entries(masters)) writeFileSync(`${output}/shelf-${width}.png`, master.bytes);
writeFileSync(`${output}/manifest.json`, JSON.stringify({ version: 1, scope: 'four-fixed-shelves-pilot', platforms: {
  'quarry-upper': { image: 'shelf-400.png', width: 400, height: 45 }, 'quarry-mine': { image: 'shelf-400.png', width: 400, height: 45 },
  'quarry-terrace-4': { image: 'shelf-160.png', width: 160, height: 32 }, 'quarry-terrace-5': { image: 'shelf-240.png', width: 240, height: 37 },
} }, null, 2) + '\n');
console.log('Prepared exact approved S05 masters:164 RGB +5 top additions; four shelf IDs only.');
