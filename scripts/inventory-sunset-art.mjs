import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';
import { decodePng } from './spelling-stickers.mjs';

// Read-only production inventory. The output describes a proposal, not an
// approved geometry change or a substitute for an input-driven gameplay pass.
const output = resolve(process.argv[2] ?? 'docs/evidence/issue-242/inventory.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { SUNSET_SITE: level } = await server.ssrLoadModule('/src/world/sunset-site.ts');
  const { TRAIL_WORDS } = await server.ssrLoadModule('/src/game/education.ts');
  const letters = TRAIL_WORDS.find(word => word.id === 'sunset').pickups;
  const henryManifest = JSON.parse(await readFile('public/assets/henry/manifest.json', 'utf8'));
  const henry = decodePng(await readFile(`public/assets/henry/${henryManifest.image}`));
  const bounds = (image, frame) => {
    let left = frame.width, top = frame.height, right = -1, bottom = -1;
    const occupiedPerRow = [];
    for (let y = 0; y < frame.height; y++) {
      let count = 0;
      for (let x = 0; x < frame.width; x++) {
        if (!image.data[((frame.y + y) * image.width + frame.x + x) * 4 + 3]) continue;
        count++;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      occupiedPerRow.push(count);
    }
    return { left, top, right, bottom, occupiedPerRow };
  };
  const henryFrames = henryManifest.frames.map((frame, id) => {
    const pixels = bounds(henry, frame);
    return { id, ...pixels, aboveFeet: henryManifest.anchor.y - pixels.top };
  });
  const walkingHeight = Math.max(...['idle', 'run'].flatMap(name =>
    henryManifest.animations[name].frames.map(id => henryFrames[id].aboveFeet)));
  const proposedDepth = 18;
  const supports = level.platforms.map(p => ({
    ...p, left: Math.min(p.from.x, p.to.x), right: Math.max(p.from.x, p.to.x) + p.width,
    top: p.from.y, moving: p.from.x !== p.to.x || p.from.y !== p.to.y,
  }));
  const overlaps = (left, right, otherLeft, otherRight) => left < otherRight && right > otherLeft;
  const supportIds = (x, top) => supports.filter(p => !p.moving && p.top === top && x >= p.left && x <= p.right).map(p => p.id);
  const gems = level.entities.filter(e => e.kind === 'gem');
  const proposedGemChanges = gems.flatMap(gem => {
    const overhead = supports.filter(p => p.top === gem.y + 18 - 60 && overlaps(gem.x - 16, gem.x + 16, p.left, p.right));
    return overhead.length ? [{ id: gem.id, old: { x: gem.x, y: gem.y }, proposed: { x: gem.x, y: gem.y + 2 },
      supportIds: supportIds(gem.x, gem.y + 18), overheadIds: overhead.map(p => p.id),
      reason: 'Conservative full 32x24 gem envelope needs 2px clearance below an 18px girder; includes the ferry swept envelope.' }] : [];
  });
  const sameLevelJoins = supports.flatMap((a, index) => supports.slice(index + 1).flatMap(b =>
    !a.moving && !b.moving && a.top === b.top && Math.min(a.right, b.right) >= Math.max(a.left, b.left)
      ? [{ ids: [a.id, b.id], top: a.top, overlap: [Math.max(a.left, b.left), Math.min(a.right, b.right)] }] : []));
  const platforms = supports.map(p => {
    const below = supports.filter(q => q.top > p.top && overlaps(p.left - 16, p.right + 16, q.left, q.right));
    const terrainBelow = level.surfaces.filter(s => s.y1 === s.y2 && s.y1 > p.top && overlaps(p.left - 16, p.right + 16, s.x1, s.x2));
    const separation = Math.min(...below.map(q => q.top - p.top), ...terrainBelow.map(s => s.y1 - p.top));
    return { id: p.id, role: p.moving ? 'whole-steel-ferry' : 'modular-steel-deck',
      from: p.from, to: p.to, width: p.width, seconds: p.seconds, pause: p.pause ?? 0,
      sweptBounds: { left: p.left, right: p.right, top: p.top },
      current: { asset: 'public/assets/site/environment.png#terrain-flat', renderer: 'src/world/renderer.ts#drawPlatforms', visualDepth: 12 },
      proposal: { coordinates: 'unchanged', maxVisualDepth: proposedDepth, sideOverhang: 0,
        nearestLowerTopSeparation: separation, conservativeStandingClearance: separation - proposedDepth - walkingHeight },
      lowerSupports: below.filter(q => q.top - p.top === separation).map(q => q.id),
      gems: gems.filter(g => supportIds(g.x, g.y + 18).includes(p.id)).map(g => g.id),
      letters: letters.filter(l => supportIds(l.x, l.supportY).includes(p.id)).map(l => l.id),
      checkpoints: level.checkpoints.filter(c => supportIds(c.x, c.y).includes(p.id)).map(c => c.id),
      decorations: level.entities.filter(e => e.kind === 'decoration' && supportIds(e.x, e.y).includes(p.id)).map(e => e.id),
      joins: sameLevelJoins.filter(j => j.ids.includes(p.id)),
    };
  });
  const manifest = JSON.parse(await readFile('public/assets/site/manifest.json', 'utf8'));
  const atlas = decodePng(await readFile(`public/assets/site/${manifest.image}`));
  const scenery = [...level.entities.filter(e => e.kind === 'decoration').map(e => ({ ...e, scale: 1 })),
    { id: 'renderer-site-frame-tree', asset: 'tree', x: 1620, y: 680, scale: 1.5 }].map(e => {
    const cell = manifest.cellSize, id = manifest.assets[e.asset], anchor = manifest.anchors[e.asset];
    const pixels = bounds(atlas, { x: id % 4 * cell, y: Math.floor(id / 4) * cell, width: cell, height: cell });
    return { ...e, source: `public/assets/site/environment.png#${e.asset}`, anchor, pixels,
      visibleBottomExclusive: e.y + (pixels.bottom + 1 - anchor.y) * e.scale,
      visibleBaseWidth: pixels.occupiedPerRow[pixels.bottom] * e.scale,
      supportIds: supportIds(e.x, e.y),
      terrainSegments: level.surfaces.flatMap((s, index) => s.y1 === e.y && s.y2 === e.y && s.x1 <= e.x && s.x2 >= e.x ? [index] : []),
      proposal: 'Preserve position and source; confirm full visible base contact in gameplay.' };
  });
  const files = execFileSync('git', ['ls-files', '-z', 'src', 'public', 'tests', 'scripts', 'package.json', 'package-lock.json', 'vite.config.ts', 'playwright.config.ts']).toString().split('\0').filter(Boolean);
  const sourceHashes = {};
  for (const file of files) sourceHashes[file] = hash(await readFile(file));
  assert.equal(platforms.length, 40);
  assert.equal(platforms.filter(p => p.role === 'whole-steel-ferry').length, 1);
  assert.equal(gems.length, 62);
  assert.equal(letters.length, 4);
  assert.equal(walkingHeight, 40);
  assert.ok(platforms.every(p => p.proposal.conservativeStandingClearance >= 2));
  assert.ok(scenery.every(s => s.visibleBottomExclusive === s.y && s.visibleBaseWidth > 20));
  const inventory = {
    schema: 1, status: 'proposal-awaiting-owner-approval',
    sourceRevision: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(),
    sourceHashes, geometry: { width: level.width, height: level.height, start: level.start, finish: level.finish, retrace: level.retrace,
      checkpoints: level.checkpoints, verticalCamera: level.verticalCamera, cameraLead: level.cameraLead },
    measurement: { unit: 'logical game pixels; y increases downward', walkingHeight, proposedDepth,
      limits: 'Conservative static alpha bounding envelopes, not animated gameplay clearance certification; lower-support search expands by 16px at edges.',
      gemRectangle: { width: 32, height: 24, bottomAnchorAboveSupport: 18 }, henryFrames },
    platforms, sameLevelJoins,
    terrain: level.surfaces.map((s, index) => ({ id: `surface-${index}`, ...s,
      role: s.y1 === 1000 && s.y2 === 1000 ? 'below-world pit floor' : s.y1 === s.y2 ? 'gravel ground' : 'steep recovery-gap wall',
      currentAssets: ['public/assets/trails/materials.png#gravel', 'src/world/trail-presentation.ts#drawTerrainEdge'],
      proposal: 'Preserve complete contour; illustrated gravel lip and substrate, with whole edge pieces for the steep walls.' })),
    gems: gems.map(g => ({ ...g, supportIds: supportIds(g.x, g.y + 18) })), letters, proposedGemChanges, scenery,
    absent: ['stars', 'springs', 'crumbling platforms', 'slime entities', 'ice/water bands', 'new scenery requested'],
    invariants: 'All platform coordinates/widths/paths/timing, terrain, letters, checkpoints, finish/retrace, physics, input, camera, all other trails and shared artwork remain unchanged. Only listed gem Y changes are proposed.'
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(inventory, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output, fixed: 39, moving: 1, terrain: inventory.terrain.length, joins: sameLevelJoins.length,
    gemChanges: proposedGemChanges.length, minimumStandingClearance: Math.min(...platforms.map(p => p.proposal.conservativeStandingClearance)) }));
} finally {
  await server.close();
}
