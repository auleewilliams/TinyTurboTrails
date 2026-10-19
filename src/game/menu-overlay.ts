import type { AdventureScene } from './adventure-scene';
import type { MenuTarget } from './overworld';

/** Native buttons mirror Canvas hit areas, providing tab/Enter and accessible names. */
export class MenuOverlay {
  private readonly element = document.createElement('nav');
  private signature = '';
  private dragging?: { handlers: NonNullable<MenuTarget['drag']>; pointer: number; x: number; y: number; moved: boolean };
  private suppressClick = false;
  private point(event: PointerEvent): { x: number; y: number } {
    const bounds = this.canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * 426 / bounds.width, y: (event.clientY - bounds.top) * 240 / bounds.height };
  }
  private cancelDrag(): void { this.dragging?.handlers.cancel(); this.dragging = undefined; }
  constructor(private readonly canvas: HTMLCanvasElement) {
    this.element.className = 'trail-menu';
    this.element.setAttribute('aria-label', 'Trail navigation');
    // Keep native menu targets in the same fullscreen surface as the canvas.
    this.canvas.parentElement!.append(this.element);
    this.element.onpointermove = event => {
      const drag = this.dragging;
      if (!drag || event.pointerId !== drag.pointer) return;
      const { x, y } = this.point(event);
      drag.moved ||= Math.hypot(x - drag.x, y - drag.y) > 3;
      drag.handlers.move(x, y);
    };
    this.element.onpointerup = event => {
      const drag = this.dragging;
      if (!drag || event.pointerId !== drag.pointer) return;
      const { x, y } = this.point(event);
      this.dragging = undefined;
      if (drag.moved) { this.suppressClick = true; drag.handlers.end(x, y); }
      else drag.handlers.cancel();
    };
    this.element.onpointercancel = () => this.cancelDrag();
    this.element.onlostpointercapture = () => this.cancelDrag();
    this.element.addEventListener('click', event => {
      if (this.suppressClick) { event.preventDefault(); event.stopPropagation(); this.suppressClick = false; }
    }, true);
  }
  update(scene: AdventureScene | undefined, paused: boolean, pauseTargets: MenuTarget[] = []): void {
    document.body.classList.toggle('map-visible', (scene?.screenState === 'title' || scene?.screenState === 'story' || scene?.screenState === 'finish') && !paused);
    const activityOpen = Boolean(scene?.educationOverlay.open && !paused);
    if (paused || !scene?.educationOverlay.open) this.cancelDrag();
    const targets = paused ? pauseTargets : scene?.menuTargets ?? [];
    this.element.setAttribute('role', activityOpen ? 'dialog' : 'navigation');
    document.body.classList.toggle('pause-visible', pauseTargets.length > 0);
    this.element.setAttribute('aria-label', paused
      ? pauseTargets[0]?.label === 'Keep playing' ? 'Return to Trails confirmation' : 'Pause navigation'
      : activityOpen ? scene!.educationOverlay.title : 'Trail navigation');
    const signature = JSON.stringify([
      activityOpen ? scene?.educationOverlay.revision : undefined,
      targets.map(({ label, selected, description, x, y, width, height }) => [label, selected, description, x, y, width, height]),
    ]);
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
      button.style.touchAction = target.drag ? 'none' : '';
      button.onpointerdown = event => {
        this.suppressClick = false;
        if (!target.drag || !event.isPrimary || event.button !== 0) return;
        const { x, y } = this.point(event);
        this.dragging = { handlers: target.drag, pointer: event.pointerId, x, y, moved: false };
        target.drag.start(x, y);
        button.setPointerCapture(event.pointerId);
      };
      // These auxiliary buttons sit outside the canvas direction/confirm selection.
      // Handle focused Space before BrowserInput consumes it as Play/Replay, and
      // suppress native Enter repeats so one held key cannot confirm two screens.
      button.onkeydown = (event) => {
        if (!target.nativeSpace || (event.code !== 'Space' && event.code !== 'Enter')) return;
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
    if (activityOpen) this.element.querySelectorAll('button')[Math.max(0, targets.findIndex(target => target.selected))]?.focus({ preventScroll: true });
  }
  dispose(): void { this.cancelDrag(); this.element.remove(); }
}
