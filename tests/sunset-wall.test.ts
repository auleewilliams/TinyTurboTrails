import { expect, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { attemptWallRoute, WALL_CADENCES, type WallVariant } from './sunset-wall-pilot';

const record = (row: ReturnType<typeof attemptWallRoute>) => {
  if (process.env.SUNSET_WALL_EVIDENCE_FILE) appendFileSync(process.env.SUNSET_WALL_EVIDENCE_FILE, JSON.stringify(row) + '\n');
};
const known = [{ cadence: [0.016], pre: 2, k: 14 }, { cadence: [1 / 60], pre: 0, k: 14 }, { cadence: [1 / 60], pre: 1, k: 13 }];
it.each(known)('blocks the actual wall-contact/second-jump/finish witness $cadence pre$pre k$k', ({ cadence, pre, k }) => {
  const row = attemptWallRoute(cadence, pre, k); record(row);
  expect(row.finished, JSON.stringify(row)).toBe(false);
  expect(row.supportOrder).not.toContain('site-yard');
  expect(row.recovered).toBe(true);
});

const phases = WALL_CADENCES.flatMap(cadence => [0, 1, 2, 3].map(pre => ({ cadence, pre })));
for (const variant of ['reviewer', 'repeat'] as const) it.each(phases)(`keeps all30 ${variant} takeoffs local at $cadence pre$pre with ground-contact continuations`, ({ cadence, pre }) => {
  const rows = Array.from({ length: 30 }, (_, k) => attemptWallRoute(cadence, pre, k, variant));
  rows.forEach(record);
  expect(rows.filter(row => row.finished || row.contacts.length || !row.recovered), JSON.stringify(rows)).toEqual([]);
  expect(rows.flatMap(row => row.supportOrder)).not.toContain('site-yard');
});

const variants = WALL_CADENCES.flatMap(cadence => [0, 1, 2, 3].flatMap(pre =>
  (['pause', 'reverse', 'short-hold'] as WallVariant[]).map(variant => ({ cadence, pre, variant }))));
it.each(variants)('keeps $variant contact continuations local at $cadence pre$pre', ({ cadence, pre, variant }) => {
  const rows = [0, 10, 13, 14, 16, 20, 29].map(k => attemptWallRoute(cadence, pre, k, variant));
  rows.forEach(record);
  expect(rows.filter(row => row.finished || row.contacts.length || !row.recovered), JSON.stringify(rows)).toEqual([]);
});
