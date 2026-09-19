import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const image = 'ghcr.io/auleewilliams/tiny-turbo-trails';
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const shaPattern = /^[a-f0-9]{40}$/;

// Only a registry-confirmed missing manifest permits creating a SHA tag.
// Authentication failures, transport failures and unexpected responses fail closed.
export async function existingDigest(sha, actor, token, request = fetch) {
  if (!shaPattern.test(sha)) throw new Error('Invalid commit SHA');
  const auth = await request('https://ghcr.io/token?service=ghcr.io&scope=repository:auleewilliams/tiny-turbo-trails:pull', {
    headers: { Authorization: `Basic ${Buffer.from(`${actor}:${token}`).toString('base64')}` },
  });
  if (!auth.ok) throw new Error(`Registry authentication failed: ${auth.status}`);
  const credentials = await auth.json();
  if (!credentials.token) throw new Error('Missing registry token');
  const response = await request(`https://ghcr.io/v2/auleewilliams/tiny-turbo-trails/manifests/${sha}`, {
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      Accept: 'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json',
    },
  });
  if (response.status === 404) {
    const body = await response.json();
    if (body.errors?.length && body.errors.every(({ code }) => code === 'MANIFEST_UNKNOWN')) return '';
  }
  if (!response.ok) throw new Error(`Registry manifest lookup failed: ${response.status}`);
  const digest = response.headers.get('docker-content-digest');
  if (!digestPattern.test(digest ?? '')) throw new Error('Missing or invalid registry digest');
  return digest;
}

// Call only while holding the shared publish job lock, after successful checks
// and SHA publication. Check freshness *after* the potentially slow build.
export async function promoteLatest({ sha, digest, readMain, promote }) {
  if (!shaPattern.test(sha) || !digestPattern.test(digest ?? '')) throw new Error('Invalid image identity');
  const head = await readMain();
  if (!shaPattern.test(head ?? '')) throw new Error('Invalid main ref response');
  if (head !== sha) return false;
  await promote(`${image}@${digest}`, `${image}:latest`);
  return true;
}

async function main() {
  const { GITHUB_SHA: sha, GITHUB_ACTOR: actor, GH_TOKEN: token } = process.env;
  if (process.env.GITHUB_EVENT_NAME !== 'push' || process.env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Publishing requires a main push');
  }
  if (!token) throw new Error('Missing GitHub token');
  if (process.argv[2] === 'existing') {
    const digest = await existingDigest(sha, actor, token);
    appendFileSync(process.env.GITHUB_OUTPUT, `digest=${digest}\n`);
  } else if (process.argv[2] === 'promote') {
    const promoted = await promoteLatest({
      sha, digest: process.env.IMAGE_DIGEST,
      readMain: async () => {
        const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/git/ref/heads/main`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Cache-Control': 'no-cache' },
        });
        if (!response.ok) throw new Error(`Main ref lookup failed: ${response.status}`);
        return (await response.json()).object?.sha;
      },
      promote: (source, tag) => execFileSync('docker', ['buildx', 'imagetools', 'create', '--tag', tag, source], { stdio: 'inherit' }),
    });
    console.log(promoted ? `Promoted ${sha} to latest` : `Skipped latest: ${sha} is no longer main`);
  } else throw new Error('Expected existing or promote');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
