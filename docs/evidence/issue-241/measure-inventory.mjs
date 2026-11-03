// Source measurements for planning; does not render or modify game data.
import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { decodePng } from '../../../scripts/spelling-stickers.mjs';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const modules = await createServer({ root, configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const { TREETOP_TIMBERS: level } = await modules.ssrLoadModule('/src/world/treetop-timbers.ts');
const { TRAIL_WORDS } = await modules.ssrLoadModule('/src/game/education.ts');
await modules.close();
const word = TRAIL_WORDS.find(word => word.id === 'timbers');
const henry = JSON.parse(await readFile(root + 'public/assets/henry/manifest.json', 'utf8'));
const png = decodePng(await readFile(root + 'public/assets/henry/' + henry.image));
const actorFrames = ['idle', 'run', 'jump', 'fall'].flatMap(animation => henry.animations[animation].frames.map(id => {
  const frame = henry.frames[id];
  let minX = 48, maxX = -1, minY = 48, maxY = -1;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    if (!png.data[((frame.y + y) * png.width + frame.x + x) * 4 + 3]) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { animation, id, minX, maxX, minY, maxY, aboveFeet: henry.anchor.y - minY };
}));
const actorHeight = Math.max(...actorFrames.map(frame => frame.aboveFeet));
const actorHalfWidth = Math.max(...actorFrames.flatMap(frame => [henry.anchor.x - frame.minX, frame.maxX + 1 - henry.anchor.x]));
const supports = level.platforms.map(platform => ({ id: platform.id, x: platform.from.x,
  right: platform.from.x + platform.width, y: platform.from.y, width: platform.width,
  from: platform.from, to: platform.to, seconds: platform.seconds,
  currentMaximumDepth: platform.width >= 300 ? 22 : 16,
  family: platform.width >= 300 ? 'broad modular bough' : 'ordinary modular branch',
  proposedGeometry: 'unchanged',
}));
assert.equal(supports.length, 44);
assert.ok(supports.every(support => support.from.x === support.to.x && support.from.y === support.to.y));
const ground = { id: 'ground-0', x: 40, right: 820, y: 1080, width: 780 };
const pickups = [
  ...level.entities.map(entity => ({ ...entity, supportY: entity.y + (entity.kind === 'gem' ? 18 : entity.kind === 'special' ? 25 : 0) })),
  ...word.pickups.map(letter => ({ ...letter, kind: 'letter', y: letter.supportY - 32 })),
  { id: 'finish', kind: 'finish', x: level.finish.x, y: level.finish.y, supportY: level.finish.y },
].map(pickup => ({ ...pickup, proposedPosition: { x: pickup.x, y: pickup.y, supportY: pickup.supportY } }));
for (const target of supports) {
  target.associatedEntities = pickups.filter(pickup => pickup.supportY === target.y && pickup.x >= target.x && pickup.x <= target.right).map(pickup => pickup.id);
  target.lowerNeighbours = [...supports, ground].filter(lower => lower.y > target.y && lower.y - target.y <= 120
    && lower.right + actorHalfWidth > target.x && lower.x - actorHalfWidth < target.right).map(lower => ({
      id: lower.id, topSeparation: lower.y - target.y,
      conservativeActorCorridor: [Math.max(target.x, lower.x - actorHalfWidth), Math.min(target.right, lower.right + actorHalfWidth)],
      depthForTwoPixelStandingGap: lower.y - target.y - actorHeight - 2,
    }));
  target.proposedEnvelope = target.id === 'timber-spring-reward'
    ? '18px nominal depth; 30px overlap is an intentional pass-through corridor, not a standing underpass; catch rest x230 remains outside upper right200.'
    : '18px nominal designed body; up to 28px only outside the conservative lower-standing corridors listed here, with natural continuous taper. No post-generation cutting or squeezing.';
  target.maximumDepthIntervals = [];
  for (let x = target.x; x < target.right; x++) {
    const relevant = target.lowerNeighbours.filter(neighbour => x >= neighbour.conservativeActorCorridor[0]
      && x < neighbour.conservativeActorCorridor[1] && neighbour.topSeparation >= 60);
    const depth = target.id === 'timber-spring-reward' ? 18
      : Math.min(28, ...relevant.map(neighbour => neighbour.depthForTwoPixelStandingGap));
    const last = target.maximumDepthIntervals.at(-1);
    if (last?.depth === depth) last.toX = x + 1;
    else target.maximumDepthIntervals.push({ fromX: x, toX: x + 1, depth });
  }
}
const renderer = await readFile(root + 'src/world/renderer.ts', 'utf8');
const trunk = renderer.slice(renderer.indexOf('export function drawTimberTrunk'), renderer.indexOf('export function drawPlatformPath'));
const arrays = [...trunk.matchAll(/for \(const \[(?:x, y, scale|x, y)\] of (\[\[[^;]+?\]\])\)/g)].map(match => JSON.parse(match[1]));
assert.equal(arrays.length, 2);
const atlasManifest = JSON.parse(await readFile(root + 'public/assets/timbers/manifest.json', 'utf8'));
const atlas = decodePng(await readFile(root + 'public/assets/timbers/environment.png'));
const scenery = arrays.flatMap((items, family) => items.map(([x, y, scale = 2.2], index) => {
  const asset = family === 0 ? 'tree' : 'bush';
  const cell = atlasManifest.assets[asset], sx = cell % 4 * 48, sy = Math.floor(cell / 4) * 48;
  let baseLeft = 48, baseRight = -1;
  // Last four opaque base rows, alpha >=128; not a one-pixel anchor claim.
  for (let yy = 40; yy <= 43; yy++) for (let xx = 0; xx < 48; xx++) {
    if (atlas.data[((sy + yy) * atlas.width + sx + xx) * 4 + 3] < 128) continue;
    baseLeft = Math.min(baseLeft, xx); baseRight = Math.max(baseRight, xx);
  }
  const feet = [x + (baseLeft - 24) * scale, x + (baseRight + 1 - 24) * scale];
  const realSupport = [...supports, ground].filter(support => support.y === y && support.x <= feet[0] && support.right >= feet[1]).map(support => support.id);
  return { key: `drawTimberTrunk:${asset}:${index}`, note: 'Inventory key, not an authored entity ID', asset, x, y, scale,
    substantialBaseX: feet, baseBottomY: y, realSupport,
    proposal: 'Remove this decorative sprite draw; preserve atlas bytes, trunk, connecting limbs, panorama and ambient leaves.' };
}));
assert.equal(scenery.length, 11);
const inventory = { sourceRevision: '885b6c16d5397e061f1ccb40ca326856bc77db88',
  measurement: 'Static authored support geometry and decoded source alpha. Lower corridors conservatively expand each lower support by the widest visible half-silhouette. They are not observed landing routes or collision solids.',
  actorHeight, actorHalfWidth, actorFrames, ground: { ...ground, visibleDepth: 100, proposal: 'Replace wood atlas tiles and shared fill with a Timbers root-and-bark ground kit; unchanged contour.' },
  supports, pickups, scenery,
  sceneryPreserved: { trunk: { y: [180, 1080], approximateX: [343, 478] },
    connectingLimbs: [[300, 210], [420, 170], [540, 585], [660, 65], [780, 600], [900, 185]],
    panorama: 'public/assets/trails/backdrops.webp row 1', ambientLeaves: level.theme.weather },
  invariants: { levelWidth: level.width, levelHeight: level.height, minX: level.minX, maxX: level.maxX,
    start: level.start, finish: level.finish, retrace: level.retrace, checkpoints: level.checkpoints, landingBands: level.landingBands },
};
await writeFile(new URL('./inventory.json', import.meta.url), JSON.stringify(inventory, null, 2) + '\n');
const rows = supports.map(target => {
  const lower = target.lowerNeighbours.filter(neighbour => neighbour.topSeparation <= 60).map(neighbour => `${neighbour.id.replace('timber-', '')}:${neighbour.topSeparation}`).join(', ') || 'none within 60';
  const ids = target.associatedEntities.map(id => id.replace('timber-gem-', 'g').replace('timber-checkpoint-', 'cp-').replace('timbers-', '')).join(', ') || '—';
  return `| ${target.id.replace('timber-', '')} | ${target.x}–${target.right} | ${target.y} | ${target.width} | ${target.family.startsWith('broad') ? 'B' : 'A'} | ${lower} | ${ids} |`;
});
await writeFile(new URL('./support-rows.md', import.meta.url), rows.join('\n') + '\n');
console.log(JSON.stringify({ supports: supports.length, pickups: pickups.length, actorHeight, actorHalfWidth, scenery: scenery.map(item => ({ key: item.key, feet: item.substantialBaseX, y: item.y, supports: item.realSupport })) }, null, 2));
