import { copyFile, readFile } from 'node:fs/promises';
import type { RolloutAttachmentInfo } from './cove-rollout-evidence';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createRolloutEvidence } from './cove-rollout-evidence';
const { decodePng } = createRequire(import.meta.url)('../scripts/spelling-stickers.mjs') as {
  decodePng(v: Buffer): { width: number; height: number; data: Uint8Array };
};

/** Keep one full cache PNG; its lossless RGBA reconstruction replaces the large JSON array. */
export async function retainContourCache(evidence: ReturnType<typeof createRolloutEvidence>, raster: {
  ribbonPNG: string; ribbonPixels: number[]; ribbonSize: number[]; [key: string]: unknown;
}): Promise<Record<string, unknown>> {
  const { ribbonPNG, ribbonPixels, ...metadata } = raster;
  if (!ribbonPNG.startsWith('data:image/png;base64,')) throw new Error('Missing contour PNG');
  const payload = ribbonPNG.slice('data:image/png;base64,'.length), bytes = Buffer.from(payload, 'base64');
  if (bytes.toString('base64') !== payload) throw new Error('Invalid contour PNG transport');
  if (ribbonPixels.some(value => !Number.isInteger(value) || value < 0 || value > 255)) throw new Error('Invalid contour RGBA sample');
  const decoded = decodePng(bytes), rgba = Buffer.from(ribbonPixels);
  if (decoded.width !== raster.ribbonSize[0] || decoded.height !== raster.ribbonSize[1]
    || rgba.length !== decoded.width * decoded.height * 4 || !Buffer.from(decoded.data).equals(rgba)) {
    throw new Error('Contour PNG/readback mismatch');
  }
  const reference = await evidence.attach('actual-A-C-cache', { body: bytes, contentType: 'image/png' });
  return { ...metadata, ribbonPNG: reference, ribbonPixels: { encoding: 'RGBA8 from ribbonPNG', byteLength: rgba.length,
    sha256: createHash('sha256').update(rgba).digest('hex') } };
}

/** Preserve the established named JSON entry points while transporting large images by reference. */
export function createContourEvidence(info: RolloutAttachmentInfo) {
  const named = new Map<string, string>();
  const transport = createRolloutEvidence({
    outputPath: (...parts) => info.outputPath(...parts),
    attach: async (name, options) => {
      if (options.contentType === 'application/json' && options.path) {
        const path = info.outputPath(name + '.json');
        await copyFile(options.path, path);
        named.set(path, createHash('sha256').update(await readFile(path)).digest('hex'));
        await info.attach(name, { path, contentType: options.contentType });
      } else await info.attach(name, options);
    },
  });
  return { ...transport, assertIntegrity: async () => {
    await transport.assertIntegrity();
    for (const [path, expected] of named) if (createHash('sha256').update(await readFile(path)).digest('hex') !== expected) throw new Error('Named contour evidence changed: ' + path);
  } };
}
