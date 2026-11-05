import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { prepareQuarryRollout } from './quarry-rollout-preparation.mjs';

const output = process.argv[2];
assert.ok(output, 'Explicit project-local/evidence output directory required; never overwrite canonical sources');
// Validate every source, sampled raster, current encoding and sealed copy before writing.
const prepared = prepareQuarryRollout(readFileSync('assets/source/quarry/rollout-v1/preparation-contract.json'), readFileSync);
mkdirSync(output, { recursive: true });
for (const [name, { bytes }] of Object.entries(prepared)) writeFileSync(`${output}/${name}`, bytes);
