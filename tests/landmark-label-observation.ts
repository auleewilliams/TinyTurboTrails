/** Test-only actual canvas observer, shared by native tests and synthetic probes. */
import { HUD_NOTICE_Y } from '../src/game/hud';
export const landmarkGameplayAnchor = { x: 415, y: HUD_NOTICE_Y + 15 };
export function landmarkLabelProbeInit(anchor: { x: number; y: number }): void {
    const probe = { labels: [] as { text: string; left: number; top: number; right: number; bottom: number }[],
      panel: [] as string[], assets: [] as string[] };
    Object.assign(window, { landmarkLabelProbe: probe });
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.id === 'game') {
        if (text === 'PATCHWORK VALE') { probe.labels = []; probe.panel = []; delete this.canvas.dataset.gameplayTrail; delete this.canvas.dataset.gameplayGlyph; }
        if (['Plains', 'Quarry', 'Timbers', 'Sunset', 'Frost', 'Cove'].includes(text)) {
          const m = this.measureText(text);
          probe.labels.push({ text, left: x - m.actualBoundingBoxLeft, top: y - m.actualBoundingBoxAscent,
            right: x + m.actualBoundingBoxRight, bottom: y + m.actualBoundingBoxDescent });
          this.canvas.dataset.landmarkLabels = JSON.stringify(probe.labels.map(label => label.text));
        }
        if (x === 350 && (y === 63 || y === 76)) probe.panel.push(text);
        if (x === anchor.x && y === anchor.y && text.trim()) {
          const m = this.measureText(text);
          this.canvas.dataset.gameplayTrail = text;
          this.canvas.dataset.gameplayGlyph = JSON.stringify({ text, x, y, left: x - m.actualBoundingBoxLeft,
            right: x + m.actualBoundingBoxRight, top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent });
        }
      }
      if (maxWidth === undefined) fillText.call(this, text, x, y); else fillText.call(this, text, x, y, maxWidth);
    };
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image: CanvasImageSource, ...args: number[]) {
      if (image instanceof HTMLImageElement && image.complete && !probe.assets.includes(image.src)) probe.assets.push(image.src);
      return Reflect.apply(drawImage, this, [image, ...args]);
    };
}
