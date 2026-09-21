import { afterEach, expect, it, vi } from 'vitest';
import { loadHenry, loadHenryPreview } from '../src/art/henry';

const manifest = {
  image: 'starter.png', logicalSize: { width: 48, height: 48 }, anchor: { x: 24, y: 44 },
  frames: [{ x: 0, y: 0, width: 48, height: 48 }],
  animations: Object.fromEntries(['idle', 'run', 'jump', 'fall', 'celebrate'].map((name) =>
    [name, { frames: [0], frameSeconds: 0.12, loop: name !== 'celebrate' }])),
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function stubAssets(): string[] {
  const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    requests.push(url);
    return { ok: true, json: async () => manifest };
  }));
  class FakeImage {
    naturalWidth = 48;
    naturalHeight = 48;
    onload = (): void => {};
    onerror = (): void => {};
    set src(url: string) { requests.push(url); queueMicrotask(this.onload); }
  }
  vi.stubGlobal('Image', FakeImage);
  return requests;
}

it('loads only gameplay animation assets for adventure consumers', async () => {
  const requests = stubAssets();
  await loadHenry();
  expect(requests).toEqual(['/assets/henry/manifest.json', '/assets/henry/starter.png']);
  expect(requests).not.toContain('/assets/henry/reference.png');
});

it('loads the reference vignette only for the art preview', async () => {
  const requests = stubAssets();
  const assets = await loadHenryPreview();
  expect(assets).toHaveProperty('reference');
  expect(requests).toContain('/assets/henry/reference.png');
});
