import type { AdventureScene } from './adventure-scene';

/** Native buttons mirror Canvas hit areas, providing tab/Enter and accessible names. */
export class MenuOverlay {
  private readonly element = document.createElement('nav');
  private signature = '';
  constructor(private readonly canvas: HTMLCanvasElement) {
    this.element.className = 'trail-menu';
    this.element.setAttribute('aria-label', 'Trail navigation');
    document.body.append(this.element);
  }
  update(scene: AdventureScene | undefined, paused: boolean): void {
    document.body.classList.toggle('map-visible', (scene?.screenState === 'title' || scene?.screenState === 'story' || scene?.screenState === 'finish') && !paused);
    const targets = paused ? [] : scene?.menuTargets ?? [];
    const signature = JSON.stringify(targets.map(({ label, selected, description }) => [label, selected, description]));
    const bounds = this.canvas.getBoundingClientRect();
    Object.assign(this.element.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
    if (signature === this.signature) return;
    this.signature = signature;
    // Preserve focus when selection changes. Rebuild only when the screen changes.
    const existing = Array.from(this.element.querySelectorAll('button'));
    if (existing.length !== targets.length) this.element.replaceChildren();
    targets.forEach((target, index) => {
      const button = existing.length === targets.length ? existing[index] : document.createElement('button');
      button.type = 'button'; button.setAttribute('aria-label', target.label);
      if (target.description) button.setAttribute('aria-description', target.description);
      else button.removeAttribute('aria-description');
      if (target.selected !== undefined) button.setAttribute('aria-pressed', String(target.selected));
      else button.removeAttribute('aria-pressed');
      button.onclick = () => target.action();
      // These auxiliary buttons sit outside the canvas direction/confirm selection.
      // Handle their focused Space press before BrowserInput consumes it as Play/Replay.
      button.onkeydown = (event) => {
        if (event.code !== 'Space' || !target.nativeSpace) return;
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) target.action();
      };
      button.onfocus = () => {
        if (target.focus) target.focus();
        else if (scene?.screenState === 'title' && index < 6) scene.selectDestination(index);
        else if (scene?.screenState === 'finish') scene.focusFinish(index);
      };
      Object.assign(button.style, { left: `${target.x / 426 * 100}%`, top: `${target.y / 240 * 100}%`,
        width: `${target.width / 426 * 100}%`, height: `${target.height / 240 * 100}%` });
      if (!button.isConnected) this.element.append(button);
    });
  }
  dispose(): void { this.element.remove(); }
}
