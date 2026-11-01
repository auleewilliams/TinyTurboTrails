import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareBay3} from './cove-bay3.mjs';
import {encodePng} from './spelling-stickers.mjs';
const root='assets/source/cove/bay3-b-v1/',source=readFileSync(root+'source.png'),r=prepareBay3(source),png=encodePng(r.image),hash=b=>createHash('sha256').update(b).digest('hex');
mkdirSync(root+'prepared',{recursive:true});mkdirSync('public/assets/cove/bay3-b-v1',{recursive:true});writeFileSync(root+'prepared/platform.png',png);writeFileSync('public/assets/cove/bay3-b-v1/platform.png',png);
writeFileSync(root+'preparation.json',JSON.stringify({width:180,height:30,pngSha256:hash(png),pixelSha256:hash(r.image.data),sourceSha256:hash(source),requestedSourceNativeScale:8,approvedSourceNativeScale:{numerator:721,denominator:90},window:r.window,sourcePaintOutsideWindow:r.sourcePaintOutsideWindow,beforeRgbaSha256:r.beforeRgbaSha256,afterRgbaSha256:r.afterRgbaSha256,repairs:r.repairs,method:'unchanged edge-connected key + shared floor-block modeDownsample; whole region preserved, not every source pixel individually represented',sourceCallCount:1,requestedQuality:'medium',reportedQuality:'medium',bindings:Object.fromEntries(['request.json','generation-result.json','owner-authorization.json','caps.json','reference-bindings.json'].map(p=>[p,hash(readFileSync(root+p))]))},null,2)+'\n');
