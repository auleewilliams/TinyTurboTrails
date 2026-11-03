import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decodePng, encodePng, downsampleWhole, wholeImageAtHeight, alphaBounds, crop, assembleWood } from './timbers-art.mjs';

const source = 'assets/source/timbers/illustrated-v1/';
const output = process.argv[2] ?? 'public/assets/timbers/terrain-kit-v1/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inventory = JSON.parse(readFileSync('docs/evidence/issue-241/inventory.json', 'utf8'));
const names = ['middle', 'spring', 'spring-reward', 'spring-catch', 'approach-1', 'approach-2', 'shared',
  'return-600', 'return-720', 'return-780', 'outer-catch-660', 'outer-catch-780'].map(name => `timber-${name}`);
mkdirSync(output, { recursive: true });
const a = readFileSync(source + 'a-01-original.png'), c = readFileSync(source + 'c-02-original.png');
const scaledA = downsampleWhole(decodePng(a), 13), bounds = alphaBounds(scaledA), branch = crop(scaledA, bounds);
if (branch.width !== 159 || branch.height !== 17) throw new Error('Changed A source or preparation');
const groundMaster = wholeImageAtHeight(decodePng(c), 100);
if (groundMaster.width !== 300 || groundMaster.height !== 100) throw new Error('Changed C source or preparation');
const records = {};
const save = (name, image) => {
  const png = encodePng(image); writeFileSync(`${output}/${name}`, png);
  records[name] = { width: image.width, height: image.height, pngSha256: hash(png), pixelSha256: hash(image.data), columns: image.columns };
};
save('branch-master.png', branch); save('ground-master.png', groundMaster);
const platforms = {};
for (const id of names) {
  const supports = inventory.supports.filter(support => support.id === id);
  if (supports.length !== 1) throw new Error('Missing unique Timbers support');
  const support = supports[0], image = `branch-${support.width}.png`;
  if (!records[image]) save(image, assembleWood(branch, support.width, 27));
  platforms[id] = { image, width: support.width, height: branch.height };
}
save('ground.png', assembleWood(groundMaster, inventory.ground.width, 12));
const manifest = { version: 1, ground: { image: 'ground.png', x: inventory.ground.x, y: inventory.ground.y, width: inventory.ground.width, height: 100 }, platforms };
writeFileSync(`${output}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
const preparation = { sources: { A: { image: 'a-01-original.png', sha256: hash(a), uniformNativeSourceRatio: [1, 13], wholeImageScaledSize: [scaledA.width, scaledA.height], fullyTransparentMarginCrop: bounds, capWidth: 27 },
  C: { image: 'c-02-original.png', sha256: hash(c), uniformNativeSourceRatio: [100, 724], capWidth: 12 } },
  method: 'Integer-weight premultiplied box filter of the whole original; nearest byte rounding. A removes only fully transparent margins after filtering. Complete designed caps preserved; centre columns copied/repeated/mirrored, no alpha thresholds, pixel repairs, body/end cropping or anisotropic scale.',
  downsamplingNote: 'Whole source region is filtered; individual source pixels need not survive at native resolution. Tiny low-alpha isolated pixels can round to zero through ordinary uniform area filtering.',
  broadReuse: 'A supplies the broad middle bough at the same scale, with its whole end caps and repeated designed centre. B allocation unused.', records };
writeFileSync(`${output}/preparation.json`, JSON.stringify(preparation, null, 2) + '\n');
console.log(`Prepared ${names.length} preview supports and ground in ${output}`);
