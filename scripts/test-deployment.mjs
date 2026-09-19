import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

// Run against the actual production image, never Vite's preview server.
const image = process.env.DEPLOYMENT_IMAGE ?? 'tiny-turbo-trails:ci';
const name = `ttt-cache-${process.pid}`;
const updatedImage = `${name}:updated`;
const fixture = await mkdtemp(join(tmpdir(), 'ttt-cache-'));
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();
let browser;
let running = false;
let baseURL;

async function start(imageName, port = '0') {
  docker('run', '-d', '--name', name, '-p', `127.0.0.1:${port}:80`, imageName);
  running = true;
  const address = docker('port', name, '80/tcp');
  baseURL = `http://${address}`;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(`${baseURL}/healthz`)).ok) return address.split(':').at(-1);
    } catch { /* nginx may still be starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Container did not become healthy');
}

async function checkHeaders() {
  const html = await fetch(`${baseURL}/`);
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-type'), /^text\/html/);
  assert.equal(html.headers.get('cache-control'), 'no-cache');
  const body = await html.text();
  assert.match(body, /Tiny Turbo Trails/);
  const bundles = [...body.matchAll(/(?:src|href)="\.\/(build-assets\/[^" ]+\.(?:js|css))"/g)]
    .map((match) => match[1]);
  assert.ok(bundles.some((path) => path.endsWith('.js')), 'Built JS is fingerprinted');
  assert.ok(bundles.some((path) => path.endsWith('.css')), 'Built CSS is fingerprinted');
  for (const [path, mime, cache] of [
    ['index.html', /^text\/html/, 'no-cache'],
    ['assets/plains/manifest.json', /^application\/json/, 'no-cache'],
    ['assets/plains/environment.png', /^image\/png/, 'no-cache'],
    ...bundles.map((path) => [path, path.endsWith('.js') ? /^(?:application|text)\/javascript/ : /^text\/css/,
      'public, max-age=31536000, immutable']),
  ]) {
    const response = await fetch(`${baseURL}/${path}`);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), mime, path);
    assert.equal(response.headers.get('cache-control'), cache, path);
    console.log(`${path}: ${response.headers.get('content-type')}; ${cache}`);
  }
  assert.equal(await (await fetch(`${baseURL}/healthz`)).text(), 'ok\n');
  for (const path of ['missing', 'assets/missing.png', 'build-assets/missing.js']) {
    const response = await fetch(`${baseURL}/${path}`);
    assert.equal(response.status, 404, path);
    assert.ok(!response.headers.get('cache-control')?.includes('immutable'), path);
  }
}

// Use the same browser context and URLs across the deployment. No interception,
// cache clearing, query version, or fetch cache override may hide stale responses.
async function readAssets(page) {
  return page.evaluate(async () => {
    const manifest = await (await fetch('/assets/plains/manifest.json')).json();
    const atlas = new Image();
    atlas.src = `/assets/plains/${manifest.image}`;
    await atlas.decode();
    const canvas = document.createElement('canvas');
    canvas.width = atlas.naturalWidth;
    canvas.height = atlas.naturalHeight;
    canvas.getContext('2d').drawImage(atlas, 0, 0);
    return { manifest, pixels: canvas.toDataURL() };
  });
}

try {
  const port = await start(image);
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(baseURL);
  const before = await readAssets(page);
  assert.deepEqual(await readAssets(page), before, 'Warm build A cache');

  // Derive build B from A, replacing both real public URLs with changed content.
  // A different file size also avoids nginx's second-resolution ETag collisions.
  const manifestB = { ...before.manifest, deploymentRegression: 'build B' };
  await writeFile(join(fixture, 'manifest.json'), JSON.stringify(manifestB));
  const pixelsB = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ff00ff';
    context.fillRect(0, 0, 1, 1);
    return canvas.toDataURL();
  });
  await writeFile(join(fixture, 'environment.png'), Buffer.from(pixelsB.split(',')[1], 'base64'));
  await writeFile(join(fixture, 'Dockerfile'),
    `FROM ${image}\nCOPY manifest.json environment.png /usr/share/nginx/html/assets/plains/\n`);
  docker('build', '-t', updatedImage, fixture);
  docker('rm', '-f', name);
  running = false;
  await start(updatedImage, port);

  await page.reload(); // Ordinary reload with the original browser cache intact.
  const after = await readAssets(page);
  assert.deepEqual(after.manifest, manifestB, 'Normal reload receives build B metadata');
  assert.equal(after.pixels, pixelsB, 'Normal reload receives build B atlas pixels');
  assert.notEqual(after.pixels, before.pixels);
  console.log('PASS: warm build A cache → deploy build B → normal reload receives B metadata and pixels');
  await checkHeaders();
} finally {
  await browser?.close();
  if (running) docker('rm', '-f', name);
  try { docker('image', 'rm', updatedImage); } catch { /* build may not have completed */ }
  await rm(fixture, { recursive: true, force: true });
}
