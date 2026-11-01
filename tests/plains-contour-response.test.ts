import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { createContourResponseObserver } from './plains-contour-response';
const hash = (b: string) => createHash('sha256').update(b).digest('hex');
const paths = ['/manifest.json', '/grass.png', '/soil.png'];
const disk = (p: string) => hash(p);
function fixture() {
  const o = createContourResponseObserver(); let id = 0, bodylessReads = 0;
  const add = (p: string, status: number, recovery: boolean, body = p, fail = false) => o.observe({
    url: () => 'http://local.test' + p, status: () => status, body: async () => {
      if (status === 304) { bodylessReads++; throw new Error('304 must never be read'); }
      if (fail) throw new Error('genuine body failure'); return Buffer.from(body);
    },
  }, { requestId: ++id, recoveryAtEmission: recovery });
  return { o, add, reads: () => bodylessReads };
}
it.each(['/grass.png', '/soil.png'])('chains earlier companion200/recovery304 while blocked %s requires fresh200', async blocked => {
  const companion = blocked === '/soil.png' ? '/grass.png' : '/soil.png';
  const f = fixture(); f.add(companion, 200, false); f.add('/manifest.json', 200, true); f.add(companion, 304, true); f.add(blocked, 200, true);
  await f.o.settle(); const links = f.o.assertRecovery(paths, blocked, disk);
  expect(f.reads()).toBe(0); expect(f.o.records[2]).toMatchObject({ status: 304, bodyless: true, sha256: null, requestId: 3, recoveryAtEmission: true });
  expect(f.o.records[2].bytes).toBeUndefined();
  const link = links.find(w => w.path === companion)!;
  expect(link.body200.status).toBe(200); expect(link.recoveryTransport.status).toBe(304);
});
it('rejects missing original200, missing fresh blocked200, wrong digest, empty body and wrong canonical URL', async () => {
  for (const mode of ['missing-original', 'missing-blocked', 'wrong-digest', 'empty', 'wrong-url', 'missing-recovery']) {
    const f = fixture();
    if (mode !== 'missing-original') f.add(mode === 'wrong-url' ? '/grass.png?other' : '/grass.png', 200, false, '/grass.png');
    if (mode === 'missing-blocked') f.add('/soil.png', 200, false);
    f.add('/manifest.json', 200, true); if (mode !== 'missing-recovery') f.add('/grass.png', 304, true);
    f.add('/soil.png', mode === 'missing-blocked' ? 304 : 200, true, mode === 'empty' ? '' : mode === 'wrong-digest' ? 'corrupt' : '/soil.png');
    await f.o.settle(); expect(() => f.o.assertRecovery(paths, '/soil.png', disk), mode).toThrow(); expect(f.reads()).toBe(0);
  }
});
it('handles a genuine read failure at registration before settle, then fails completeness', async () => {
  const f = fixture(); f.add('/soil.png', 200, true, '', true);
  await new Promise(resolve => setImmediate(resolve));
  expect(f.o.records[0].error).toContain('genuine body failure');
  await f.o.settle(); expect(() => f.o.assertComplete(['/soil.png'], disk)).toThrow('genuine body failure');
});
