import type { Page } from '@playwright/test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRolloutEvidence } from './cove-rollout-evidence';
import { retainContourCache } from './plains-contour-evidence';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { contourColumns, readContourCache } from './plains-contour-artwork';

const { encodePng } = createRequire(import.meta.url)('../scripts/spelling-stickers.mjs') as {
  encodePng(v: { width: number; height: number; data: Uint8Array }): Buffer;
};
interface Packet { ribbonPixels: unknown; ribbonSize: unknown; [key: string]: unknown }
function fixture(height = 114) {
  const width = 4300;
  const raw = Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) => i % 256);
  let png = encodePng({ width, height, data: new Uint8Array(raw) });
  const sourceDraws = Array.from({ length: 4300 }, (_, i) => [20, 0, 1, 16, i, 0, 1, 16]);
  const soilDraws = Array.from({ length: 5172 }, (_, i) => [0, 0, 1, 64, i, 8, 1, 64]);
  const history = Array.from({ length: 16 }, (_, i) => ({ frame: i, coherent: true, obscured: false,
    henry: { x: i, feet: 206, sourceRect: [0, 0, 48, 48], frame: i, transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
    ribbon: { x: 580, y: 126, args: [0, 126], frame: i, origin: { x: 0, y: 126 }, referenceOffsetX: 580 } }));
  const probe = { sourceDraws, soilDraws, history, ribbonDrawCount: 16,
    source: { src: '/grass.png', naturalWidth: 80, naturalHeight: 16 }, soil: { src: '/soil.png', naturalWidth: 64, naturalHeight: 64 },
    ribbon: { width, height, toDataURL: () => 'data:image/png;base64,' + png.toString('base64'), getContext: () => ({
      getImageData: (x: number, y: number, w: number, h: number) => {
        if (x === 0 && y === 0 && w === width && h === height) return { data: raw };
        const data = new Uint8ClampedArray(w * h * 4);
        for (let row = 0; row < h; row++) data.set(raw.subarray(((y + row) * width + x) * 4, ((y + row) * width + x + w) * 4), row * w * 4);
        return { data };
      },
    }) },
  };
  let wire: Packet | undefined;
  const page = (change?: (packet: Packet) => unknown) => ({
    evaluate: async (callback: (...args: never[]) => unknown, args: unknown) => {
      // Execute the ACTUAL helper callback serialized into a separate realm; no copied encoder/closure.
      wire = runInNewContext('(' + callback.toString() + ')(args)', { window: { contourProbe: probe }, args, btoa, Uint8ClampedArray }) as Packet;
      return structuredClone(change ? change(wire) : wire);
    },
  }) as unknown as Page;
  return { raw, probe, page, wire: () => wire!, setPNG: (data: Uint8Array) => { png = encodePng({ width, height, data }); } };
}

it('transfers the actual callback full raw byte field compactly while restoring the existing public shape', async () => {
  const f = fixture(), result = await readContourCache(f.page());
  expect(typeof f.wire().ribbonPixels).toBe('string');
  expect(f.wire().ribbonPixels).toBe(Buffer.from(f.raw).toString('base64'));
  expect(Array.isArray(result.ribbonPixels)).toBe(true);
  expect(Buffer.from(result.ribbonPixels).equals(Buffer.from(f.raw))).toBe(true);
  expect(result.ribbonPixels).toHaveLength(1960800);
  expect(new Set(result.ribbonPixels).size).toBe(256);
  expect(result.ribbonSize).toEqual([4300, 114]);
  const { ribbonPixels: _wire, ...wireMetadata } = f.wire();
  const { ribbonPixels: _public, ...publicMetadata } = result;
  expect(publicMetadata).toEqual(wireMetadata);
  expect(Object.keys(result)).toEqual(Object.keys(f.wire()));
  expect(Object.keys(result)).toEqual(['pixelFailures', 'bodyPixelsCompared', 'soilDraws', 'soilURL', 'soilSize', 'ribbonPNG', 'ribbonPixels', 'failures', 'columns', 'sourceURL', 'sourceSize', 'sourceDraws', 'ribbonSize', 'ribbonDrawCount', 'history']);
  expect(result.sourceDraws).toEqual(f.probe.sourceDraws);
  expect(result.soilDraws).toEqual(f.probe.soilDraws);
  expect(result.history).toEqual(f.probe.history);
  expect(result.columns).toBe(contourColumns.length);
  expect(result.bodyPixelsCompared).toBe(187244);
  for (const at of [32767, 32768, 32769, 65535, 65536, result.ribbonPixels.length - 1]) expect(result.ribbonPixels[at]).toBe(f.raw[at]);
});

const badPackets: [string, (packet: Packet) => unknown][] = [
  ['missing packet', () => undefined], ['null packet', () => null], ['empty packet', () => ({})],
  ['missing raw', p => { delete p.ribbonPixels; return p; }],
  ['empty raw', p => ({ ...p, ribbonPixels: '' })],
  ['wrong raw type', p => ({ ...p, ribbonPixels: 12 })],
  ['numeric fallback', p => ({ ...p, ribbonPixels: [0, 1, 2, 3] })],
  ['truncated raw', p => ({ ...p, ribbonPixels: (p.ribbonPixels as string).slice(0, -4) })],
  ['same encoded length but fewer decoded bytes', p => ({ ...p, ribbonPixels: Buffer.from(p.ribbonPixels as string, 'base64').subarray(0, -1).toString('base64') })],
  ['invalid alphabet', p => ({ ...p, ribbonPixels: '-' + (p.ribbonPixels as string).slice(1) })],
  ['whitespace', p => ({ ...p, ribbonPixels: ' ' + (p.ribbonPixels as string).slice(1) })],
  ['wrong dimensions type', p => ({ ...p, ribbonSize: '4300x114' })],
  ['missing dimensions', p => { delete p.ribbonSize; return p; }],
  ['empty dimensions', p => ({ ...p, ribbonSize: [] })],
  ['wrong dimension count', p => ({ ...p, ribbonSize: [4300, 114, 4] })],
  ['fractional dimensions', p => ({ ...p, ribbonSize: [4300, 114.5] })],
  ['string dimensions', p => ({ ...p, ribbonSize: ['4300', 114] })],
  ['zero dimensions', p => ({ ...p, ribbonSize: [4300, 0] })],
  ['negative dimensions', p => ({ ...p, ribbonSize: [-4300, 114] })],
  ['unsafe dimensions', p => ({ ...p, ribbonSize: [Number.MAX_SAFE_INTEGER, 114] })],
  ['wrong byte length', p => ({ ...p, ribbonSize: [4301, 114] })],
];
it.each(badPackets)('rejects %s without array fallback or partial data', async (_name, change) => {
  const f = fixture();
  await expect(readContourCache(f.page(change))).rejects.toThrow(/contour raw/);
});
it('rejects noncanonical padding bits even when permissive base64 decode gives identical bytes', async () => {
  const f = fixture(115), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  await expect(readContourCache(f.page(p => {
    const canonical = p.ribbonPixels as string, at = canonical.length - 3;
    expect(canonical.endsWith('==')).toBe(true);
    const bad = canonical.slice(0, at) + alphabet[alphabet.indexOf(canonical[at]) ^ 1] + '==';
    expect(Buffer.from(bad, 'base64').equals(Buffer.from(canonical, 'base64'))).toBe(true);
    return { ...p, ribbonPixels: bad };
  }))).rejects.toThrow(/canonical/);
});
function evidence() {
  const root = mkdtempSync(join(tmpdir(), 'raw-wire-unit-'));
  return createRolloutEvidence({ outputPath: (...p) => join(root, ...p), attach: async () => {} });
}
it('roundtrips through the unchanged independent full PNG/raw oracle', async () => {
  const f = fixture(), raster = await readContourCache(f.page()), files = evidence();
  const retained = await retainContourCache(files, raster);
  expect(retained.ribbonPixels).toMatchObject({ byteLength: f.raw.length, encoding: 'RGBA8 from ribbonPNG' });
  await files.assertIntegrity();
});
it('rejects independently corrupted raw bytes with unchanged PNG at the existing oracle', async () => {
  const f = fixture();
  f.raw[0] ^= 1; // getImageData changes; the separately prepared PNG does not.
  const raster = await readContourCache(f.page());
  expect(raster.ribbonPixels[0]).toBe(f.raw[0]);
  await expect(retainContourCache(evidence(), raster)).rejects.toThrow('Contour PNG/readback mismatch');
});
it('rejects independently corrupted PNG with unchanged raw at the existing oracle', async () => {
  const f = fixture(), wrongPNG = new Uint8Array(f.raw);
  wrongPNG[0] ^= 1;
  f.setPNG(wrongPNG);
  const raster = await readContourCache(f.page());
  expect(Buffer.from(raster.ribbonPixels).equals(Buffer.from(f.raw))).toBe(true);
  await expect(retainContourCache(evidence(), raster)).rejects.toThrow('Contour PNG/readback mismatch');
});

it('uses the OS temporary-directory provider with or without synthetic TMPDIR, without real IO', () => {
  const source = readFileSync(new URL(import.meta.url), 'utf8');
  const actual = source.match(/^function evidence\(\) \{[\s\S]*?^\}/m)![0];
  // Erase only the old TypeScript non-null assertion; execute the actual helper body.
  const javascript = actual.replace('process.env.TMPDIR!', 'process.env.TMPDIR');
  for (const env of [{}, { TMPDIR: '/synthetic/supplied' }] as Record<string, string>[]) {
    const expected = env.TMPDIR ?? '/synthetic/os-temp', prefixes: string[] = [];
    const isolated = runInNewContext('(' + javascript + ')', {
      process: { env }, join, tmpdir: () => expected,
      mkdtempSync: (prefix: string) => { prefixes.push(prefix); return prefix + 'case'; },
      createRolloutEvidence: (info: unknown) => info,
    }) as () => { outputPath(...parts: string[]): string };
    const result = isolated();
    expect(prefixes).toEqual([join(expected, 'raw-wire-unit-')]);
    expect(result.outputPath('proof.json')).toBe(join(expected, 'raw-wire-unit-case', 'proof.json'));
  }
});
