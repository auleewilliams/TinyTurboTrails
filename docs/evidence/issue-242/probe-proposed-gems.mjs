import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

// Planning-only simulation of the proposed exception in a cloned LevelData.
// Uses the exact existing all-gem journey, never edits production source.
const inventory = JSON.parse(await readFile('docs/evidence/issue-242/inventory.json', 'utf8'));
const source = await readFile('tests/sunset-exploration.test.ts', 'utf8');
const start = source.indexOf('route.run([walk(3110)') + 'route.run('.length;
assert.ok(start > 'route.run('.length);
const end = source.indexOf(']);', start) + 1;
assert.ok(end > start);
const expression = source.slice(start, end);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { SUNSET_SITE } = await server.ssrLoadModule('/src/world/sunset-site.ts');
  const { LEVELS } = await server.ssrLoadModule('/src/world/levels.ts');
  const pilot = await server.ssrLoadModule('/tests/sunset-pilot.ts');
  const stages = new Function(...Object.keys(pilot), `return (${expression});`)(...Object.values(pilot));
  const proposed = structuredClone(SUNSET_SITE);
  for (const change of inventory.proposedGemChanges) {
    const targets = proposed.entities.filter(e => e.id === change.id);
    assert.equal(targets.length, 1);
    const entity = targets[0];
    assert.deepEqual({ x: entity.x, y: entity.y }, change.old);
    entity.y = change.proposed.y;
  }
  const results = [];
  for (const [name, level] of [['unchanged', SUNSET_SITE], ['proposed-clone', proposed]]) {
    // AdventureScene selects a registered level by object identity when Play
    // starts. Register the cloned proposal only inside this isolated process;
    // otherwise startSelected silently loads Plains. Restore after construction.
    const index = LEVELS.findIndex(candidate => candidate.id === 'sunset');
    assert.ok(index >= 0);
    const original = LEVELS[index];
    let route;
    try {
      LEVELS[index] = level;
      route = pilot.routePilot(level);
    } finally {
      LEVELS[index] = original;
    }
    assert.equal(route.scene.selectedLevelName, 'SUNSET SITE');
    assert.equal(route.player.x, 60);
    assert.equal(route.player.y + 34, 560);
    route.run(pilot.MAIN_ROUTE);
    assert.equal(route.scene.screenState, 'finish');
    route.scene.activateFinish('Build your word');
    route.scene.menuTargets.find(target => target.label === 'Find more letters').action();
    route.run(stages);
    const missing = level.entities.filter(e => e.kind === 'gem' && !route.runState.collectedGems.has(e.id));
    assert.deepEqual(missing, []);
    assert.equal(route.scene.screenState, 'finish');
    results.push({ name, collected: route.runState.collectedGems.size, missing, screen: route.scene.screenState,
      history: route.history, events: route.events });
  }
  await writeFile('docs/evidence/issue-242/proposed-gem-simulation.json', JSON.stringify({
    sourceRevision: inventory.sourceRevision,
    scope: 'Static proposal plus deterministic simulation only. The proposed level is an in-memory clone; no production source or artwork was changed. Not native/owner visual acceptance.',
    routeSource: 'tests/sunset-exploration.test.ts',
    routeSourceSha256: createHash('sha256').update(source).digest('hex'),
    routeExpression: expression, changedIds: inventory.proposedGemChanges.map(c => c.id), results,
  }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(results.map(({ name, collected, missing, screen }) => ({ name, collected, missing, screen }))));
} finally {
  await server.close();
}
