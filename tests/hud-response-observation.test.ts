import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { createHudResponseObserver } from './hud-response-observation';
// Synthetic transport probes of the SAME implementation used by the browser fixture.
const response = (status: number, body: () => Promise<Buffer>, path = '/assets/henry/manifest.json') => ({ status: () => status, url: () => 'http://127.0.0.1:4173' + path, body });
it.each([301, 302, 303, 307, 308, 304, 204, 205])('records bodyless HTTP %s without requesting an unavailable body', async status => {
  const observer = createHudResponseObserver(); let reads = 0;
  observer.observe(response(200, async () => Buffer.from('actual 200 bytes')));
  observer.observe(response(status, async () => { reads++; throw new Error('unavailable body'); }));
  await observer.settle(); expect(reads).toBe(0);
  expect(observer.records[1]).toMatchObject({ status, sha256: null, bodyless: true });
  expect(observer.records[0].sha256).toBe(createHash('sha256').update('actual 200 bytes').digest('hex'));
  expect(() => observer.assertComplete(['/assets/henry/manifest.json'])).not.toThrow();
});
it('handles rejected 200 reads immediately and fails closed with URL/status/error retained', async () => {
  const observer = createHudResponseObserver(); observer.observe(response(200, async () => { throw new Error('required body failed'); }));
  await new Promise(resolve => setImmediate(resolve)); await observer.settle();
  expect(observer.records[0]).toMatchObject({ status: 200, sha256: null, error: expect.stringContaining('required body failed') });
  expect(() => observer.assertHealthy()).toThrow('required body failed');
  expect(() => observer.assertComplete(['/assets/henry/manifest.json'])).toThrow('required body failed');
});
it('rejects absent, empty, bodyless-only or corrupted required 200 witnesses', async () => {
  const cachedOnly = createHudResponseObserver();
  cachedOnly.observe(response(304, async () => { throw new Error('must not read'); }, '/required.png'));
  await cachedOnly.settle();
  expect(() => cachedOnly.assertComplete(['/required.png'])).toThrow('Missing required');
  const observer = createHudResponseObserver();
  expect(() => observer.assertComplete(['/required.png'])).toThrow('Missing required');
  observer.observe(response(200, async () => Buffer.alloc(0), '/required.png')); await observer.settle();
  expect(() => observer.assertComplete(['/required.png'])).toThrow('Missing required');
  observer.records[0].sha256 = null;
  expect(() => observer.assertComplete([])).toThrow('Missing HUD 200 body hash');
});
it('captures a synchronous body accessor failure without an unhandled observer rejection', async () => {
  const observer = createHudResponseObserver();
  expect(() => observer.observe(response(200, () => { throw new Error('sync body failure'); }))).not.toThrow();
  await observer.settle(); expect(() => observer.assertComplete([])).toThrow('sync body failure');
});
