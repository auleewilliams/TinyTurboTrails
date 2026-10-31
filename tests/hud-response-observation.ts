import { createHash } from 'node:crypto';
export interface ObservableResponse { url(): string; status(): number; body(): Promise<Buffer>; }
export interface ServedObservation { url: string; status: number; sha256: string | null; bytes?: number; bodyless?: boolean; error?: string; }
/** Every event is retained; rejected body reads are handled when registered. */
export function createHudResponseObserver() {
  const records: ServedObservation[] = [], pending: Promise<void>[] = [];
  const observe = (response: ObservableResponse): void => {
    const row: ServedObservation = { url: response.url(), status: response.status(), sha256: null };
    records.push(row);
    // 304 is cache revalidation, not a new entity body. Preserve its transport
    // record and require the original 200 witness for every loaded asset below.
    if (row.status === 204 || row.status === 205 || row.status >= 300 && row.status < 400) {
      row.bodyless = true; return;
    }
    pending.push(Promise.resolve().then(() => response.body()).then(bytes => {
      row.bytes = bytes.length; row.sha256 = createHash('sha256').update(bytes).digest('hex');
    }, error => { row.error = String(error); }));
  };
  const assertHealthy = (): void => {
    const failures = records.filter(row => row.error);
    if (failures.length) throw new Error('HUD response body failure: ' + JSON.stringify(failures));
  };
  const settle = async (): Promise<void> => {
    let count = 0;
    while (count !== pending.length) { count = pending.length; await Promise.all(pending.slice(0, count)); }
  };
  const assertComplete = (requiredPaths: readonly string[]): void => {
    assertHealthy();
    for (const row of records) if (row.status === 200 && !/^[a-f0-9]{64}$/.test(row.sha256 ?? '')) {
      throw new Error('Missing HUD 200 body hash: ' + row.url);
    }
    for (const path of requiredPaths) if (!records.some(row => new URL(row.url).pathname === path && row.status === 200 && !!row.bytes && /^[a-f0-9]{64}$/.test(row.sha256 ?? ''))) {
      throw new Error('Missing required HUD 200 body witness: ' + path);
    }
  };
  return { records, observe, settle, assertHealthy, assertComplete };
}
