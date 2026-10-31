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
const bay1 = readFileSync(new URL('../public/assets/cove/bay1-b-v1/platform.png', import.meta.url)).toString('base64');
const hollowB = readFileSync(new URL('../public/assets/cove/whole-three-v1/hollow.png', import.meta.url)).toString('base64');
const pool3B = readFileSync(new URL('../public/assets/cove/remaining-two-v1/pool3.png', import.meta.url)).toString('base64');
const bay2 = readFileSync(new URL('../public/assets/cove/bay2-whole-v1/platform.png', import.meta.url)).toString('base64');
const bay3 = readFileSync(new URL('../public/assets/cove/bay3-b-v1/platform.png', import.meta.url)).toString('base64');
const pool2B = readFileSync(new URL('../public/assets/cove/whole-three-v1/pool2.png', import.meta.url)).toString('base64');
const pool1B = readFileSync(new URL('../public/assets/cove/whole-three-v1/pool1.png', import.meta.url)).toString('base64');
const ground = readFileSync(new URL('../public/assets/cove/terrain-kit/ground.png', import.meta.url)).toString('base64');

test('Cove production raster has no internal coverage gaps at fractional cameras', async ({ page, browser }, info) => {
  // Isolated real browser rasterization, not a played route or generated replacement art.
  await page.setContent('<canvas width="426" height="240"></canvas>');
  await page.addScriptTag({ content: `${code}\nwindow.coveRaster = { drawCoveGround, drawCovePlatform, coveGroundY };` });
  const result = await page.evaluate(async ({ manifest, atlas, ground, bay1, bay2, hollowB, pool3B, bay3, pool2B, pool1B, level, bodies }) => {
    type RasterLevel = typeof level;
    type RasterBody = typeof bodies[number];
    const helpers = (window as unknown as { coveRaster: {
      drawCoveGround: (ctx: CanvasRenderingContext2D, kit: CoveTerrainAssets, level: RasterLevel, offset: { x: number; y: number }, left: number, right: number) => void;
      drawCovePlatform: (ctx: CanvasRenderingContext2D, kit: CoveTerrainAssets, level: RasterLevel, body: RasterBody, offset: { x: number; y: number }) => void;
      coveGroundY: (level: RasterLevel, x: number) => number;
    } }).coveRaster;
    const decode = async (png: string) => { const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode(); return image; };
    const actual = { image: await decode(atlas), ground: await decode(ground), bay1: await decode(bay1), bay2: await decode(bay2), hollowB: await decode(hollowB), pool3B: await decode(pool3B), bay3: await decode(bay3), pool2B: await decode(pool2B), pool1B: await decode(pool1B), manifest };
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
    const bayCanvas = document.createElement('canvas'); bayCanvas.width = 140; bayCanvas.height = 30;
    const bayCtx = bayCanvas.getContext('2d')!; bayCtx.drawImage(actual.bay1, 0, 0);
    const bayPixels = bayCtx.getImageData(0, 0, 140, 30).data;
    const bay2Canvas = document.createElement('canvas'); bay2Canvas.width = 160; bay2Canvas.height = 35;
    const bay2Ctx = bay2Canvas.getContext('2d')!; bay2Ctx.drawImage(actual.bay2, 0, 0);
    const bay2Pixels = bay2Ctx.getImageData(0, 0, 160, 35).data;
    let bay2Samples = 0;
    const newSamples: Record<string,number> = {};
    const newPixels: Record<string,Uint8ClampedArray> = {};
    for (const [id,image] of [['cove-hollow-shelf',actual.hollowB],['cove-pool-stone-3',actual.pool3B],['cove-bay-ledge-3',actual.bay3],['cove-pool-stone-2',actual.pool2B],['cove-pool-stone-1',actual.pool1B]] as const) { const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const cc=c.getContext('2d')!;cc.drawImage(image,0,0);newPixels[id]=cc.getImageData(0,0,c.width,c.height).data;newSamples[id]=0; }
    let baySamples = 0;
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
      const thin = body.id === 'cove-pool-stone-1' || body.id === 'cove-pool-stone-2' || body.id === 'cove-pool-stone-1';
      const key = body.id === 'cove-hollow-shelf' ? 'hollow-140' : body.id === 'cove-bay-ledge-2' ? 'regular-alt-160' : `${thin ? 'thin' : 'regular'}-${body.width}`;
      const isBay1 = body.id === 'cove-bay-ledge-1';
      const isBay2 = body.id === 'cove-bay-ledge-2';
      const isNew = body.id === 'cove-hollow-shelf' || body.id === 'cove-pool-stone-3' || body.id === 'cove-bay-ledge-3' || body.id === 'cove-pool-stone-2' || body.id === 'cove-pool-stone-1';
      const part = isNew ? {x:0,y:0,width:body.width,height:body.id === 'cove-pool-stone-1'?22:body.id === 'cove-pool-stone-2'||body.id === 'cove-pool-stone-3'?18:30} : isBay2 ? {x:0,y:0,width:160,height:35} : isBay1 ? { x: 0, y: 0, width: 140, height: 30 } : manifest.platforms[key];
      const samples = isNew ? newPixels[body.id] : isBay2 ? bay2Pixels : isBay1 ? bayPixels : sourcePixels, sourceWidth = isNew ? body.width : isBay2 ? 160 : isBay1 ? 140 : manifest.width;
      ctx.clearRect(0, 0, 426, 240); helpers.drawCovePlatform(ctx, actual, level, body, { x: fraction, y: fraction });
      const pixels = ctx.getImageData(0, 0, 426, 240).data;
      for (let x = 22; x < 18 + body.width; x++) for (let y = 31; y < 29 + part.height; y++) {
        const sx = Math.floor(x + .5 - body.x + fraction), sy = Math.floor(y + .5 - body.y + fraction);
        // Only a wholly opaque source neighbourhood is an internal coverage witness.
        // Intentional source underside holes, taper and outer edge AA are excluded explicitly.
        let opaque = true;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          if (sx + ox < 0 || sx + ox >= part.width || sy + oy < 0 || sy + oy >= part.height
            || samples[((part.y + sy + oy) * sourceWidth + part.x + sx + ox) * 4 + 3] !== 255) opaque = false;
        }
        if (!opaque) { intentionalAlphaExcluded++; continue; }
        actualStoneSamples++; if(isNew)newSamples[body.id]++; if (isBay1) baySamples++; if (isBay2) bay2Samples++;
        const alpha = pixels[(y * 426 + x) * 4 + 3];
        if (alpha !== 255 && errors.length < 10) errors.push({ kind: 'actual-source opaque stone interior', fraction, id: body.id, x, y, alpha });
      }
    }
    return { newSamples, bay2Samples, baySamples, errors, groundSamples, stoneSamples, actualStoneSamples, intentionalAlphaExcluded, frames, png: ctx.canvas.toDataURL(), scope: 'isolated production-helper real-browser raster; synthetic fixture explicitly separated from generated art and gameplay' };
  }, { manifest, atlas, ground, bay1, bay2, hollowB, pool3B, bay3, pool2B, pool1B, level: SANDY_COVE, bodies: platformBodiesAt(SANDY_COVE.platforms, 0) });
  await info.attach('isolated-raster-observations', { body: JSON.stringify({ ...result, png: undefined, browser: browser.version() }), contentType: 'application/json' });
  await info.attach('actual-source-raster-last-frame-not-gameplay', { body: Buffer.from(result.png.split(',')[1], 'base64'), contentType: 'image/png' });
  expect(result.groundSamples).toBeGreaterThan(1000); expect(result.stoneSamples).toBeGreaterThan(1000);
  expect(result.actualStoneSamples).toBeGreaterThan(1000); expect(result.intentionalAlphaExcluded).toBeGreaterThan(0);
  expect(result.baySamples).toBeGreaterThan(500);
  expect(result.newSamples['cove-pool-stone-1']).toBeGreaterThan(0);
  expect(result.newSamples['cove-pool-stone-2']).toBeGreaterThan(0);
  expect(result.newSamples['cove-bay-ledge-3']).toBeGreaterThan(0);
  expect(result.newSamples['cove-hollow-shelf']).toBeGreaterThan(0);
  expect(result.newSamples['cove-pool-stone-3']).toBeGreaterThan(0);
  expect(result.bay2Samples).toBeGreaterThan(500);
  expect(result.errors).toEqual([]);
});
