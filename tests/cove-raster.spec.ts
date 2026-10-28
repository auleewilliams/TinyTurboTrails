import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { transformSync } from 'rolldown/utils';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { platformBodiesAt } from '../src/game/platforms';
import type { CoveTerrainAssets } from '../src/world/cove-terrain';

const code = transformSync('cove-terrain.ts', readFileSync(new URL('../src/world/cove-terrain.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code;
const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/terrain-kit/manifest.json', import.meta.url), 'utf8'));
const atlas = readFileSync(new URL('../public/assets/cove/terrain-kit/atlas.png', import.meta.url)).toString('base64');
const ground = readFileSync(new URL('../public/assets/cove/terrain-kit/ground.png', import.meta.url)).toString('base64');

test('Cove production raster has no internal coverage gaps at fractional cameras', async ({ page, browser }, info) => {
  // Isolated real browser rasterization, not a played route or generated replacement art.
  await page.setContent('<canvas width="426" height="240"></canvas>');
  await page.addScriptTag({ content: `${code}\nwindow.coveRaster = { drawCoveGround, drawCovePlatform, coveGroundY };` });
  const result = await page.evaluate(async ({ manifest, atlas, ground, level, bodies }) => {
    type RasterLevel = typeof level;
    type RasterBody = typeof bodies[number];
    const helpers = (window as unknown as { coveRaster: {
      drawCoveGround: (ctx: CanvasRenderingContext2D, kit: CoveTerrainAssets, level: RasterLevel, offset: { x: number; y: number }, left: number, right: number) => void;
      drawCovePlatform: (ctx: CanvasRenderingContext2D, kit: CoveTerrainAssets, level: RasterLevel, body: RasterBody, offset: { x: number; y: number }) => void;
      coveGroundY: (level: RasterLevel, x: number) => number;
    } }).coveRaster;
    const decode = async (png: string) => { const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode(); return image; };
    const actual = { image: await decode(atlas), ground: await decode(ground), manifest };
    const diagnostic = (width: number, height: number) => {
      const c = document.createElement('canvas'); c.width = width; c.height = height;
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, width, height); return c;
    };
    // Explicit synthetic regression fixture. Blue underlying fill exposes old sheared-column bleed.
    const diagnosticAtlas = diagnostic(manifest.width, manifest.height), dctx = diagnosticAtlas.getContext('2d')!;
    const fill = manifest.pieces['sand-fill']; dctx.fillStyle = '#0000ff'; dctx.fillRect(fill.x, fill.y, fill.width, fill.height);
    const synthetic = { image: diagnosticAtlas, ground: diagnostic(4200, 480), manifest } as unknown as CoveTerrainAssets;
    const ctx = document.querySelector('canvas')!.getContext('2d', { willReadFrequently: true })!;
    const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = manifest.width; sourceCanvas.height = manifest.height;
    const sourceCtx = sourceCanvas.getContext('2d')!; sourceCtx.drawImage(actual.image, 0, 0);
    const sourcePixels = sourceCtx.getImageData(0, 0, manifest.width, manifest.height).data;
    let groundSamples = 0, stoneSamples = 0, actualStoneSamples = 0, intentionalAlphaExcluded = 0, frames = 0;
    const errors: object[] = [];
    for (const fraction of [0, .25, .5, .75, 1]) for (const origin of [100, 820, 940, 1600, 2920, 3740]) {
      const offset = { x: origin + fraction, y: 200 + fraction };
      for (const [kind, kit] of [['synthetic opaque diagnostic fixture', synthetic], ['actual generated art', actual]] as const) {
        ctx.clearRect(0, 0, 426, 240); ctx.save(); ctx.beginPath();
        ctx.moveTo(-offset.x, level.surfaces[0].y1 - offset.y);
        for (const s of level.surfaces) ctx.lineTo(s.x2 - offset.x, s.y2 - offset.y);
        ctx.lineTo(4200 - offset.x, 240); ctx.lineTo(-offset.x, 240); ctx.closePath(); ctx.clip();
        helpers.drawCoveGround(ctx, kit, level, offset, 0, 4200); ctx.restore();
        const pixels = ctx.getImageData(0, 0, 426, 240).data;
        for (let x = 2; x < 424; x++) {
          const worldX = x + .5 + offset.x; if (worldX >= 4200) continue;
          const top = helpers.coveGroundY(level, worldX) - offset.y;
          // Exclude the exact-contour antialias fringe; sample only the interior lip.
          for (let y = Math.max(2, Math.ceil(top + 3)); y < Math.min(238, top + 6); y++) {
            const at = (y * 426 + x) * 4; groundSamples++;
            if (pixels[at + 3] !== 255 || (kind.startsWith('synthetic') && (pixels[at] !== 255 || pixels[at + 2] !== 0))) {
              if (errors.length < 10) errors.push({ kind, origin, fraction, x, y, rgba: [...pixels.slice(at, at + 4)] });
            }
          }
        }
        frames++;
      }
    }
    for (const fraction of [0, .25, .5, .75]) for (const sourceBody of bodies) {
      const body = { ...sourceBody, x: 20, y: 30 };
      ctx.clearRect(0, 0, 426, 240);
      helpers.drawCovePlatform(ctx, synthetic, level, body, { x: fraction, y: fraction });
      const pixels = ctx.getImageData(0, 0, 426, 240).data;
      for (let x = 22; x < 18 + body.width; x++) {
        const at = (31 * 426 + x) * 4; stoneSamples++;
        if (pixels[at + 3] !== 255 && errors.length < 10) errors.push({ kind: 'synthetic opaque stone interior', fraction, id: body.id, x, alpha: pixels[at + 3] });
      }
    }
    for (const fraction of [0, .25, .5, .75]) for (const sourceBody of bodies) {
      const body = { ...sourceBody, x: 20, y: 30 };
      const thin = body.id === 'cove-pool-stone-1' || body.id === 'cove-pool-stone-2';
      const key = body.id === 'cove-hollow-shelf' ? 'hollow-140' : body.id === 'cove-bay-ledge-2' ? 'regular-alt-160' : `${thin ? 'thin' : 'regular'}-${body.width}`;
      const part = manifest.platforms[key];
      ctx.clearRect(0, 0, 426, 240); helpers.drawCovePlatform(ctx, actual, level, body, { x: fraction, y: fraction });
      const pixels = ctx.getImageData(0, 0, 426, 240).data;
      for (let x = 22; x < 18 + body.width; x++) for (let y = 31; y < 29 + part.height; y++) {
        const sx = Math.floor(x + .5 - body.x + fraction), sy = Math.floor(y + .5 - body.y + fraction);
        // Only a wholly opaque source neighbourhood is an internal coverage witness.
        // Intentional source underside holes, taper and outer edge AA are excluded explicitly.
        let opaque = true;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          if (sx + ox < 0 || sx + ox >= part.width || sy + oy < 0 || sy + oy >= part.height
            || sourcePixels[((part.y + sy + oy) * manifest.width + part.x + sx + ox) * 4 + 3] !== 255) opaque = false;
        }
        if (!opaque) { intentionalAlphaExcluded++; continue; }
        actualStoneSamples++;
        const alpha = pixels[(y * 426 + x) * 4 + 3];
        if (alpha !== 255 && errors.length < 10) errors.push({ kind: 'actual-source opaque stone interior', fraction, id: body.id, x, y, alpha });
      }
    }
    return { errors, groundSamples, stoneSamples, actualStoneSamples, intentionalAlphaExcluded, frames, png: ctx.canvas.toDataURL(), scope: 'isolated production-helper real-browser raster; synthetic fixture explicitly separated from generated art and gameplay' };
  }, { manifest, atlas, ground, level: SANDY_COVE, bodies: platformBodiesAt(SANDY_COVE.platforms, 0) });
  await info.attach('isolated-raster-observations', { body: JSON.stringify({ ...result, png: undefined, browser: browser.version() }), contentType: 'application/json' });
  await info.attach('synthetic-regression-fixture-last-frame-not-gameplay', { body: Buffer.from(result.png.split(',')[1], 'base64'), contentType: 'image/png' });
  expect(result.groundSamples).toBeGreaterThan(1000); expect(result.stoneSamples).toBeGreaterThan(1000);
  expect(result.actualStoneSamples).toBeGreaterThan(1000); expect(result.intentionalAlphaExcluded).toBeGreaterThan(0);
  expect(result.errors).toEqual([]);
});
