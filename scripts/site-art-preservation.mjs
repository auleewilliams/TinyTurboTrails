import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const originalManifest = '176ce7b94cf713fa3c099f1e62511227b67c384e1159a4b8ecce3547c40333da';
const declaration = '  "siteTerrain": "steel-v1/manifest.json",\n';
const sourceRecord = JSON.parse(readFileSync(new URL('../assets/source/site/steel-v1/owner-feedback-preservation.json', import.meta.url)));

/** Remove only the exact recorded Sunset integration before historical pins.
 * Shared loader/renderer bytes return to merged Timbers main; callers then apply
 * the existing Timbers/Plains projections. Any unrelated source byte change still fails.
 */
export function beforeSiteArt(path, bytes) {
  if (path !== 'public/assets/site/manifest.json') {
    const record = sourceRecord.files[path];
    if (!record) return bytes;
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest === record.baselineSha256) return bytes;
    assert.equal(digest, record.currentSha256, 'exact bounded Sunset rollout source: ' + path);
    const original = readFileSync(new URL('../' + record.baselineCopy, import.meta.url));
    assert.equal(createHash('sha256').update(original).digest('hex'), record.baselineSha256, 'immutable Sunset baseline copy');
    return original;
  }
  if (createHash('sha256').update(bytes).digest('hex') === originalManifest) return bytes;
  const text = bytes.toString();
  assert.equal(text.split(declaration).length, 2, 'unique approved Sunset declaration');
  const original = Buffer.from(text.replace(declaration, ''));
  assert.equal(createHash('sha256').update(original).digest('hex'), originalManifest, 'unchanged non-declaration Sunset manifest bytes');
  return original;
}
