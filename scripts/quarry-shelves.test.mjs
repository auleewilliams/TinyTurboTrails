import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareQuarryMasters } from './quarry-shelves.mjs';
const base = 'assets/source/quarry/whole-ledges-v1/';
const source = readFileSync(base + 'source.png'), contract = JSON.parse(readFileSync(base + 'preparation-contract.json')), ledger = readFileSync(base + 'approved-change-ledger.json');
const approved = Object.fromEntries(Object.keys(contract.files).map(w => [w, readFileSync(base + `approved-${w}.png`)]));
test('regenerates all approved bytes/pixels and rejects changed source, correction allowlist, and approved copies', () => {
  const masters = prepareQuarryMasters(source, contract, ledger, approved);
  for (const [w, image] of Object.entries(masters)) assert.ok(image.bytes.equals(readFileSync(`public/assets/quarry/whole-ledges-v1/shelf-${w}.png`)));
  const changed = Buffer.from(source); changed[200] ^= 1;
  assert.throws(() => prepareQuarryMasters(changed, contract, ledger, approved), /source/);
  const edits = JSON.parse(ledger); edits.allChanges[0].destination[0]++;
  assert.throws(() => prepareQuarryMasters(source, contract, Buffer.from(JSON.stringify(edits)), approved), /ledger/);
  const bad = { ...approved, 400: Buffer.from(approved[400]) }; bad[400][100] ^= 1;
  assert.throws(() => prepareQuarryMasters(source, contract, ledger, bad), /PNG/);
});
