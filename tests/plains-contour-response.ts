import { createHudResponseObserver, type ObservableResponse, type ServedObservation } from './hud-response-observation';
export interface RequestIdentity { requestId: number | null; recoveryAtEmission: boolean | null; }
export type ContourResponse = ServedObservation & RequestIdentity & { path: string; sequence: number; fileSha256?: string };
/** Metadata/provenance adapter only: the established HUD observer owns all body/error handling. */
export function createContourResponseObserver() {
  const base = createHudResponseObserver();
  const records = base.records as ContourResponse[];
  function observe(response: ObservableResponse, identity: RequestIdentity) {
    base.observe(response);
    Object.assign(records.at(-1)!, identity, { path: new URL(response.url()).pathname, sequence: records.length - 1 });
  }
  function assertComplete(paths: readonly string[], diskDigest: (path: string) => string) {
    base.assertComplete(paths);
    for (const row of records) {
      if (row.requestId === null || row.recoveryAtEmission === null) throw new Error('Missing request emission identity: ' + row.url);
      if (row.status !== 200) continue;
      row.fileSha256 = diskDigest(row.path);
      if (!row.bytes || row.sha256 !== row.fileSha256) throw new Error('Invalid 200 disk digest/body: ' + row.url);
    }
  }
  function assertRecovery(paths: readonly string[], blockedPath: string, diskDigest: (path: string) => string) {
    assertComplete(paths, diskDigest);
    return paths.map(path => {
      const fresh = records.find(r => r.path === path && r.recoveryAtEmission && r.status === 200);
      if (fresh) return { path, recoveryTransport: fresh, body200: fresh, reusedEarlierBody: false };
      if (path !== blockedPath) {
        const canonical = (url: string) => { const u = new URL(url); u.hash = ''; return u.href; };
        for (const transport of records.filter(r => r.path === path && r.recoveryAtEmission && r.status === 304)) {
          const body = records.find(r => r.status === 200 && r.sequence < transport.sequence && canonical(r.url) === canonical(transport.url) && !!r.bytes);
          if (body) return { path, recoveryTransport: transport, body200: body, reusedEarlierBody: true };
        }
      }
      throw new Error('Missing recovery 200/cache provenance: ' + (path === blockedPath ? 'blocked asset ' : '') + path);
    });
  }
  return { records, observe, settle: base.settle, assertComplete, assertRecovery };
}
