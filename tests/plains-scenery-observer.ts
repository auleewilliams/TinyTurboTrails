/** Page init hook shared by the legacy scenery scenario and isolated unit probes. */
export function installPlainsSceneryObserver(): void {
  const original = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
    const image = args[0];
    if (this.canvas.id === 'game' && image instanceof HTMLImageElement) {
      const source = image.src;
      if (source.endsWith('/scenery/background.webp') || source.endsWith('/trails/backdrops.webp') || (source.endsWith('/environment.png') && args[1] === 48 && args[2] === 48 && Number(args[7]) > 48)) {
        this.canvas.dataset.sceneryDraws = '[]';
      }
      const calls = JSON.parse(this.canvas.dataset.sceneryDraws ?? '[]');
      calls.push({ source, args: args.slice(1) });
      this.canvas.dataset.sceneryDraws = JSON.stringify(calls);
    }
    Reflect.apply(original, this, args);
  } as typeof original;
}
