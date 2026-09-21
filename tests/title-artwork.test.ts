import { afterEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadTitleArtwork } from '../src/art/title';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('preserves the approved source and ships a transparent display-sized runtime PNG', () => {
  const source = readFileSync('assets/source/title/tiny-turbo-trails-v2.png');
  expect(createHash('sha256').update(source).digest('hex'))
    .toBe('6d5f4feba06ad2a765c92181a12b7267731a6b7677f826d3ba59e0e144893b75');
  expect([source.readUInt32BE(16), source.readUInt32BE(20), source[25]]).toEqual([1699, 926, 6]);
  const runtime = readFileSync('public/assets/title/tiny-turbo-trails-v2.png');
  expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20), runtime[25]]).toEqual([282, 154, 6]);
});

it('loads title artwork under the configured Vite base and rejects failures', async () => {
  vi.stubEnv('BASE_URL', '/TinyTurboTrails/');
  const requests: string[] = [];
  let fail = false;
  class FakeImage {
    onload = (): void => {};
    onerror = (): void => {};
    set src(url: string) { requests.push(url); queueMicrotask(fail ? this.onerror : this.onload); }
  }
  vi.stubGlobal('Image', FakeImage);
  expect(await loadTitleArtwork()).toBeInstanceOf(FakeImage);
  expect(requests).toEqual(['/TinyTurboTrails/assets/title/tiny-turbo-trails-v2.png']);
  fail = true;
  await expect(loadTitleArtwork()).rejects.toThrow('Could not load');
});
