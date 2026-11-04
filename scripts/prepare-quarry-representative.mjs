import { readFileSync, writeFileSync } from 'node:fs';
import { prepareRepresentative } from './quarry-representative.mjs';
const base='assets/source/quarry/representative-v1/';
const read=p=>p.startsWith('public/assets/quarry/representative-v1/')?readFileSync(base+'prepared/'+p.split('/').pop()):readFileSync(p);
const result=prepareRepresentative(readFileSync(base+'preparation-contract.json'),read);
for(const [name,image]of Object.entries(result))writeFileSync('public/assets/quarry/representative-v1/'+name,image.bytes);
console.log('Verified whole-source rasters; exact four prepared PNGs emitted. No new repairs.');
