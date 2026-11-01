import { SUNSET_SITE } from '../src/world/sunset-site';

export function siteSteelSupports() {
  const get = (id: string) => {
    const matches = SUNSET_SITE.platforms!.filter(p => p.id === id);
    if (matches.length !== 1) throw new Error(`Expected unique authored support: ${id}`);
    const p = matches[0];
    return { id, x: p.from.x, y: p.from.y, width: p.width };
  };
  return { near: get('site-high-deck'), far: get('site-far-dock'), ferry: get('site-crane-ferry') };
}

/** Observe the shipped images and their real canvas transform, never game state. */
export function siteSteelDockInit(supports: ReturnType<typeof siteSteelSupports>): void {
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
    Reflect.apply(draw, this, args);
    if (this.canvas.id !== 'game' || !(args[0] instanceof HTMLImageElement) || args.length !== 9) return;
    const image = args[0], width = Number(args[7]);
    const x = this.getTransform().transformPoint(new DOMPoint(Number(args[5]), Number(args[6]))).x;
    if (image.src.endsWith(`/assets/site/steel-v1/${supports.near.id}.png`) && width === supports.near.width) this.canvas.dataset.nearDockScreenX = String(x + width);
    if (image.src.endsWith(`/assets/site/steel-v1/${supports.far.id}.png`) && width === supports.far.width) this.canvas.dataset.farDockScreenX = String(x - supports.ferry.width);
    if (image.src.endsWith('/assets/site/steel-v1/ferry.png') && width === supports.ferry.width) this.canvas.dataset.craneScreenX = String(x);
  } as typeof draw;
}
