const STEP_MS = 1000 / 60;
const MAX_STEPS = 6;

/** Wall timestamps are milliseconds; simulation callbacks receive seconds. */
export class SimulationClock {
  private previous: number | undefined;
  private accumulator = 0;
  private paused = false;

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.previous = undefined;
    this.accumulator = 0;
  }

  advance(now: number, update: (seconds: number) => void): void {
    if (this.paused) return;
    if (this.previous === undefined) {
      this.previous = now;
      return;
    }
    const elapsed = Math.max(0, now - this.previous);
    this.previous = now;
    this.accumulator = Math.min(this.accumulator + elapsed, STEP_MS * MAX_STEPS);
    while (this.accumulator + 1e-7 >= STEP_MS) {
      update(STEP_MS / 1000);
      this.accumulator = Math.max(0, this.accumulator - STEP_MS);
    }
  }
}
