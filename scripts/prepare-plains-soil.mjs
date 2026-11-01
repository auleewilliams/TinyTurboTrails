import { readFileSync, writeFileSync } from 'node:fs';
import { verifyPlainsSoil } from './plains-soil.mjs';
const source = new URL('../assets/source/plains/contour-prototype-v1/soil/', import.meta.url);
const canonical = readFileSync(new URL('prepared-master.png', source));
verifyPlainsSoil(readFileSync(new URL('original-C-R2.png', source)), canonical);
writeFileSync(new URL('../public/assets/plains/contour-prototype-v1/soil.png', import.meta.url), canonical);
console.log(JSON.stringify({ status: 'verified whole-field C2 and copied exact canonical64PNG', repairs: 0 }));
