/** Test observer only. The real Cove sky fill starts the world frame; pause/focus
 * overlays and independent RAF/sample callbacks must retain its draw records. */
export function observeCoveMaterialFill<T>(probe: { frame: T[]; henrySeen: boolean },
  canvasId: string, x: number, y: number, width: number, height: number, style: unknown, sky: string): void {
  if (canvasId === 'game' && x === 0 && y === 0 && width === 426 && height === 240 && style === sky) {
    probe.frame = []; probe.henrySeen = false;
  }
}

export interface MaterialHenryDraw { sx: number; sy: number; sw: number; sh: number; x: number; y: number; width: number; height: number; alpha: number; matrix: number[] }
export interface MaterialHenryContract { anchor: { x: number; y: number }; logicalSize: { width: number; height: number }; frames: { x: number; y: number; width: number; height: number; feet: number[] }[] }
export interface MaterialContact { kind: 'GROUNDED' | 'AIRBORNE' | 'INVALID'; reason: string; footY?: number; bandY: number; visibleFootColumns?: number }
/** Exact observed draw/anchor contact; source-alpha feet are a separate bound witness, not a screenshot pixel certification. */
export function coveMaterialContact(henry: MaterialHenryDraw | undefined, band: { x: number; y: number; width: number },
  facing: number, contract: MaterialHenryContract): MaterialContact {
  const invalid = (reason: string): MaterialContact => ({ kind: 'INVALID', reason, bandY: band.y });
  if (!henry || !Number.isFinite(henry.alpha) || henry.alpha <= 0) return invalid('absent Henry');
  const [a,b,c,d,e,f] = henry.matrix;
  if (![a,b,c,d,e,f,henry.x,henry.y,henry.width,henry.height,band.x,band.y,band.width].every(Number.isFinite)
    || (facing !== 1 && facing !== -1) || a !== facing || b !== 0 || c !== 0 || d !== 1) return invalid('incorrect facing/native transform');
  if (henry.sw !== contract.logicalSize.width || henry.sh !== contract.logicalSize.height
    || henry.width !== henry.sw || henry.height !== henry.sh) return invalid('wrong native source/destination height');
  const x0=a*henry.x+e,x1=a*(henry.x+henry.width)+e,y0=henry.y+f;
  if (Math.min(x0,x1)<0 || Math.max(x0,x1)>426 || y0<0 || y0+henry.height>240) return invalid('Henry offscreen');
  const anchorX=a*(henry.x+contract.anchor.x)+e, footY=henry.y+contract.anchor.y+f;
  if(anchorX<band.x||anchorX>=band.x+band.width)return invalid('anchor outside material');
  if (footY !== band.y) return {kind:'AIRBORNE',reason:'rendered anchor away from plane',footY,bandY:band.y};
  const frame = contract.frames.find(frame => frame.x === henry.sx && frame.y === henry.sy && frame.width === henry.sw && frame.height === henry.sh);
  if (!frame || frame.feet.length < 4) return invalid('missing grounded source frame/alpha feet');
  return {kind:footY===band.y?'GROUNDED':'AIRBORNE',reason:footY===band.y?'exact rendered anchor contact':'rendered anchor away from plane',footY,bandY:band.y,visibleFootColumns:frame.feet.length};
}

/** Retain first crossing separately; primary witnesses require real exact contact. */
export function coveMaterialSelection(key: string, contact: MaterialContact, first: readonly {key:string}[], grounded: readonly {key:string}[]): {first:boolean;grounded:boolean} {
  return {first:!first.some(c=>c.key===key),grounded:contact.kind==='GROUNDED'&&!grounded.some(c=>c.key===key)};
}

/** Source data only: bind eligible frames/visible feet to the actual shipped manifest and PNG alpha. */
export function coveMaterialHenryContract(manifest: { anchor: {x:number;y:number}; logicalSize:{width:number;height:number}; frames:{x:number;y:number;width:number;height:number}[]; animations:{idle:{frames:number[]};run:{frames:number[]}} }, pixels: Uint8Array, imageWidth: number): MaterialHenryContract {
  return {anchor:manifest.anchor,logicalSize:manifest.logicalSize,frames:[...new Set([...manifest.animations.idle.frames,...manifest.animations.run.frames])].map(index=>{
    const frame=manifest.frames[index],feet=Array.from({length:frame.width},(_,x)=>x).filter(x=>pixels[((frame.y+manifest.anchor.y-1)*imageWidth+frame.x+x)*4+3]>=128);
    return {...frame,feet};
  })};
}
