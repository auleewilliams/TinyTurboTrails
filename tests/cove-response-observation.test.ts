import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { createCoveResponseObserver } from './cove-response-observation';

const url = 'http://127.0.0.1/assets/plains/scenery/foreground.png';
const response = (status: number, address = url, body = async () => Buffer.from('served pixels')) => ({
  status: () => status, url: () => address, body,
});

it('retains 304 transport without reading a body and binds it to the earlier complete 200', async () => {
  const observer = createCoveResponseObserver();
  const unavailable = vi.fn(async () => { throw new Error('body unavailable'); });
  observer.observe(response(200)); observer.observe(response(304, url, unavailable));
  await observer.settle();
  const sha256 = createHash('sha256').update('served pixels').digest('hex');
  expect(observer.assertComplete()).toEqual([{ responseIndex: 1, bodyIndex: 0, sha256 }]);
  expect(observer.records[1]).toMatchObject({ url, status: 304, bodyless: true, sha256: null });
  expect(unavailable).not.toHaveBeenCalled();
});

it.each(['absent', 'later', 'query', 'origin', 'empty'])('rejects a %s cache-body witness', async kind => {
  const observer = createCoveResponseObserver();
  if (kind === 'query') observer.observe(response(200, url + '?other'));
  if (kind === 'origin') observer.observe(response(200, url.replace('127.0.0.1', 'localhost')));
  if (kind === 'empty') observer.observe(response(200, url, async () => Buffer.alloc(0)));
  observer.observe(response(304));
  if (kind === 'later') observer.observe(response(200));
  await observer.settle();
  expect(() => observer.assertComplete()).toThrow('Missing earlier Cove 200 cache witness');
});

it('binds a revalidation to the latest earlier 200 at the exact URL', async () => {
  const observer = createCoveResponseObserver();
  observer.observe(response(200));
  observer.observe(response(200, url, async () => Buffer.from('replacement pixels')));
  observer.observe(response(304));
  await observer.settle();
  expect(observer.assertComplete()).toEqual([{ responseIndex: 2, bodyIndex: 1,
    sha256: createHash('sha256').update('replacement pixels').digest('hex') }]);
});

it('handles a rejected 200 read immediately and still fails verification', async () => {
  const observer = createCoveResponseObserver();
  observer.observe(response(200, url, async () => { throw new Error('failed body'); }));
  await new Promise(resolve => setImmediate(resolve));
  await observer.settle();
  expect(() => observer.assertComplete()).toThrow('failed body');
});

it('rejects HTTP errors and missing 200 hashes', async () => {
  const failed = createCoveResponseObserver(); failed.observe(response(503)); await failed.settle();
  expect(() => failed.assertComplete()).toThrow('503');
  const corrupt = createCoveResponseObserver(); corrupt.observe(response(200)); await corrupt.settle();
  corrupt.records[0].sha256 = null;
  expect(() => corrupt.assertComplete()).toThrow('Missing HUD 200 body hash');
});
