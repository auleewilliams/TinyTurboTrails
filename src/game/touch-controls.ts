import { BrowserInput, type TouchAction } from '../core/input';

/** DOM controls retain each finger independently, including when it drifts off its button. */
export class TouchControls {
  private enabled = false;
  private readonly pointers = new Map<number, HTMLButtonElement>();
  private readonly buttons: HTMLButtonElement[];

  constructor(private readonly element: HTMLElement, private readonly input: BrowserInput) {
    this.buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button[data-touch]'));
    element.addEventListener('pointerdown', this.down);
    element.addEventListener('pointerup', this.up);
    element.addEventListener('pointercancel', this.cancel);
    element.addEventListener('lostpointercapture', this.cancel);
    element.addEventListener('contextmenu', this.contextMenu);
    this.paint();
  }

  private down = (event: PointerEvent): void => {
    if (!this.enabled || event.button !== 0 || this.pointers.has(event.pointerId)) return;
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-touch]');
    if (!button || !this.buttons.includes(button)) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, button);
    this.input.pressTouch(event.pointerId, button.dataset.touch as TouchAction);
    this.paint();
  };

  private release(pointer: number, cancelled: boolean): void {
    const button = this.pointers.get(pointer);
    this.pointers.delete(pointer);
    this.input.releaseTouch(pointer, cancelled);
    if (button?.hasPointerCapture(pointer)) button.releasePointerCapture(pointer);
    this.paint();
  }

  private up = (event: PointerEvent): void => { this.release(event.pointerId, false); };
  private cancel = (event: PointerEvent): void => { this.release(event.pointerId, true); };
  private contextMenu = (event: Event): void => { event.preventDefault(); };

  private paint(): void {
    for (const button of this.buttons) {
      button.dataset.held = String(this.input.touchHeld(button.dataset.touch as TouchAction));
      button.disabled = !this.enabled;
    }
  }

  update(enabled: boolean): void {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      if (!enabled) for (const pointer of Array.from(this.pointers.keys())) this.release(pointer, true);
      this.element.hidden = !enabled;
    }
    this.paint();
  }

  dispose(): void {
    this.update(false);
    this.element.removeEventListener('pointerdown', this.down);
    this.element.removeEventListener('pointerup', this.up);
    this.element.removeEventListener('pointercancel', this.cancel);
    this.element.removeEventListener('lostpointercapture', this.cancel);
    this.element.removeEventListener('contextmenu', this.contextMenu);
  }
}
