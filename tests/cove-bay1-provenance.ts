/** Resolve pilot identity against the same metadata that the native reporter writes. */
export function pilotSourceRevision(supplied: string | undefined, metadata: { sourceRevision?: unknown }): string | null {
  const revision = supplied ?? null;
  if (supplied !== undefined && !/^[a-f0-9]{40}$/.test(supplied)) throw new Error('Invalid supplied pilot source revision');
  if (metadata.sourceRevision !== revision) throw new Error('Pilot source metadata mismatch');
  return revision;
}
