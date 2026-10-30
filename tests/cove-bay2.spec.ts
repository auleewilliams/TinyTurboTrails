import { bay2GemOrigin } from './cove-bay2-observation';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { pilotSourceRevision } from './cove-bay1-provenance';
import { bay1KeyboardPilotInit } from './cove-bay1-input';
import { driveCove, observeCove } from './cove-browser-pilot';

for (const width of [426, 320]) test(`B bay2 whole real input pilot at ${width}px`, async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const sourceRevision = pilotSourceRevision(process.env.BROWSER_REPORT_SOURCE_SHA, info.config.metadata);
  const checkpoint = Object.fromEntries(['src/world/cove-terrain.ts', 'src/world/sandy-cove.ts', 'tests/cove-bay2.spec.ts', 'tests/cove-bay1-provenance.ts', 'tests/cove-bay1-input.ts', 'public/assets/cove/bay2-whole-v1/platform.png'].map(path => [path, createHash('sha256').update(readFileSync(new URL('../' + path, import.meta.url))).digest('hex')]));
  await info.attach('pilot-source-identity', { body: JSON.stringify({ sourceRevision, checkpoint, requestedCssWidth: width, native: [426, 240] }), contentType: 'application/json' });
  await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
  const evidence = observeCove(page, info);
  await page.addInitScript(gemObserverSource => {
    const gemOrigin = new Function(`return (${gemObserverSource});`)() as (rock: readonly number[]) => readonly number[];
    const probe = { gemCount: null as number|null, oldLocationGemSeen:false, draws: [] as object[], gem: null as null | {alphaPixels:number;visiblePixels:number;overlapPixels:number;source:string}, flight: [] as { status: string; png: string }[], henry: null as null | { status: string; source: string; sourceFrame: number[]; alphaPixels: number; visiblePixels: number; overlapPixels: number; top: number; bottom: number } };
    Object.assign(window, { bay2Probe: probe });
    const text=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(value,x,y,maxWidth){if(this.canvas.id==='game'&&x===28&&y===20&&/^\d+$/.test(value))probe.gemCount=Number(value);if(maxWidth===undefined)text.call(this,value,x,y);else text.call(this,value,x,y,maxWidth);};
    let priorY = 0, ascent = false, descent = false;
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    const pixels = new WeakMap<HTMLImageElement, Uint8ClampedArray>();
    let rock = new Set<string>(); let rockOrigin: number[] = [];
    const points = (ctx: CanvasRenderingContext2D, args: Parameters<typeof draw>) => {
      const [image, sx, sy, sw, sh, dx, dy, dw, dh] = args as unknown as [HTMLImageElement, number, number, number, number, number, number, number, number];
      let data = pixels.get(image);
      if (!data) {
        const c = document.createElement('canvas'); c.width = image.naturalWidth; c.height = image.naturalHeight;
        const ink = c.getContext('2d')!; draw.call(ink, image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, image.naturalWidth, image.naturalHeight);
        data = ink.getImageData(0, 0, c.width, c.height).data; pixels.set(image, data);
      }
      const matrix = ctx.getTransform(), out: [number, number][] = [];
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (data[((sy + y) * image.naturalWidth + sx + x) * 4 + 3]) {
        const px = dx + (x + .5) * dw / sw, py = dy + (y + .5) * dh / sh;
        out.push([Math.floor(matrix.a * px + matrix.c * py + matrix.e), Math.floor(matrix.b * px + matrix.d * py + matrix.f)]);
      }
      return out;
    };
    CanvasRenderingContext2D.prototype.drawImage = function(this: CanvasRenderingContext2D, ...args: Parameters<typeof draw>) {
      Reflect.apply(draw, this, args);
      if (this.canvas.id === 'game' && args[0] instanceof HTMLImageElement && args[0].src.endsWith('/assets/cove/bay2-whole-v1/platform.png')) {
        probe.gem = null; probe.henry = null; // Fresh witnesses for this actual rendered frame.
        rockOrigin = args.slice(5,7) as number[];
        rock = new Set(points(this, args).map(([x, y]) => `${x},${y}`));
        const status = document.querySelector('#status')?.textContent ?? '';
        if (probe.draws.length < 5000) probe.draws.push({ status, source: args[0].src, args: args.slice(1) });
      }
      if(this.canvas.id==='game'&&args[0] instanceof HTMLImageElement&&args[0].src.endsWith('/assets/gems/gems.png')&&Number(args[5])===Math.round(rockOrigin[0]+100)-16&&Number(args[6])===Math.round(rockOrigin[1]+39)-24)probe.oldLocationGemSeen=true;
      if (this.canvas.id === 'game' && args[0] instanceof HTMLImageElement && args[0].src.endsWith('/assets/gems/gems.png')
        && Number(args[5])===gemOrigin(rockOrigin)[0] && Number(args[6])===gemOrigin(rockOrigin)[1]) {
        const alpha=points(this,args);probe.gem={source:args[0].src,alphaPixels:alpha.length,visiblePixels:alpha.filter(([x,y])=>x>=0&&x<426&&y>=0&&y<240).length,overlapPixels:alpha.filter(([x,y])=>rock.has(`${x},${y}`)).length};
      }
      if (this.canvas.id === 'game' && args[0] instanceof HTMLImageElement && args[0].src.endsWith('/assets/henry/henry-celebration.png')) {
        const status = document.querySelector('#status')?.textContent ?? '', x = Number(status.match(/X (-?\d+)/)?.[1]);
        if (x > 3130 && x < 3310) {
          const alpha = points(this, args), ys = alpha.map(([, y]) => y);
          probe.henry = { status, source: args[0].src, sourceFrame: args.slice(1, 5) as number[], alphaPixels: alpha.length,
            visiblePixels: alpha.filter(([x, y]) => x >= 0 && x < 426 && y >= 0 && y < 240).length,
            overlapPixels: alpha.filter(([x, y]) => rock.has(`${x},${y}`)).length, top: Math.min(...ys), bottom: Math.max(...ys) };
        }
      }
    } as typeof draw;
    const sample = () => {
      const status = document.querySelector('#status')?.textContent ?? '';
      const m = status.match(/X (-?\d+) Y (-?\d+)/);
      if (m && Number(m[1]) > 3130 && Number(m[1]) < 3310) {
        const y = Number(m[2]);
        if (y < priorY && y < 290 && !ascent) { ascent = true; probe.flight.push({ status, png: document.querySelector<HTMLCanvasElement>('#game')!.toDataURL() }); }
        if (ascent && y > priorY && y < 230 && !descent) { descent = true; probe.flight.push({ status, png: document.querySelector<HTMLCanvasElement>('#game')!.toDataURL() }); }
        priorY = y;
      }
      requestAnimationFrame(sample);
    }; requestAnimationFrame(sample);
  }, bay2GemOrigin.toString());
  const assetResponse = page.waitForResponse(response => response.url().endsWith('/assets/cove/bay2-whole-v1/platform.png'));
  await page.addInitScript(bay1KeyboardPilotInit, []);
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: 'SANDY COVE', exact: true }).click();
  await page.getByRole('button', { name: 'Play SANDY COVE', exact: true }).click();
  await expect(page.locator('#status')).toContainText('X 60 Y 326 V 0');
  const served = await assetResponse, servedBytes = await served.body();
  expect(served.status()).toBe(200);
  expect(createHash('sha256').update(servedBytes).digest('hex')).toBe('595d98c49269f0231dddcd95e5323a508eae5c28d9185257d15ec3daf19e6b5f');
  await info.attach('required-bay2-resource', { body: JSON.stringify({ url: served.url(), status: served.status(), sha256: createHash('sha256').update(servedBytes).digest('hex') }), contentType: 'application/json' });
  const capture = async (name: string, y: number) => {
    await expect(page.locator('#status')).toContainText(`Y ${y} V 0`);
    const geometry = await page.locator('#game').evaluate((canvas: HTMLCanvasElement) => {
      const r = canvas.getBoundingClientRect();
      return { native: [canvas.width, canvas.height], css: { width: r.width, height: r.height }, png: canvas.toDataURL(), dpr: devicePixelRatio };
    });
    expect(geometry.native).toEqual([426, 240]); expect(geometry.css.width).toBe(width);
    await info.attach(`${name}-native`, { body: Buffer.from(geometry.png.split(',')[1], 'base64'), contentType: 'image/png' });
    await info.attach(`${name}-geometry`, { body: JSON.stringify(geometry, (key, value) => key === 'png' ? undefined : value), contentType: 'application/json' });
    const css = await page.locator('#game').screenshot();
    await info.attach(`${name}-actual-css-size`, { body: JSON.stringify({ width: css.readUInt32BE(16), height: css.readUInt32BE(20) }), contentType: 'application/json' });
    if (name.startsWith('underpass')) {
      const henry = await page.evaluate(() => (window as unknown as { bay2Probe: { henry: { alphaPixels: number; visiblePixels: number; overlapPixels: number; top: number; bottom: number } } }).bay2Probe.henry);
      expect(henry).not.toBeNull(); expect(henry.alphaPixels).toBeGreaterThan(100);
      expect(henry.visiblePixels).toBe(henry.alphaPixels); expect(henry.overlapPixels).toBe(0);
      const gem=await page.evaluate(()=>(window as unknown as {bay2Probe:{gem:{alphaPixels:number;visiblePixels:number;overlapPixels:number}|null}}).bay2Probe.gem);
      expect(gem).not.toBeNull();expect(gem!.alphaPixels).toBeGreaterThan(100);expect(gem!.visiblePixels).toBe(gem!.alphaPixels);expect(gem!.overlapPixels).toBe(0);
      await info.attach(`${name}-actual-relocated-gem-clearance`,{body:JSON.stringify(gem),contentType:'application/json'});
      await info.attach(`${name}-actual-source-alpha-hat-body-clearance`, { body: JSON.stringify(henry), contentType: 'application/json' });
    }
    await evidence.paint(`${name}-css`);
  };
  await driveCove(page, [{ kind: 'walk', x: 3140 }, { kind: 'walk', x: 3240 }]);
  await capture('underpass-forward-whole-rock', 310);
  await driveCove(page, [{ kind: 'walk', x: 3320 }, { kind: 'walk', x: 3240 }]);
  await capture('underpass-reverse-whole-rock', 310);
  await driveCove(page, [{ kind: 'walk', x: 2940 }, { kind: 'jump', x: 3020, y: 272 }, { kind: 'walk', x: 3080 }, { kind: 'jump', x: 3170, y: 260 }, { kind: 'walk', x: 3200 }]);
  await capture('on-bay2-landed-rest', 226);
  const beforeGem=await page.evaluate(()=>(window as unknown as {bay2Probe:{gemCount:number;gem:unknown}}).bay2Probe);
  expect(beforeGem.gem).not.toBeNull();
  await driveCove(page,[{kind:'walk',x:3240}]);
  await capture('relocated-optional-gem-collected',226);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {bay2Probe:{gemCount:number}}).bay2Probe.gemCount)).toBe(beforeGem.gemCount+1);
  const afterGem=await page.evaluate(()=>(window as unknown as {bay2Probe:{gem:unknown;oldLocationGemSeen:boolean}}).bay2Probe);
  expect(afterGem.gem).toBeNull();expect(afterGem.oldLocationGemSeen).toBe(false);
  await info.attach('bonus4-source-bound-native-collection',{body:JSON.stringify({id:'cove-bonus-4',position:[3240,242],beforeCounter:beforeGem.gemCount,afterCounter:beforeGem.gemCount+1,afterGem}),contentType:'application/json'});
  await driveCove(page, [{ kind: 'walk', x: 3280 }, { kind: 'walk', x: 3320 }]);
  await capture('lower-landing-neighbor-gap', 310);
  const probe = await page.evaluate(() => (window as unknown as { bay2Probe: { draws: object[]; flight: { status: string; png: string }[] } }).bay2Probe);
  expect(probe.draws.length).toBeGreaterThan(20); expect(probe.flight.length).toBe(2);
  for (const [i, pose] of probe.flight.entries()) await info.attach(`jump-${i}-native`, { body: Buffer.from(pose.png.split(',')[1], 'base64'), contentType: 'image/png' });
  await info.attach('bay2-real-draw-and-flight-witness', { body: JSON.stringify({ ...probe, flight: probe.flight.map(({ status }) => ({ status })), id: 'cove-bay-ledge-2', worldTop: 260, worldWidth: 160 }), contentType: 'application/json' });
  await evidence.finish(browser.version());
});

test('B bay2 whole required image failure recovers through accessible ordinary Retry', async ({ page }) => {
  const path = '**/assets/cove/bay2-whole-v1/platform.png';
  await page.route(path, route => route.abort());
  await page.goto('/?debug=1');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  await page.unroute(path); await page.getByRole('button', { name: /retry/i }).click();
  await page.getByRole('button', { name: 'SANDY COVE', exact: true }).click();
  await page.getByRole('button', { name: 'Play SANDY COVE', exact: true }).click();
  await expect(page.locator('#status')).toContainText('X 60 Y 326 V 0');
});
