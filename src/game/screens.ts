export type ScreenState = 'title' | 'loading' | 'playing' | 'paused' | 'finish' | 'error';

export class ScreenController {
  state: ScreenState = 'title';
  gems = 0;
  error = '';

  start(): void { if (this.state === 'title' || this.state === 'error') this.state = 'loading'; }
  loaded(): void { if (this.state === 'loading') this.state = 'playing'; }
  fail(message: string): void { this.error = message; this.state = 'error'; }
  retry(): void { if (this.state === 'error') { this.error = ''; this.state = 'loading'; } }
  pause(): void { if (this.state === 'playing') this.state = 'paused'; }
  resume(): void { if (this.state === 'paused') this.state = 'playing'; }
  complete(gems: number): void { if (this.state === 'playing') { this.gems = gems; this.state = 'finish'; } }
  replay(): void { if (this.state === 'finish') { this.gems = 0; this.state = 'title'; } }
  update(step: () => void): void { if (this.state === 'playing') step(); }
}
