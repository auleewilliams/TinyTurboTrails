/** Serialized init observer shared by the browser caller and the Node construction regression. */
export function installQuarryMapPreviewObserver(): void {
  type Preview = { heading: string; width: number; height: number; rimPixels: number; image: string };
  const probe = { heading: '', plains: null as Preview | null, quarry: null as Preview | null };
  // Associate the source with the actual offscreen cache, including when it is reused warm.
  const rims = new WeakMap<HTMLCanvasElement, { image: HTMLImageElement; x: number; y: number;
    transform: DOMMatrix; smoothing: boolean }>();
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function(x, y, width, height) {
    if (x === 0 && y === 0 && width === 426 && height === 240) rims.delete(this.canvas);
    return fill.call(this, x, y, width, height);
  };
  const fillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function(...args) {
    if (this.canvas.id === 'game' && args[1] === 350 && args[2] === 63) probe.heading = String(args[0]);
    return Reflect.apply(fillText, this, args);
  };
  const original = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(image: CanvasImageSource, ...args: number[]) {
    if (this.canvas.id !== 'game' && this.canvas.width === 426 && this.canvas.height === 240
      && image instanceof HTMLImageElement && args.length === 2) {
      const url = new URL(image.src, window.location.origin), t = this.getTransform();
      // Rim (160,140) minus the real starting camera (50,2); native unscaled 360x41 draw.
      if (url.origin === window.location.origin && url.pathname === '/assets/quarry/rollout-v1/shelf-360.png'
        && !url.search && !url.hash && image.complete && image.naturalWidth === 360 && image.naturalHeight === 41
        && args[0] === 110 && args[1] === 138 && t.a === 1 && t.b === 0 && t.c === 0 && t.d === 1 && t.e === 0 && t.f === 0) {
        rims.set(this.canvas, { image, x: args[0], y: args[1], transform: t, smoothing: this.imageSmoothingEnabled });
      }
    }
    if (this.canvas.id === 'game' && image instanceof HTMLCanvasElement && args.length === 4
      && args[0] === 287 && args[1] === 84 && args[2] === 126 && args[3] === 71
      && (probe.heading === 'PLAINS' || probe.heading === 'QUARRY')) {
      let rimPixels = 0;
      const rim = rims.get(image);
      if (probe.heading === 'QUARRY' && image.width === 426 && image.height === 240 && rim) {
        const reference = document.createElement('canvas'); reference.width = 426; reference.height = 240;
        const ctx = reference.getContext('2d')!; ctx.imageSmoothingEnabled = rim.smoothing; ctx.setTransform(rim.transform);
        Reflect.apply(original, ctx, [rim.image, rim.x, rim.y]);
        const expected = ctx.getImageData(0, 0, 426, 240).data;
        const actual = image.getContext('2d')!.getImageData(0, 0, 426, 240).data;
        for (let y = 120; y <= 160; y++) for (let x = 150; x <= 350; x++) {
          const at = (y * 426 + x) * 4;
          if (expected[at + 3] === 255 && actual[at + 3] === 255 && actual[at] === expected[at]
            && actual[at + 1] === expected[at + 1] && actual[at + 2] === expected[at + 2]) rimPixels++;
        }
      }
      const sample = { heading: probe.heading, width: image.width, height: image.height, rimPixels, image: image.toDataURL() };
      if (probe.heading === 'PLAINS' && !probe.plains) probe.plains = sample;
      if (probe.heading === 'QUARRY' && !probe.quarry) probe.quarry = sample;
    }
    return Reflect.apply(original, this, [image, ...args]);
  };
  Object.assign(window, { quarryMapPreview: probe });
}
