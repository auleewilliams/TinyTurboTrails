import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { decodePng, encodePng } from './spelling-stickers.mjs';
import { resampleWhole, trimTransparentPadding, extractCell } from './site-art-pixels.mjs';

const sourceRoot = 'assets/source/site/steel-v1';
const output = resolve(process.argv[2] ?? 'public/assets/site/steel-v1');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inventory = JSON.parse(await readFile('docs/evidence/issue-242/inventory.json', 'utf8'));
const preparations = [];
const source = async (number, numerator, denominator = 1) => {
  const file = `call-${String(number).padStart(2, '0')}-original.png`;
  const bytes = await readFile(`${sourceRoot}/${file}`), image = decodePng(bytes);
  const whole = resampleWhole(image, numerator, denominator), trimmed = trimTransparentPadding(whole);
  preparations.push({ file, sha256: hash(bytes), width: image.width, height: image.height,
    uniformScale: { numerator: denominator, denominator: numerator },
    fullResampledSize: { width: whole.width, height: whole.height }, transparentTrim: trimmed.bounds,
    resampling: 'Premultiplied exact rational area weights; alpha floors globally, RGB rounds. No colour key, threshold or local repair.' });
  return trimmed.image;
};
const steel = await source(1, 16), ferry = await source(2, 89, 4), edge = await source(3, 14), fill = await source(4, 1254, 64);
assert.equal(steel.height, 18); assert.equal(steel.width, 133);
assert.equal(ferry.width, 96); assert.equal(ferry.height, 15);
assert.equal(edge.height, 16); assert.equal(edge.width, 153);
assert.equal(fill.width, 64); assert.equal(fill.height, 64);
const pieces = {
  left: extractCell(steel, { x: 0, y: 0, width: 20, height: 18 }),
  center: extractCell(steel, { x: 20, y: 0, width: 20, height: 18 }),
  half: extractCell(steel, { x: 40, y: 0, width: 10, height: 18 }),
  right: extractCell(steel, { x: 113, y: 0, width: 20, height: 18 }),
};
const blank = (width, height) => ({ width, height, data: new Uint8Array(width * height * 4) });
const paste = (target, piece, x, y, flip = false) => {
  assert.ok(x >= 0 && y >= 0 && x + piece.width <= target.width && y + piece.height <= target.height);
  for (let py = 0; py < piece.height; py++) for (let px = 0; px < piece.width; px++) {
    const sourceX = flip ? piece.width - px - 1 : px;
    target.data.set(piece.data.subarray((py * piece.width + sourceX) * 4, (py * piece.width + sourceX) * 4 + 4),
      ((y + py) * target.width + x + px) * 4);
  }
};
const runs = [];
for (const support of inventory.platforms.filter(p => p.from.x === p.to.x && p.from.y === p.to.y).sort((a, b) => a.from.y - b.from.y || a.from.x - b.from.x)) {
  const previous = runs.at(-1);
  if (previous && previous.y === support.from.y && support.from.x <= previous.x + previous.width) {
    previous.width = Math.max(previous.width, support.from.x + support.width - previous.x);
    previous.supportIds.push(support.id);
  } else runs.push({ id: support.id, supportIds: [support.id], x: support.from.x, y: support.from.y, width: support.width });
}
assert.equal(runs.length, 31);
await mkdir(output, { recursive: true });
const artifacts = [];
const save = async (name, image) => {
  const bytes = encodePng(image);
  await writeFile(resolve(output, name), bytes);
  artifacts.push({ name, width: image.width, height: image.height, sha256: hash(bytes), pixelSha256: hash(image.data) });
};
for (const run of runs) {
  const image = blank(run.width, 18);
  paste(image, pieces.left, 0, 0); paste(image, pieces.right, run.width - 20, 0);
  let x = 20, repeat = 0;
  while (x + 20 <= run.width - 20) { paste(image, pieces.center, x, 0, repeat++ % 2 === 1); x += 20; }
  if (x < run.width - 20) { assert.equal(run.width - 20 - x, 10); paste(image, pieces.half, x, 0); }
  run.image = `${run.id}.png`;
  await save(run.image, image);
}
const ferryCanvas = blank(96, 18); paste(ferryCanvas, ferry, 0, 0);
await save('ferry.png', ferryCanvas);

// Author a single native bitmap. Draw-time camera fractions cannot open seams
// between separate source strips. Preserve the accepted left980px exactly.
const ground = blank(3120, 1064);
const repeat = (n, size) => { const phase = n % (size * 2); return phase < size ? phase : size * 2 - phase - 1; };
const edgeCenter = extractCell(edge, { x: 20, y: 0, width: 113, height: 16 });
const overlay = (targetIndex, sourceImage, sx, sy) => {
  const sourceIndex = (sy * sourceImage.width + sx) * 4, alpha = sourceImage.data[sourceIndex + 3];
  for (let c = 0; c < 3; c++) ground.data[targetIndex + c] = Math.round((sourceImage.data[sourceIndex + c] * alpha + ground.data[targetIndex + c] * (255 - alpha)) / 255);
};
for (let y = 680; y < ground.height; y++) for (let x = 0; x < ground.width; x++) {
  const surface = inventory.terrain.find(s => x + 0.5 >= s.x1 && x + 0.5 < s.x2);
  assert.ok(surface);
  const top = surface.y1 + (surface.y2 - surface.y1) * (x + 0.5 - surface.x1) / (surface.x2 - surface.x1);
  if (y + 0.5 < top) continue;
  const index = (y * ground.width + x) * 4;
  const fillIndex = (repeat(y - 680, 64) * 64 + repeat(x, 64)) * 4;
  ground.data.set(fill.data.subarray(fillIndex, fillIndex + 4), index);
  if (surface.y1 === surface.y2 && y - surface.y1 < 16) overlay(index, edgeCenter, repeat(x, edgeCenter.width), y - surface.y1);
  // Retain the authored slope. Neutral stone edge is rotated as a whole cell,
  // not sheared or stretched down the 320px wall.
  const distance = Math.floor(960 + (y + 0.5 - 680) / 16 - (x + 0.5));
  if (y < 1000 && distance >= 0 && distance < 16) overlay(index, edgeCenter, repeat(y - 680, edgeCenter.width), distance);
  const rightDistance = Math.floor((x + 0.5) - (1340 - (y + 0.5 - 680) / 16));
  if (y < 1000 && rightDistance >= 0 && rightDistance < 16) overlay(index, edgeCenter, repeat(y - 680, edgeCenter.width), rightDistance);
}
await save('ground.png', extractCell(ground, { x: 0, y: 0, width: 980, height: 1064 }));
await save('ground-full.png', ground);
await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ version: 1, phase: 'rollout', depth: 18, runs,
  ferry: { id: 'site-crane-ferry', image: 'ferry.png', width: 96, height: 18, visibleDepth: 15 },
  ground: { image: 'ground-full.png', width: 3120, height: 1064, from: 0, to: 3120 } }, null, 2) + '\n');
await writeFile(resolve(output, 'preparation.json'), JSON.stringify({ sourceRevision: inventory.sourceRevision, preparations,
  plannedCells: { left: [0, 0, 20, 18], center: [20, 0, 20, 18], half: [40, 0, 10, 18], right: [113, 0, 20, 18] },
  sourcePreservation: 'Every source pixel participates in whole-image resampling. Only zero-alpha exterior output padding is trimmed. Whole ferry is padded below to18; its entire15px silhouette remains. All defining fixed-beam end plates remain in20px caps.',
  artifacts }, null, 2) + '\n');
console.log(JSON.stringify({ output, runs: runs.map(r => ({ id: r.id, width: r.width, supportIds: r.supportIds })), artifacts: artifacts.length }));
