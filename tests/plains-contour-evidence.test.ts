import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createRolloutEvidence, type RolloutEvidenceReference } from './cove-rollout-evidence';
import { retainContourCache } from './plains-contour-evidence';
const { encodePng, decodePng } = createRequire(import.meta.url)('../scripts/spelling-stickers.mjs') as {
  encodePng(v: { width: number; height: number; data: Uint8Array }): Buffer;
  decodePng(v: Buffer): { width: number; height: number; data: Uint8Array };
};
const sha = (v: Uint8Array) => createHash('sha256').update(v).digest('hex');
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'contour-transport-'));
  const rows: { name: string; path?: string }[] = [];
  const evidence = createRolloutEvidence({ outputPath: (...p) => join(dir, ...p), attach: async (name, options) => { rows.push({ name, path: options.path }); } });
  const pixels = [13, 27, 39, 255, 0, 0, 0, 0];
  const png = encodePng({ width: 2, height: 1, data: Uint8Array.from(pixels) });
  const raster = { ribbonPNG: 'data:image/png;base64,' + png.toString('base64'), ribbonPixels: pixels, ribbonSize: [2, 1], failures: [], columns: 2 };
  return { evidence, raster, rows };
}
it('retains the entire cache losslessly with unchanged metadata and reconstructable RGBA instead of repeated arrays', async () => {
  const { evidence, raster } = fixture();
  const stored = await retainContourCache(evidence, raster);
  const ref = stored.ribbonPNG as RolloutEvidenceReference;
  expect(ref.kind).toBe('rollout-evidence-file');
  expect(readFileSync(ref.path).length).toBe(ref.byteLength);
  expect(sha(readFileSync(ref.path))).toBe(ref.sha256);
  expect(stored.ribbonPixels).toEqual({ encoding: 'RGBA8 from ribbonPNG', byteLength: 8, sha256: sha(Uint8Array.from(raster.ribbonPixels)) });
  expect({ ...stored, ribbonPNG: 'data:image/png;base64,' + readFileSync(ref.path).toString('base64'), ribbonPixels: Array.from(decodePng(readFileSync(ref.path)).data) }).toEqual(raster);
  await evidence.assertIntegrity();
});
it('rejects changed readback, dimensions and PNG bytes instead of certifying incomplete cache evidence', async () => {
  for (const mode of ['pixels', 'dimensions', 'png', 'out-of-byte', 'fractional']) {
    const { evidence, raster } = fixture();
    if (mode === 'pixels') raster.ribbonPixels[0] ^= 1;
    if (mode === 'out-of-byte') raster.ribbonPixels[0] += 256;
    if (mode === 'fractional') raster.ribbonPixels[0] += 0.5;
    if (mode === 'dimensions') raster.ribbonSize[0]++;
    if (mode === 'png') raster.ribbonPNG = 'data:image/png;base64,bad';
    await expect(retainContourCache(evidence, raster), mode).rejects.toThrow();
  }
});
it('missing/corrupt retained cache fails integrity without regeneration', async () => {
  for (const mode of ['missing', 'corrupt']) {
    const { evidence, raster } = fixture();
    const stored = await retainContourCache(evidence, raster), ref = stored.ribbonPNG as RolloutEvidenceReference;
    if (mode === 'missing') unlinkSync(ref.path);
    else { const bytes = readFileSync(ref.path); bytes[bytes.length - 1] ^= 1; writeFileSync(ref.path, bytes); }
    await expect(evidence.assertIntegrity()).rejects.toThrow();
  }
});
it('preserves named observer entry points and rejects missing/corrupt named metadata', async () => {
  for (const mode of ['missing', 'corrupt']) {
    const dir = mkdtempSync(join(tmpdir(), 'contour-named-'));
    const { createContourEvidence } = await import('./plains-contour-evidence');
    const evidence = createContourEvidence({ outputPath: (...p) => join(dir, ...p), attach: async () => {} });
    await evidence.observe('raw-frame-contact-input-history', { status: 'fixture', controller: { png: fixture().raster.ribbonPNG } });
    const path = join(dir, 'raw-frame-contact-input-history.json');
    expect(JSON.parse(readFileSync(path, 'utf8')).status).toBe('fixture');
    await evidence.assertIntegrity();
    if (mode === 'missing') unlinkSync(path); else writeFileSync(path, 'corrupt');
    await expect(evidence.assertIntegrity()).rejects.toThrow();
  }
});

it.each([[0,"contour-transport-"],[1,"contour-named-"]] as const)('portable temp provider at callsite %s (%s), with synthetic missing/supplied environment', (index: number, prefix: string) => {
  const source = readFileSync(new URL(import.meta.url), 'utf8');
  const declarations = [...source.matchAll(/^ *const dir = mkdtempSync\(join\([^\n]+\);$/gm)].map(match => match[0].trim());
  expect(declarations).toHaveLength(2);
  // Execute the live callsite; erase only its old TypeScript non-null assertion.
  const declaration = declarations[index].replace('process.env.TMPDIR!', 'process.env.TMPDIR');
  for (const env of [{}, { TMPDIR: '/synthetic/supplied' }] as Record<string, string>[]) {
    const expected = env.TMPDIR ?? '/synthetic/os-temp', calls: string[] = [];
    const dir = runInNewContext('(() => { ' + declaration + ' return dir; })()', {
      process: { env }, tmpdir: () => expected, join,
      mkdtempSync: (value: string) => { calls.push(value); return value + 'case'; },
    });
    expect(calls).toEqual([join(expected, prefix)]);
    expect(dir).toBe(join(expected, prefix + 'case'));
  }
});
