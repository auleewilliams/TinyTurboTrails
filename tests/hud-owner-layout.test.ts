import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { BAG_PICKUP, BAG_PLAQUE, HUD_PLAQUES, TRAIL_RIBBON, drawTrailRibbon, HudPresentation, drawCollectionBag, drawGameplayHud } from '../src/game/hud';
import { drawLetterTile } from '../src/art/spelling';
import { EducationSession } from '../src/game/education';
import { createRun } from '../src/game/interactions';
import { LEVELS } from '../src/world/levels';
import { transformSync } from 'rolldown/utils';
const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
it.each(LEVELS)('$id removes only the ribbon legend while retaining hints, location and progress', level => {
  const hud = new HudPresentation();
  hud.update(.01, neutral, level, level.start.x); expect(hud.hint).toBe('Arrows / A-D: move'); expect(hud.location).not.toBe('');
  hud.update(.01, { ...neutral, horizontal: 1, source: 'controller' }, level, level.start.x); expect(hud.hint).toBe('Buttons 1–4: jump');
  hud.update(.01, { ...neutral, jumpPressed: true }, level, level.start.x);
  hud.update(3, neutral, level, level.start.x);
  expect(hud.hint).toBe('');
  const progress = hud.progress(level, level.finish.x, level.finish.y);
  expect(progress.position).toBe(1); expect(progress.checkpoints).toHaveLength(level.checkpoints.length);
});
it('moves the complete bag and slots to the counter top, with notice below its 28px body', () => {
  const fills: number[][] = [], texts: {text:string;x:number;y:number}[] = [], images: unknown[][] = [];
  const ctx = { save() {}, restore() {}, fillRect(...a:number[]) { fills.push(a); }, fillText(text:string,x:number,y:number) { texts.push({text,x,y}); }, measureText(text:string) { return {width:text.length*6}; }, drawImage(...a:unknown[]) { images.push(a); } } as unknown as CanvasRenderingContext2D;
  const collection = new EducationSession(); collection.selectTrail(LEVELS[0].id); const pouch = {} as HTMLImageElement;
  drawCollectionBag(ctx, collection, pouch); drawGameplayHud(ctx, createRun(LEVELS[0]), 'Space: jump', 'Checkpoint reached!');
  expect(BAG_PLAQUE).toEqual({x:325,y:HUD_PLAQUES.gems.y,width:96,height:28});
  expect(images.find(a=>a[0]===pouch)?.slice(1)).toEqual([330,7,24,24]);
  expect(fills.filter(a=>a[2]===6&&a[3]===6)).toEqual([359,373,387,401].map(x=>[x,14,6,6]));
  const notice = texts.find(t=>t.text==='Checkpoint reached!')!;
  expect(notice.y-15).toBeGreaterThanOrEqual(BAG_PLAQUE.y+BAG_PLAQUE.height+4);
  expect(texts.some(t=>t.text==='Space: jump')).toBe(true);
});
for (const reduced of [false,true]) it(`real pickup renderer follows the moved bag: reducedMotion=${reduced}`, () => {
  const source=readFileSync(new URL('../src/game/adventure-scene.ts',import.meta.url),'utf8');
  const start=source.indexOf('  private drawWordProgress('),end=source.indexOf('\n  private ',start+5);
  const code=transformSync('flight.ts',source.slice(start,end).replace('private drawWordProgress(', 'function drawWordProgress('),{}).code;
  const calls: unknown[][]=[];
  const draw = new Function('drawCollectionBag','drawLetterTile','BAG_PICKUP',`${code};return drawWordProgress;`)(drawCollectionBag,(...args:Parameters<typeof drawLetterTile>)=>{calls.push(args);drawLetterTile(...args);},BAG_PICKUP);
  const collection=new EducationSession();collection.selectTrail(LEVELS[0].id);
  const ctx={save(){},restore(){},fillRect(){},fillText(){}};
  draw.call({hasWordActivity:true,education:collection,spelling:{},ui:undefined,reducedMotion:reduced,letterFlights:[{age:.65,x:100,y:100,letter:'A'}]},ctx);
  const call=calls[0];
  const midCtx={save(){},restore(){},fillRect(){},fillText(){},globalAlpha:1};
  draw.call({hasWordActivity:true,education:collection,spelling:{},ui:undefined,reducedMotion:reduced,letterFlights:[{age:.325,x:100,y:100,letter:'A'}]},midCtx);
  const mid=calls[1];expect(midCtx.globalAlpha).toBe(.75);
  expect(Number(mid[3])).toBeCloseTo((reduced?342:221)-11,12);
  expect(Number(mid[4])).toBeCloseTo((reduced?25:(100+18)/2-25)-18,12);
  expect(mid.slice(5)).toEqual([22,24]);
  if(reduced) {
    const top=Number(call[4]),bottom=top+Number(call[6]);
    expect(top).toBeGreaterThanOrEqual(7); expect(bottom).toBeLessThanOrEqual(31);
    expect(bottom+6).toBeLessThanOrEqual(37); // tile ends before relocated notice, even with extra6px clearance
  }
  expect([call[3],call[5],call[6]]).toEqual([342-11,22,24]);
  expect(Number(call[4])).toBeCloseTo((reduced?25:18)-18,12);
});

it('retains the real top ribbon, activated checkpoints and finish flag', () => {
  const level=LEVELS[0],hud=new HudPresentation();hud.consume([{type:'checkpoint',entityId:level.checkpoints[0].id}]);
  const progress=hud.progress(level,level.finish.x,level.finish.y);expect(progress.position).toBe(1);expect(progress.checkpoints[0].activated).toBe(true);
  const fills:number[][]=[];const ctx={save(){},restore(){},fillRect(...args:number[]){fills.push(args);},fillText(){},measureText(){return {width:0};}} as unknown as CanvasRenderingContext2D;
  drawGameplayHud(ctx,createRun(level),'','',progress);
  expect(fills).toContainEqual([TRAIL_RIBBON.finishX + 1, TRAIL_RIBBON.y + 2, 3, 2]);
  expect(fills.some(r=>r[2]===3&&r[3]===4)).toBe(true);
});

// Actual HUD and nine-slice draw calls; native glyph metrics remain a browser gate.
it.each(LEVELS)('$id draws a compact top ribbon clear of optional stars, pouch and notices', level => {
  type Rect = { x: number; y: number; width: number; height: number };
  const separate = (a: Rect, b: Rect) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
  for (const stars of [0, 12]) for (const illustrated of [false, true]) {
    const ribbonRects: Rect[] = [], blockers: Rect[] = [];
    const record = (x: number, y: number, width: number, height: number) => {
      (recordingRibbon ? ribbonRects : blockers).push({ x, y, width, height });
    };
    let recordingRibbon = false;
    const ctx = { fillStyle: '', textAlign: 'left', save() {}, restore() {},
      fillRect: record,
      drawImage(_image: HTMLImageElement, ...args: number[]) {
        const [x, y, width, height] = args.length === 4 ? args : args.slice(4);
        record(x, y, width, height);
      },
      fillText() {},
      measureText(text: string) { return { width: text.length * 6 }; },
    } as unknown as CanvasRenderingContext2D;
    const plaque = { path: 'public/assets/interface/plaque.png' } as unknown as HTMLImageElement;
    const kit = illustrated ? { plaque } as import('../src/art/interface-kit').InterfaceKit : undefined;
    const run = createRun(level); run.specialTotal = stars;
    const notice = 'Checkpoint reached!';
    drawGameplayHud(ctx, run, 'Arrows / A-D: move', notice, undefined, kit);
    const collection = new EducationSession(); collection.selectTrail(level.id);
    drawCollectionBag(ctx, collection, { path: 'public/assets/spelling/pouch.png' } as unknown as HTMLImageElement, kit);
    recordingRibbon = true;
    drawTrailRibbon(ctx, new HudPresentation().progress(level, level.finish.x, level.finish.y), kit);
    expect(TRAIL_RIBBON.y).toBe(5);
    expect(TRAIL_RIBBON.x).toBeGreaterThanOrEqual(HUD_PLAQUES.stars.x + HUD_PLAQUES.stars.width + 4);
    expect(TRAIL_RIBBON.x + TRAIL_RIBBON.width).toBeLessThanOrEqual(BAG_PLAQUE.x - 4);
    expect(ribbonRects.length).toBeGreaterThan(8);
    for (const r of ribbonRects) {
      expect(r.x).toBeGreaterThanOrEqual(TRAIL_RIBBON.x); expect(r.y).toBeGreaterThanOrEqual(TRAIL_RIBBON.y);
      expect(r.x + r.width).toBeLessThanOrEqual(TRAIL_RIBBON.x + TRAIL_RIBBON.width);
      expect(r.y + r.height).toBeLessThanOrEqual(TRAIL_RIBBON.y + TRAIL_RIBBON.height);
      expect(blockers.length).toBeGreaterThan(8);
      expect(blockers.every(b => separate(r, b))).toBe(true);
      for (const cssWidth of [426, 320]) {
        const scale = cssWidth / 426;
        expect((r.x + r.width) * scale).toBeLessThanOrEqual(cssWidth);
        expect((r.y + r.height) * scale).toBeLessThanOrEqual(240 * scale);
      }
    }
  }
});
