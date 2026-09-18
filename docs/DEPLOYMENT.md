# Deployment

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

`index.html` is served with `Cache-Control: no-cache`, so a normal browser
reload (no hard refresh) picks up the new build immediately. The service has
`restart: unless-stopped`, so it also comes back on its own after the LXC
container or the Proxmox host reboots.

## Rolling back

Every image is tagged with both `latest` and the commit SHA it was built
from. To roll back, pin the previous known-good SHA instead of `latest` in
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
