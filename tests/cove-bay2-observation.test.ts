import { expect, it } from 'vitest';
import { drawGem } from '../src/world/renderer';
import { bay2LowGemOrigin } from './cove-bay2-observation';
it('matches actual low-gem renderer coordinates at every fractional camera offset',()=>{
 for(const fraction of [0,.25,.5,.75]){
  const rock=[100.25+fraction,40.25+fraction],calls:unknown[][]=[];
  const ctx={drawImage(...a:unknown[]){calls.push(a);}} as unknown as CanvasRenderingContext2D;
  drawGem(ctx,{} as HTMLImageElement,rock[0]+100,rock[1]+39,'cove');
  expect(bay2LowGemOrigin(rock)).toEqual(calls[0].slice(5,7));
 }
});
