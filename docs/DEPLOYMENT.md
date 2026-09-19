# Deployment

For local development/play and current controls, see [the root README](../README.md).
This guide owns LAN deployment only; the presentation milestone does not deploy changes.


Tiny Turbo Trails runs on the home network as a static build served by nginx
inside a Docker container, on an LXC container on the Proxmox host. This is
LAN-only: no TLS, no port forwarding, no public DNS. `docker-compose.yml`
leaves room for a reverse proxy to be added later for HTTPS and a public
hostname, without rebuilding the image: a ready-to-use `Caddyfile` sits
alongside it, wired up by uncommenting the `caddy` service in
`docker-compose.yml` (see the comment there for the one line change that
routes external traffic through Caddy instead of straight to the game).
Not needed, and not enabled, for the current LAN-only deploy below.

The Proxmox host itself never needs Node.js or a checkout of the source.
GitHub Actions builds the image and pushes it to GHCR on every push to
`main` that passes typecheck, the unit suite, the build and the browser
suite; the LXC container only ever pulls a built image.

## Publishing eligibility and ordering

The `publish` job requires successful `check` results and a push to `main`.
PRs build and smoke-test the container but never log in to GHCR or publish.
Default permissions are `contents: read`; only `publish` adds `packages: write`.

All publishing uses the `ghcr-main-publish` concurrency group without cancelling
an active publisher. The job first checks for an existing full commit-SHA tag:
reruns reuse its registry digest instead of rebuilding or overwriting it. Only
an explicit registry `MANIFEST_UNKNOWN` response allows a new SHA image build;
registry/authentication errors stop the job.

After the build, the job reads `refs/heads/main` through the GitHub API while
still holding the lock. Only an exact match with the checked commit promotes
its digest to `latest`. An older build finishing after a newer one keeps its
SHA tag and skips `latest`. If main advances during the build, the old run also
skips promotion even if the newer checks later fail; the previous `latest`
remains available. A push between the freshness read and registry write can
make the promoted image temporarily behind main, but the lock prevents it from
overtaking a newer publisher. This policy assumes ordinary forward main history
and that all writers use this workflow; external manual tag writes are outside
its ordering guarantee.

GitHub concurrency can replace a pending job and does not guarantee queue order.
A cancelled pending publisher may have no SHA image. Rerun that successful main
workflow to create its SHA image; only the current main revision can advance
`latest`. Do not rerun workflows from before this guard was introduced: their
old publishing definition has neither the lock nor the freshness check. Before
the first merge of this change, confirm no legacy publishers remain active.

Run `npm run test:ci` for the mocked registry and overlapping-run scenarios.
These tests do not push tags. The first normal main publish must still verify
GHCR authentication, SHA/digest preservation, and promotion in the real registry.
See [the investigation and verification record](CI-RELIABILITY.md).

## First-time LXC setup

1. On the Proxmox host, create an unprivileged Debian LXC container:
   - 2 vCPU, 1 GB RAM, 8 GB disk (generous for a static site).
   - Enable nesting so Docker can run inside the container: set
     `features: nesting=1,keyctl=1` (Datacenter → container → Options →
     Features, or `pct set <vmid> -features nesting=1,keyctl=1`).
   - Give it a static IP or a DHCP reservation, and note the LAN hostname
     you'll use to reach it (for example `tinyturbotrails.lan`).
2. Inside the container, install Docker and the compose plugin (Docker's
   convenience script works well for a fresh Debian container):
   ```sh
   curl -fsSL https://get.docker.com | sh
   ```
   This installs both the `docker` CLI and the `docker compose` plugin.
3. If `ghcr.io/auleewilliams/tiny-turbo-trails` is a private package, log in
   to GHCR with a personal access token that has `read:packages`:
   ```sh
   echo "$GHCR_TOKEN" | docker login ghcr.io -u <your-github-username> --password-stdin
   ```
   Making the package public removes the need for this step.
4. Copy `docker-compose.yml` and `.env.example` from this repository onto the
   container (scp, or a shallow git checkout — the container does not need
   the full source, only these two files), and copy `.env.example` to `.env`,
   adjusting `HOST_PORT` if 8080 is already in use on this host.
5. Pull and start the service:
   ```sh
   docker compose pull
   docker compose up -d
   ```
6. From another machine on the LAN, open `http://<lan-hostname-or-ip>:8080/`
   (or whatever `HOST_PORT` was set to) and confirm the title screen, the
   level picker and audio all work.

## Deploying an update

Once a change lands on `main` and CI publishes a new image:

```sh
docker compose pull
docker compose up -d
```

`index.html` and unversioned files under `/assets/` (including manifests and
atlases) use `Cache-Control: no-cache`, allowing storage but requiring
revalidation. Only Vite's fingerprinted output under `/build-assets/` uses
year-long immutable caching. Keep stable public filenames out of that directory.
A normal browser reload picks up subsequent deployments. Browsers that already
cached assets with the old year-long policy need a one-time hard refresh or
cache clear; new response headers cannot invalidate an already-fresh cached copy.
The service has
`restart: unless-stopped`, so it also comes back on its own after the LXC
container or the Proxmox host reboots.

## Deployment regression checks

With Docker and Playwright Chromium installed, run:

```sh
docker build -t tiny-turbo-trails:ci .
npm run test:deployment
```

The test warms a browser cache from the production image, builds a second image
with changed metadata and atlas pixels at the same URLs, replaces the container
on the same port, and verifies that an ordinary reload receives both changes.
It also checks HTML, manifest, atlas and fingerprinted JS/CSS response headers,
MIME types, `/healthz`, and real 404s. CI runs this before publishing. Set
`DEPLOYMENT_IMAGE` to test a different locally available base image.

## Rolling back

Each published image retains its full commit-SHA tag. `latest` advances only
when that checked commit is still the current `main` head at promotion time.
To roll back, pin the previous known-good SHA instead of `latest` in
`docker-compose.yml`:

```yaml
services:
  tiny-turbo-trails:
    image: ghcr.io/auleewilliams/tiny-turbo-trails:<previous-sha>
```

then `docker compose pull && docker compose up -d`. Switch the tag back to
`latest` once a fixed build is out.

## Checking logs

```sh
docker compose logs -f tiny-turbo-trails
```

`docker compose ps` shows container status and the healthcheck result
(`/healthz`, an nginx-only route that returns `200 ok` and does not touch the
app). An unhealthy container usually means the image failed to start nginx;
check the logs above for the reason.

## Ports

| What | Where |
| --- | --- |
| Container internal | `80` (nginx) |
| Host, by default | `8080`, overridable via `HOST_PORT` in `.env` |
| Health check | `/healthz` on the same port, returns `200` |

No other ports are used. There is no database, backend or persistent volume;
the container is stateless and disposable.
