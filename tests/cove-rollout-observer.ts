export interface RolloutRole { id: string; path: string; x: number; top: number; width: number; height: number }
/** Read-only actual canvas draw observer. Reset ONLY at the world ground draw, never overlay fills/RAF. */
export function coveRolloutObserverInit(options: { roles: RolloutRole[]; hollowAlpha: number[] }): void {
  const probe = { gemCount: null as number|null, flights: {} as Record<string,{ascent?:{status:string;png:string};descent?:{status:string;png:string}}>, frame: 0, rocks: {} as Record<string, { source: string; args: number[]; alphaPixels: number; visiblePixels: number; cameraY: number; points: string[] }>, actor: null as null | { alphaPixels: number; visiblePixels: number; top: number; bottom: number; overlap: Record<string, number>; oldHollowOverlap: number; headGap: Record<string, number> }, entities: [] as { source: string; args: number[]; alphaPixels: number; visiblePixels: number }[], seen: [] as string[] };
  Object.assign(window, { coveRolloutProbe: probe });
  const fillText=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(value,x,y,maxWidth){if(this.canvas.id==='game'&&x===28&&y===20&&/^\d+$/.test(value))probe.gemCount=Number(value);if(maxWidth===undefined)fillText.call(this,value,x,y);else fillText.call(this,value,x,y,maxWidth);};
  const draw = CanvasRenderingContext2D.prototype.drawImage, cache = new WeakMap<HTMLImageElement, Uint8ClampedArray>();
  let oldHollow = new Set<string>();
  const points = (ctx: CanvasRenderingContext2D, args: Parameters<typeof draw>, mask?: number[]) => {
    const [image,sx,sy,sw,sh,dx,dy,dw,dh] = args as unknown as [HTMLImageElement,number,number,number,number,number,number,number,number];
    let data = cache.get(image);
    if (!data && !mask) { const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ink=c.getContext('2d')!;draw.call(ink,image,0,0,image.naturalWidth,image.naturalHeight,0,0,image.naturalWidth,image.naturalHeight);data=ink.getImageData(0,0,c.width,c.height).data;cache.set(image,data); }
    const m=ctx.getTransform(),out:[number,number][]=[];
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(mask?mask[y*sw+x]:data![((sy+y)*image.naturalWidth+sx+x)*4+3]) {const px=dx+(x+.5)*dw/sw,py=dy+(y+.5)*dh/sh;out.push([Math.floor(m.a*px+m.c*py+m.e),Math.floor(m.b*px+m.d*py+m.f)]);}
    return out;
  };
  const visible = (p: [number,number][]) => p.filter(([x,y])=>x>=0&&x<426&&y>=0&&y<240).length;
  CanvasRenderingContext2D.prototype.drawImage=function(this:CanvasRenderingContext2D,...args:Parameters<typeof draw>) {
    Reflect.apply(draw,this,args);
    if(this.canvas.id!=='game'||!(args[0] instanceof HTMLImageElement))return;
    if((args as unknown[]).length===5){const a=args as unknown as [HTMLImageElement,number,number,number,number];args=[a[0],0,0,a[0].naturalWidth,a[0].naturalHeight,a[1],a[2],a[3],a[4]] as Parameters<typeof draw>;}
    if(args.length!==9)return;
    const image=args[0] as HTMLImageElement;
    if(image.src.endsWith('/assets/cove/terrain-kit/ground.png')) {probe.frame++;probe.rocks={};probe.actor=null;probe.entities=[];oldHollow=new Set();return;}
    const role=options.roles.find(r=>image.src.endsWith(r.path));
    if(role) {const p=points(this,args);probe.rocks[role.id]={source:image.src,args:args.slice(1) as number[],alphaPixels:p.length,visiblePixels:visible(p),cameraY:role.top-Number(args[6]),points:p.map(([x,y])=>`${x},${y}`)};if(!probe.seen.includes(role.id))probe.seen.push(role.id);if(role.id==='cove-hollow-shelf')oldHollow=new Set(points(this,args,options.hollowAlpha).map(([x,y])=>`${x},${y}`));return;}
    if(image.src.includes('/assets/henry/henry-celebration.png')) {const p=points(this,args),xs=p.map(([x])=>x),ys=p.map(([,y])=>y),overlap:Record<string,number>={},headGap:Record<string,number>={};for(const[id,rock]of Object.entries(probe.rocks)){const set=new Set(rock.points);overlap[id]=p.filter(([x,y])=>set.has(`${x},${y}`)).length;const below=rock.points.map(s=>s.split(',').map(Number)).filter(([x])=>x>=Math.min(...xs)&&x<=Math.max(...xs));headGap[id]=below.length?Math.min(...ys)-Math.max(...below.map(([,y])=>y))-1:NaN;}probe.actor={alphaPixels:p.length,visiblePixels:visible(p),top:Math.min(...ys),bottom:Math.max(...ys),overlap,headGap,oldHollowOverlap:p.filter(([x,y])=>oldHollow.has(`${x},${y}`)).length};}
    else if(image.src.includes('/assets/gems/')||image.src.endsWith('/assets/cove/environment.png')||image.src.includes('/assets/letters/')||image.src.endsWith('/assets/spelling/tile.png')) {const p=points(this,args);probe.entities.push({source:image.src,args:args.slice(1) as number[],alphaPixels:p.length,visiblePixels:visible(p)});}
  } as typeof draw;
  const prior:Record<string,number>={};
  const sample=()=>{const status=document.querySelector('#status')?.textContent??'',m=status.match(/X (-?\d+) Y (-?\d+)/);if(m){const x=Number(m[1]),y=Number(m[2]);for(const role of options.roles.filter(r=>['cove-hollow-shelf','cove-pool-stone-1','cove-pool-stone-2'].includes(r.id))){if(x>=role.x&&x<=role.x+role.width&&y+34<role.top+10){const flight=probe.flights[role.id]??{};if(y<prior[role.id]&&!flight.ascent)flight.ascent={status,png:document.querySelector<HTMLCanvasElement>('#game')!.toDataURL()};if(y>prior[role.id]&&y+34<=role.top&&!flight.descent)flight.descent={status,png:document.querySelector<HTMLCanvasElement>('#game')!.toDataURL()};probe.flights[role.id]=flight;}prior[role.id]=y;}}requestAnimationFrame(sample);};requestAnimationFrame(sample);
}
