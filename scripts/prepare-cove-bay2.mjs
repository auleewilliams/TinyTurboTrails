import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareBay2} from './cove-bay2.mjs';
const root=new URL('../assets/source/cove/bay2-whole-v1/',import.meta.url),r=JSON.parse(readFileSync(new URL('preparation.json',root))),result=prepareBay2(readFileSync(new URL('source.png',root)));
if(createHash('sha256').update(result.image.data).digest('hex')!==r.pixelSha256)throw Error('Whole source pixel contract');
for(const p of [new URL('prepared/platform.png',root),new URL('../public/assets/cove/bay2-whole-v1/platform.png',import.meta.url)])writeFileSync(p,result.png);
console.log(JSON.stringify({opaquePixelsDropped:result.opaquePixelsDropped,sourceOpaquePixelsRepresented:result.sourceOpaquePixelsRepresented}));
