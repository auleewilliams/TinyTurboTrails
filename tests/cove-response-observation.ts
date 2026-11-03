import { createHudResponseObserver } from './hud-response-observation';

/** Retain bodyless revalidations and bind them to earlier bytes at the same URL. */
export function createCoveResponseObserver() {
  const base = createHudResponseObserver();
  const assertComplete = () => {
    base.assertComplete([]);
    for (const row of base.records) if (row.status >= 400) throw new Error(`Cove response failed: ${row.status} ${row.url}`);
    return base.records.flatMap((row, responseIndex) => {
      if (row.status !== 304) return [];
      let bodyIndex = responseIndex - 1;
      while (bodyIndex >= 0 && !(base.records[bodyIndex].url === row.url && base.records[bodyIndex].status === 200)) bodyIndex--;
      if (bodyIndex < 0 || !base.records[bodyIndex].bytes || !base.records[bodyIndex].sha256) {
        throw new Error(`Missing earlier Cove 200 cache witness: ${row.url}`);
      }
      return [{ responseIndex, bodyIndex, sha256: base.records[bodyIndex].sha256 }];
    });
  };
  return { records: base.records, observe: base.observe, settle: base.settle, assertComplete };
}
