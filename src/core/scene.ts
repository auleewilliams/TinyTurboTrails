import type { InputFrame } from './input';

export interface Scene {
  enter(): void;
  exit(): void;
  update(seconds: number, input: InputFrame): void;
  render(context: CanvasRenderingContext2D): void;
}

export class SceneHost {
  private current: Scene | undefined;

  constructor(private readonly stopAudio: () => void) {}

  change(next: Scene): void {
    this.current?.exit();
    this.stopAudio();
    this.current = next;
    next.enter();
  }

  update(seconds: number, input: InputFrame): void {
    this.current?.update(seconds, input);
  }

  render(context: CanvasRenderingContext2D): void {
    this.current?.render(context);
  }

  dispose(): void {
    this.current?.exit();
    this.current = undefined;
    this.stopAudio();
  }
}
