import { createHudResponseObserver } from './hud-response-observation';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { transformSync } from 'rolldown/utils';
import { LEVELS } from '../src/world/levels';
import { MAX_HEALTH, createRun } from '../src/game/interactions';
import { areaName } from '../src/game/hud';
import { INTERFACE_PIECES } from '../src/art/interface-kit';
async function observeKitTextClearance(page: Page): Promise<void> {
  await page.addInitScript(pieces => {
    type Rect = { piece: string; x: number; y: number; right: number; bottom: number; quiet: { left: number; top: number; right: number; bottom: number } };
    const rects: Rect[] = [];
    let pending: { piece: string; x: number; y: number; left: number; top: number } | undefined;
    const probe = { checked: [] as string[], violations: [] as unknown[] };
    Object.assign(window, { kitTextProbe: probe });
    // Ownership is per rendered frame: clear before every animation-frame callback.
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(time => { rects.length = 0; pending = undefined; callback(time); });
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (this.canvas.id === 'game' && x === 0 && y === 0 && width === 426 && height === 240) rects.length = 0;
      fillRect.call(this, x, y, width, height);
    };
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const [image] = args;
      const name = image instanceof HTMLImageElement ? image.src.match(/\/assets\/interface\/([a-z-]+)\.png$/)?.[1] : undefined;
      // Spelling tiles carry their own glyphs over any kit piece beneath them (e.g. letter flights over the bag).
      if (this.canvas.id === 'game' && image instanceof HTMLImageElement && image.src.endsWith('/assets/spelling/tile.png') && args.length === 5) {
        const [dx, dy, dw, dh] = args.slice(1).map(Number);
        rects.push({ piece: 'spelling-tile', x: dx, y: dy, right: dx + dw, bottom: dy + dh, quiet: { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity } });
      }
      if (this.canvas.id === 'game' && name && args.length === 9) {
        const [sx, sy, sw, sh, dx, dy, dw, dh] = args.slice(1).map(Number);
        const size = (pieces as Record<string, { width: number; height: number }>)[name];
        if (sx === 0 && sy === 0) pending = { piece: name, x: dx, y: dy, left: sw, top: sh };
        if (pending?.piece === name && sx + sw === size.width && sy + sh === size.height) {
          rects.push({ piece: name, x: pending.x, y: pending.y, right: dx + dw, bottom: dy + dh,
            quiet: { left: pending.x + pending.left, top: pending.y + pending.top, right: dx + dw - sw, bottom: dy + dh - sh } });
          pending = undefined;
        }
      }
      Reflect.apply(drawImage, this, args);
    } as typeof drawImage;
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.id === 'game' && text.trim()) {
        // The innermost (latest) kit piece under the text anchor owns its clearance.
        const owner = [...rects].reverse().find(rect => x >= rect.x && x <= rect.right && y >= rect.y && y <= rect.bottom);
        const transform = this.getTransform();
        const successText = /^(WORD COMPLETE!|Done: return to trail results|(?:HILL|ROCK|Tree|BEAM|SNOW|SAND) sticker earned!)$/.test(text);
        if (successText && transform.isIdentity) {
          const metrics = this.measureText(text);
          const box = { left: x - metrics.actualBoundingBoxLeft, right: x + metrics.actualBoundingBoxRight, top: y - metrics.actualBoundingBoxAscent, bottom: y + metrics.actualBoundingBoxDescent };
          const key = `${text}|canvas`;
          if (!probe.checked.includes(key)) probe.checked.push(key);
          if (box.left < 0 || box.right > 426 || box.top < 0 || box.bottom > 240 || (box.left < 241 && box.right > 185 && box.top < 158 && box.bottom > 102)) probe.violations.push({ key, box });
        }
        if (owner && owner.piece !== 'spelling-tile' && transform.isIdentity) {
          const metrics = this.measureText(text);
          const box = { left: x - metrics.actualBoundingBoxLeft, right: x + metrics.actualBoundingBoxRight,
            top: y - metrics.actualBoundingBoxAscent, bottom: y + metrics.actualBoundingBoxDescent };
          const key = `${text}|${owner.piece}`;
          if (!probe.checked.includes(key)) probe.checked.push(key);
          const { quiet } = owner;
          if (box.left < quiet.left || box.right > quiet.right || box.top < quiet.top || box.bottom > quiet.bottom) {
            if (!probe.violations.some(entry => (entry as { key: string }).key === key)) probe.violations.push({ key, font: this.font, box, quiet });
          }
        }
      }
      if (maxWidth === undefined) fillText.call(this, text, x, y); else fillText.call(this, text, x, y, maxWidth);
    };
  }, INTERFACE_PIECES);
}

const kitTextProbe = (page: Page) => page.evaluate(() => (window as unknown as { kitTextProbe: { checked: string[]; violations: unknown[] } }).kitTextProbe);
const twoFrames = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
for (const level of LEVELS) test(`owner HUD order real-font fixture: ${level.id} identity marks and real glyph clearance`, async ({ page }, info) => {
  // Explicit layout states, not scene mutation or a claim of input-driven gameplay.
  const names = ['world/camera.ts', 'game/platforms.ts', 'game/movement.ts', 'game/education.ts', 'art/interface-kit.ts', 'game/hud.ts', 'world/scenery.ts',
    'world/cove-terrain.ts', 'world/surface-materials.ts', 'world/assets.ts', 'world/trail-presentation.ts', 'world/ambient-weather.ts', 'world/renderer.ts'];
  const transport = createHudResponseObserver();
  page.on('response', transport.observe);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const modules = names.map(name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8'));
  const runtimeImports = [...new Set(modules.flatMap(source => [...source.matchAll(/^import (?!type )\{([^}]*)\} from .*;$/gm)]
    .flatMap(([, names]) => names.split(',').map(name => name.trim()).filter(name => name && !name.startsWith('type ')))))];
  const fixture = modules.map((source, index) => transformSync(names[index], source.replace(/^import .*;\n/gm, '')
    .replace(/\bexport /g, '').replaceAll('import.meta.env.BASE_URL', JSON.stringify('./')), {}).code).join('\n');
  expect(runtimeImports).toEqual(expect.arrayContaining(['MAX_HEALTH', 'drawKitFrame', 'loadImage', 'validateScenery', 'drawSceneryBackground', 'drawSurfaceMaterials']));
  await observeKitTextClearance(page);
  await page.goto('/'); await expect(page.getByRole('button',{name:'PLAINS',exact:true})).toBeVisible();
  await page.addScriptTag({ content: `(() => {
    const MAX_HEALTH = ${MAX_HEALTH};
    ${fixture}
    window.hudFixtureMissing = [${[...runtimeImports, 'drawTimberTrunk', 'drawSiteFrame'].map(name => `typeof ${name} === 'undefined' && ${JSON.stringify(name)}`).join(', ')}].filter(Boolean);
    window.createHudFixture = async (level, runTemplate) => {
      const assets = await loadWorldAssets(level.atlas), ui = await loadInterfaceKit();
      const pouch = await loadImage('/assets/spelling/pouch.png');
      const manifest = await (await fetch('/assets/henry/manifest.json')).json();
      const henry = await loadImage('/assets/henry/' + manifest.image), frame = manifest.frames[manifest.animations.idle.frames[0]];
      const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
      const fillRect = ctx.fillRect.bind(ctx), fillText = ctx.fillText.bind(ctx), drawImage = ctx.drawImage.bind(ctx);
      let recording = false, fills = [], texts = [], pouchRect;
      ctx.drawImage = (image, ...args) => { if (recording && image === pouch) pouchRect = args; drawImage(image, ...args); };
      ctx.fillRect = (x, y, width, height) => { if (recording) fills.push({ x, y, width, height, color: ctx.fillStyle }); fillRect(x, y, width, height); };
      ctx.fillText = (text, x, y) => {
        if (recording) { const m = ctx.measureText(text); texts.push({ text, left: x - m.actualBoundingBoxLeft,
          right: x + m.actualBoundingBoxRight, top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent }); }
        fillText(text, x, y);
      };
      let state = 0, hint = '', notice = '', ribbonBandPose = false;
      const draw = () => {
        const session = new EducationSession(); session.selectTrail(level.id);
        session.pickups.slice(0, state).forEach(pickup => session.collect(pickup.id));
        const run = { ...runTemplate, collectedGems: new Set(Array.from({ length: [0, 1, 10, 99, 44][state] }, (_, i) => 'g' + i)),
          specialTotal: [0, 3, 12, 3, 3][state], collectedSpecials: new Set(Array.from({ length: [0, 1, 10, 3, 3][state] }, (_, i) => 's' + i)),
          health: [3, 2, 1, 0, 3][state], healthFlashPip: state === 1 ? 2 : null, healthFlashSeconds: state === 1 ? 1 : 0 };
        ctx.imageSmoothingEnabled = false;
        const camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height, vertical: level.verticalCamera || level.progressAxis === 'y', lead: level.cameraLead });
        const ground = level.verticalCamera || level.progressAxis === 'y' ? level.start.y : surfaceY(level, level.start.x);
        camera.update(level.start.x, ground - 34);
        drawWorld(ctx, assets, level, camera, undefined, undefined, platformBodiesAt(level.platforms, 0), 0, true);
        const henryRect = { x: level.start.x - camera.position.x - manifest.anchor.x, y: ground - camera.position.y - manifest.anchor.y, width: 48, height: 48 };
        if (ribbonBandPose) { henryRect.x = 110 - manifest.anchor.x; henryRect.y = 230 - manifest.anchor.y; }
        ctx.drawImage(henry, frame.x, frame.y, frame.width, frame.height, henryRect.x, henryRect.y, 48, 48);
        drawWorldForeground(ctx, assets, level, camera);
        const hud = new HudPresentation(); if (state > 0) hud.consume([{ type: 'checkpoint', entityId: level.checkpoints[0].id }]);
        fills = []; texts = []; recording = true;
        drawGameplayHud(ctx, run, hint, notice, hud.progress(level, level.start.x, ground), ui);
        drawCollectionBag(ctx, session, pouch, ui); recording = false;
        const marks = fills.filter(rect => rect.width === 6 && rect.height === 6);
        const iconPixels = fills.filter(rect => rect.width <= 2 && rect.height <= 2 && rect.y < 22 && (rect.x < 24 || rect.x >= 151 && rect.x < 163));
        const overlaps = (a, b) => a.x < b.right && a.x + a.width > b.left && a.y < b.bottom && a.y + a.height > b.top;
        const mask = document.createElement('canvas'); mask.width = pouchRect[2]; mask.height = pouchRect[3];
        const ink = mask.getContext('2d'); ink.imageSmoothingEnabled = false;
        ink.drawImage(pouch, 0, 0, mask.width, mask.height);
        const rgba = ink.getImageData(0, 0, mask.width, mask.height).data, opaque = [];
        for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
          if (rgba[(y * mask.width + x) * 4 + 3] >= 128) opaque.push({ x: x + pouchRect[0], y: y + pouchRect[1] });
        }
        const quiet = { left: BAG_PLAQUE.x + PLAQUE_TEXT_SLICE.left, right: BAG_PLAQUE.x + BAG_PLAQUE.width - PLAQUE_TEXT_SLICE.right,
          top: BAG_PLAQUE.y + PLAQUE_TEXT_SLICE.top, bottom: BAG_PLAQUE.y + BAG_PLAQUE.height - PLAQUE_TEXT_SLICE.bottom };
        const clearance = {
          pouch: opaque.length > 0 && opaque.every(pixel => pixel.x >= quiet.left && pixel.x < quiet.right && pixel.y >= quiet.top && pixel.y < quiet.bottom),
          marks: marks.length === 4 && marks.filter(mark => mark.color === HUD_COLORS.hit).length === state,
          icons: iconPixels.length > 0 && iconPixels.every(pixel => !texts.some(text => overlaps(pixel, text))),
          bag: texts.every(text => text.right <= BAG_PLAQUE.x || text.bottom <= BAG_PLAQUE.y || text.top >= BAG_PLAQUE.y + BAG_PLAQUE.height),
          hintAndNotice: !hint || !notice || !overlaps({ x: texts.find(text => text.text === hint).left, y: texts.find(text => text.text === hint).top, width: texts.find(text => text.text === hint).right - texts.find(text => text.text === hint).left, height: texts.find(text => text.text === hint).bottom - texts.find(text => text.text === hint).top }, texts.find(text => text.text === notice)),
        };
        window.hudFixtureSample = { bag: BAG_PLAQUE, fills, texts, pouchRect, state, count: session.letterCount, health: run.health, gems: run.collectedGems.size,
          stars: run.specialTotal ? run.collectedSpecials.size + '/' + run.specialTotal : null, henryRect, clearance, pouchQuiet: quiet, pouchBounds: {
            left: Math.min(...opaque.map(p => p.x)), right: Math.max(...opaque.map(p => p.x)) + 1,
            top: Math.min(...opaque.map(p => p.y)), bottom: Math.max(...opaque.map(p => p.y)) + 1 },
          assets: [assets.atlas, assets.gems, assets.scenery?.background, assets.scenery?.foreground, pouch, henry, ...Object.values(ui)]
            .filter(Boolean).map(image => ({ source: new URL(image.src).pathname, loaded: image.complete && image.naturalWidth > 0 })) };
      };
      window.hudFixture = { bandPose() { ribbonBandPose = true; draw(); }, set(next, nextHint, nextNotice) { state = next; hint = nextHint; notice = nextNotice; draw(); } };
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => raf(time => { callback(time); draw(); });
    };
  })();` });
  expect(await page.evaluate(() => (window as unknown as { hudFixtureMissing: string[] }).hudFixtureMissing)).toEqual([]);
  await page.evaluate(({ level, run }) => (window as unknown as { createHudFixture(level: unknown, run: unknown): Promise<void> }).createHudFixture(level, run), { level, run: createRun(level) });
  const samples = [];
  for (const viewport of [{ width: 426, height: 300 }, { width: 320, height: 240 }]) {
    await page.setViewportSize(viewport);
    for (let state = 0; state <= 4; state++) {
      const hint = ['Arrows / A-D: move', 'Buttons 1–4: jump', 'Stick / D-pad: move', 'Space: jump', ''][state];
      const longest=[level.name,...(level.sections??[]).map(s=>s.name),...level.checkpoints.map((_,i)=>areaName(level,i))].sort((a,b)=>b.length-a.length)[0];
      const notice = [longest, 'Checkpoint reached!', longest, areaName(level, level.checkpoints.length - 1), ''][state];
      await page.evaluate(({ state, hint, notice }) => (window as unknown as { hudFixture: { set(s: number, h: string, n: string): void } }).hudFixture.set(state, hint, notice), { state, hint, notice });
      await twoFrames(page);
      const sample = await page.evaluate(() => (window as unknown as { hudFixtureSample: { count: number; clearance: Record<string, boolean>; assets: { source: string; loaded: boolean }[]; henryRect: { x: number; y: number; width: number; height: number } } }).hudFixtureSample);
      const geometry=await page.locator('#game').evaluate((c:HTMLCanvasElement)=>({native:[c.width,c.height],css:{width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height}}));
      const png=await page.locator('#game').screenshot();
      await info.attach(`observed-${level.id}-${viewport.width}-${state}`,{body:JSON.stringify({kind:'isolated actual renderer/font/art fixture, NOT input gameplay',viewport,geometry,pngSize:[png.readUInt32BE(16),png.readUInt32BE(20)],sample,hint,notice}),contentType:'application/json'});
      await info.attach(`observed-png-${level.id}-${viewport.width}-${state}`,{body:png,contentType:'image/png'});
      samples.push({ viewport, ...sample, hint, notice });
      await page.screenshot({ path: info.outputPath(`fixture-${level.id}-bag${state}-${viewport.width}.png`) });
      transport.assertHealthy();
      if (viewport.width === 426) {
        const png = await page.locator('#game').evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL().split(',')[1]);
        await writeFile(info.outputPath(`fixture-${level.id}-bag${state}-logical.png`), Buffer.from(png, 'base64'));
      }
    }
  }
  await transport.settle();
  page.off('response', transport.observe);
  const glyphs=await kitTextProbe(page);
  await info.attach('source-glyph-ledger',{body:JSON.stringify({kind:'isolated renderer fixture, NOT gameplay',samples,glyphs,runtimeImports,served:transport.records,sourceHashes:Object.fromEntries(names.map((name,i)=>[name,createHash('sha256').update(modules[i]).digest('hex')]))}),contentType:'application/json'});
  transport.assertComplete([...new Set(samples.flatMap(entry => entry.assets.map(asset => asset.source)))]);
  for(const entry of samples) {
    const actual=entry as unknown as {bag:{x:number;y:number;width:number;height:number};pouchRect:number[];fills:{x:number;y:number;width:number;height:number;color:string}[];texts:{text:string;top:number;bottom:number;left:number;right:number}[];notice:string;state:number;clearance:{pouch:boolean;marks:boolean;icons:boolean;bag:boolean;hintAndNotice:boolean}};
    expect(actual.bag).toEqual({x:325,y:5,width:96,height:28});
    expect(actual.pouchRect).toEqual([330,7,24,24]);
    expect(actual.fills.filter(r=>r.width===6&&r.height===6).map(r=>[r.x,r.y])).toEqual([359,373,387,401].map(x=>[x,14]));
    if(actual.notice)expect(actual.texts.find(t=>t.text===actual.notice)!.top).toBeGreaterThanOrEqual(actual.bag.y+actual.bag.height+4);
    expect(actual.clearance.pouch&&actual.clearance.marks&&actual.clearance.icons&&actual.clearance.bag&&actual.clearance.hintAndNotice).toBe(true);
  }
  expect(glyphs.violations).toEqual([]);expect(errors).toEqual([]);
});
