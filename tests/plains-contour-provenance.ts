/** Metadata provenance; synthetic CI tests must never rewrite dirty local evidence. */
export function contourProvenance(metadata: Record<string, unknown>) {
  const revision = typeof metadata.sourceRevision === 'string' && metadata.sourceRevision.length ? metadata.sourceRevision : null;
  return { sourceRevision: revision, precommit: revision === null };
}
