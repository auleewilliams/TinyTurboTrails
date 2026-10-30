import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { prepareBay2 } from './cove-bay2.mjs';
const root=new URL('../assets/source/cove/bay2-mask-v1/',import.meta.url),r=JSON.parse(readFileSync(new URL('preparation.json',root)));
const result=prepareBay2(readFileSync(new URL('source.png',root))),hash=b=>createHash('sha256').update(b).digest('hex');
if(hash(result.image.data)!==r.pixelSha256||JSON.stringify(result.loss)!==JSON.stringify(r.loss))throw Error('Bay2 preparation mismatch');
for(const p of [new URL('prepared/platform.png',root),new URL('../public/assets/cove/bay2-mask-v1/platform.png',import.meta.url)])writeFileSync(p,result.png);
console.log(JSON.stringify({pixelSha256:hash(result.image.data),encodedSha256:hash(result.png),loss:result.loss}));
