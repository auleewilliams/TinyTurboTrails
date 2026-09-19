import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existingDigest, promoteLatest } from './publish-image.mjs';

const a = 'a'.repeat(40);
const b = 'b'.repeat(40);
const digestA = `sha256:${'1'.repeat(64)}`;
const digestB = `sha256:${'2'.repeat(64)}`;

for (const order of [[a, b], [b, a]]) {
  test(`overlapping successful runs complete ${order.map((sha) => sha[0]).join(' then ')}: latest never rolls back`, async () => {
    let latest;
    const shaTags = new Map();
    for (const sha of order) {
      const digest = sha === a ? digestA : digestB;
      shaTags.set(sha, digest);
      await promoteLatest({ sha, digest, readMain: async () => b, promote: async (source) => { latest = source; } });
    }
    assert.equal(latest, `ghcr.io/auleewilliams/tiny-turbo-trails@${digestB}`);
    assert.deepEqual([...shaTags.keys()].sort(), [a, b]);
  });
}

test('main advances during the build: old run preserves previous latest even if new checks fail', async () => {
  let head = a;
  const build = async () => { head = b; return digestA; };
  const promoted = await promoteLatest({ sha: a, digest: await build(), readMain: async () => head,
    promote: async () => assert.fail('Must not promote stale main') });
  assert.equal(promoted, false);
});

test('main advances after freshness read: shared lock prevents a newer publisher being overtaken', async () => {
  let head = a;
  const writes = [];
  await promoteLatest({ sha: a, digest: digestA, readMain: async () => head,
    promote: async (source) => { head = b; writes.push(source); } });
  await promoteLatest({ sha: b, digest: digestB, readMain: async () => head,
    promote: async (source) => { writes.push(source); } });
  await promoteLatest({ sha: a, digest: digestA, readMain: async () => head,
    promote: async () => assert.fail('Queued old rerun must not overwrite B') });
  assert.deepEqual(writes, [digestA, digestB].map((digest) => `ghcr.io/auleewilliams/tiny-turbo-trails@${digest}`));
});

test('freshness API errors and malformed identities fail without writing', async () => {
  for (const readMain of [async () => { throw new Error('API failed'); }, async () => undefined]) {
    await assert.rejects(promoteLatest({ sha: a, digest: digestA, readMain, promote: () => assert.fail() }));
  }
  await assert.rejects(promoteLatest({ sha: a, digest: '', readMain: async () => a, promote: () => assert.fail() }));
});

function registry(response) {
  return async (url, options) => {
    if (url.includes('/token?')) {
      assert.match(options.headers.Authorization, /^Basic /);
      return Response.json({ token: 'registry-test-token' });
    }
    assert.ok(url.endsWith(`/manifests/${a}`));
    assert.equal(options.headers.Authorization, 'Bearer registry-test-token');
    return response;
  };
}

test('rerun reuses existing SHA digest, preserving immutable rollback image', async () => {
  assert.equal(await existingDigest(a, 'actor', 'test-token', registry(new Response('{}', {
    headers: { 'docker-content-digest': digestA },
  }))), digestA);
});

test('only an explicit missing manifest permits a new SHA build', async () => {
  assert.equal(await existingDigest(a, 'actor', 'test-token', registry(Response.json({
    errors: [{ code: 'MANIFEST_UNKNOWN' }],
  }, { status: 404 }))), '');
});

test('registry denial, outages, ambiguous 404s, and invalid digest fail closed', async () => {
  for (const response of [new Response('', { status: 401 }), new Response('', { status: 500 }),
    Response.json({ errors: [{ code: 'NAME_UNKNOWN' }] }, { status: 404 }), new Response('{}')]) {
    await assert.rejects(existingDigest(a, 'actor', 'test-token', registry(response)));
  }
  await assert.rejects(existingDigest(a, 'actor', 'test-token', async () => new Response('', { status: 403 })));
  await assert.rejects(existingDigest(a, 'actor', 'test-token', async () => { throw new Error('Network failure'); }));
});
