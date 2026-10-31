import { expect, it } from 'vitest';
import { observeCoveMaterialFill } from './cove-material-probe';
import { SANDY_COVE } from '../src/world/sandy-cove';

it('keeps genuine water draws and Henry when the actual pause overlay follows a world frame', () => {
  const state = { frame: [] as object[], henrySeen: false };
  observeCoveMaterialFill(state, 'game', 0, 0, 426, 240, SANDY_COVE.theme.sky, SANDY_COVE.theme.sky);
  const base = { index: 3, ripple: false, sx: 0, alpha: 1 }, ripple = { index: 3, ripple: true, sx: .5, alpha: .7 };
  state.frame.push(base, ripple); state.henrySeen = true;
  observeCoveMaterialFill(state, 'game', 0, 0, 426, 240, '#0c1922cc', SANDY_COVE.theme.sky);
  expect(state.frame).toEqual([base, ripple]); expect(state.henrySeen).toBe(true);
  // Independent sampling callbacks perform no world fill and must retain the same observations.
  const sample = () => structuredClone(state);
  expect(sample()).toEqual(sample()); expect(sample().frame).toHaveLength(2);
});

it('resets only on the next actual Cove sky fill, not another canvas or a partial fill', () => {
  const marker = { source: 'actual draw record fixture' }, state = { frame: [marker], henrySeen: true };
  for (const [canvas, width, style] of [['preview',426,SANDY_COVE.theme.sky],['game',425,SANDY_COVE.theme.sky],['game',426,'rgba(12, 25, 34, 0.8)']] as const) {
    observeCoveMaterialFill(state, canvas, 0, 0, width, 240, style, SANDY_COVE.theme.sky);
    expect(state.frame).toEqual([marker]); expect(state.henrySeen).toBe(true);
  }
  observeCoveMaterialFill(state, 'game', 0, 0, 426, 240, SANDY_COVE.theme.sky, SANDY_COVE.theme.sky);
  expect(state.frame).toEqual([]); expect(state.henrySeen).toBe(false);
});

it('retains first airborne entry diagnostic but selects a later grounded witness in the SAME region', async () => {
  const { coveMaterialSelection } = await import('./cove-material-probe');
  const first: {key:string}[]=[],grounded: {key:string}[]=[],key='forward-2-entry';
  const air={kind:'AIRBORNE' as const,reason:'2px above',footY:342,bandY:344};
  expect(coveMaterialSelection(key,air,first,grounded)).toEqual({first:true,grounded:false});
  first.push({key});
  expect(coveMaterialSelection(key,{...air,kind:'GROUNDED',footY:344},first,grounded)).toEqual({first:false,grounded:true});
  grounded.push({key});expect(first).toEqual([{key}]);
  expect(coveMaterialSelection(key,air,first,grounded)).toEqual({first:false,grounded:false});
});

it('uses exact native draw/anchor contact across both facings and rejects rounded air, bad source, absent or offscreen Henry', async () => {
  const { coveMaterialContact,coveMaterialHenryContract }=await import('./cove-material-probe');
  const { readFileSync }=await import('node:fs');const { createRequire }=await import('node:module');
  const {decodePng}=createRequire(import.meta.url)('../scripts/spelling-stickers.mjs');
  const manifest=JSON.parse(readFileSync(new URL('../public/assets/henry/manifest.json',import.meta.url),'utf8'));
  const image=decodePng(readFileSync(new URL(`../public/assets/henry/${manifest.image}`,import.meta.url)));
  const contract=coveMaterialHenryContract(manifest,image.data,image.width),band={x:100.25,y:140.5,width:200};
  const source=contract.frames[0],draw={sx:source.x,sy:source.y,sw:48,sh:48,x:110.25,y:96.5,width:48,height:48,alpha:1,matrix:[1,0,0,1,0,0]};
  expect(coveMaterialContact({...draw,y:94.5},band,1,contract).kind).toBe('AIRBORNE');
  expect(coveMaterialContact({...draw,y:96.49},band,1,contract).kind).toBe('AIRBORNE'); // rounded debugY could look grounded
  expect(coveMaterialContact(draw,band,1,contract)).toMatchObject({kind:'GROUNDED',footY:140.5});
  expect(coveMaterialContact({...draw,x:0,y:0,matrix:[-1,0,0,1,158.25,96.5]},band,-1,contract)).toMatchObject({kind:'GROUNDED',footY:140.5});
  for(const bad of [undefined,{...draw,sh:47},{...draw,height:47},{...draw,x:-30},{...draw,matrix:[1,0,0,1,0,0]}]){
    expect(coveMaterialContact(bad,band,-1,contract).kind).toBe('INVALID');
  }
  expect(coveMaterialContact({...draw,sh:47},band,1,contract).kind).toBe('INVALID');
  expect(coveMaterialContact({...draw,x:-30},band,1,contract).kind).toBe('INVALID');
  expect(coveMaterialContact(draw,band,1,{...contract,frames:[]} ).kind).toBe('INVALID');
});
