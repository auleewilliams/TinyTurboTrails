export interface ControllerSample {
  frame: number; time: number; coherent: boolean; x: number; feetGap: number;
  facing: number; velocity: number | null;
}
export interface ControllerGoal { mode: 'park' | 'traverse' | 'capture' | 'jump'; target: number; direction: 1 | -1 }
export interface EmittedInput { horizontal: number; jump: boolean; frame: number }
/** Self-contained factory: the native adapter serializes exactly this tested implementation. */
export function createContourControllerKernel(config = { braking: 1200, maxSpeed: 220 }) {
  function goalBudget(mode: ControllerGoal['mode']): number { return mode === 'jump' ? 5_000 : 20_000; }
  function traversalInput(x: number, velocity: number, direction: 1 | -1, held: number): number {
    if (direction > 0 && x < 560) return direction;
    const speed = direction * velocity;
    if (speed > 35) return 0;
    if (speed < 20) return direction;
    return held === direction ? direction : 0;
  }
  function captureReady(s: { coherent: boolean; frame: number; armedFrame: number; x: number; target: number; feetGap: number; facing: number; velocity: number; held: number; direction: 1 | -1 }) {
    return s.coherent && s.frame > s.armedFrame && s.held === s.direction && (s.x - s.target) * s.direction >= 0
      && s.velocity * s.direction > 1 && s.facing * s.direction > 0 && Math.abs(s.feetGap) < 1;
  }
  function actuator(dispatch: (type: 'keydown' | 'keyup', code: string) => void) {
    let horizontal = 0, jump = false, frame = -1, expires = Infinity;
    const events: { type: string; code: string; frame: number }[] = [];
    const emit = (type: 'keydown' | 'keyup', code: string, at: number) => { dispatch(type, code); events.push({ type, code, frame: at }); };
    return {
      state: (): EmittedInput => ({ horizontal, jump, frame }), events,
      expire(now: number, at: number) { if (horizontal && now >= expires) this.apply({ horizontal: 0, jump }, at, now); return this.state(); },
      apply(command: { horizontal: number; jump: boolean }, at: number, now = 0) {
        expires = command.horizontal ? now + 2 * 1000 / 60 : Infinity;
        if (horizontal !== command.horizontal) {
          if (horizontal) emit('keyup', horizontal > 0 ? 'ArrowRight' : 'ArrowLeft', at);
          horizontal = 0;
          if (command.horizontal) { emit('keydown', command.horizontal > 0 ? 'ArrowRight' : 'ArrowLeft', at); horizontal = command.horizontal; }
          frame = at;
        }
        if (jump !== command.jump) { emit(command.jump ? 'keydown' : 'keyup', 'Space', at); jump = command.jump; frame = at; }
        return this.state();
      },
    };
  }
  function controller() {
    let goal: ControllerGoal | null = null, deadline = 0, id = 0, lastFrame = -1;
    let previous: ControllerSample | null = null, stableAt: number | null = null, stableX: number | null = null;
    let result: { id: number; frame: number; mode: string; accepted: string } | null = null;
    let cruise: 1 | -1 | null = null, lastTickTime: number | null = null;
    return {
      start(next: ControllerGoal, now: number) { goal = next; deadline = now + goalBudget(next.mode); id++; result = null; stableAt = stableX = null; return id; },
      result: () => result,
      stop() { goal = null; cruise = null; },
      tick(s: ControllerSample, now: number, emitted: EmittedInput) {
        const late = lastTickTime !== null && now - lastTickTime > 2 * 1000 / 60 + 0.01;
        lastTickTime = now;
        const fresh = s.coherent && s.frame > lastFrame;
        const estimate = previous && s.time > previous.time ? (s.x - previous.x) * 1000 / (s.time - previous.time) : null;
        const velocity = s.velocity ?? estimate;
        const evidence = { goal: goal?.mode ?? 'idle', id, sample: s, emittedBefore: emitted, velocityEstimate: estimate, fresh };
        const command = { horizontal: 0, jump: false };
        if (goal && now > deadline) throw new Error(`Controller${goalBudget(goal.mode)}msdeadline ${goal.mode} target${goal.target}`);
        if (!fresh || late) {
          if (!s.coherent) { stableAt = stableX = null; }
          return { command, evidence: { ...evidence, late }, completed: null };
        }
        lastFrame = s.frame;
        const elapsed = previous ? Math.max(0, Math.min(0.1, (s.time - previous.time) / 1000)) : 1 / 60;
        previous = s;
        if (!goal) { if (cruise) command.horizontal = (velocity === null ? cruise : traversalInput(s.x, velocity, cruise, emitted.horizontal)); return { command, evidence, completed: null }; }
        const finish = (accepted: string) => { result = { id, frame: s.frame, mode: goal!.mode, accepted }; cruise = goal!.mode === 'park' ? null : goal!.direction; goal = null; return result; };
        const g = goal;
        if (g.mode === 'park') {
          const error = g.target - s.x;
          if (Math.abs(error) <= 4) {
            if (s.velocity === 0 && emitted.horizontal === 0 && stableX === s.x && Math.abs(s.feetGap) < 1) {
              stableAt ??= now;
              if (now - stableAt >= 200) return { command, evidence, completed: finish('fresh rendered V0/unchangedX/neutral/grounded200ms') };
            } else { stableAt = null; stableX = s.x; }
          } else {
            stableAt = stableX = null;
            if (velocity !== null) {
              const direction = Math.sign(error), speed = direction * velocity;
              const stopping = speed * speed / (2 * config.braking) + Math.abs(velocity) * elapsed;
              if (speed >= 0 && speed < 40 && stopping < Math.abs(error) - 2) command.horizontal = direction;
            }
          }
        } else if (g.mode === 'jump') {
          command.horizontal = g.direction; command.jump = true;
          if (s.feetGap < -8 && s.frame > emitted.frame && emitted.jump) { command.jump = false; return { command, evidence, completed: finish('rendered actual Space jump separation>8') }; }
        } else {
          const reached = (s.x - g.target) * g.direction >= 0;
          command.horizontal = (velocity === null ? g.direction : traversalInput(s.x, velocity, g.direction, emitted.horizontal));
          if (g.mode === 'capture' && reached) {
            command.horizontal = g.direction;
            if (velocity !== null && captureReady({ ...s, velocity, armedFrame: emitted.frame, held: emitted.horizontal, direction: g.direction, target: g.target })) {
              return { command, evidence, completed: finish('fresh grounded directional physical capture acknowledgement') };
            }
          } else if (g.mode === 'traverse' && reached && Math.abs(s.feetGap) < 1) return { command, evidence, completed: finish('rendered grounded target crossing') };
        }
        return { command, evidence, completed: null };
      },
    };
  }
  return { controller, actuator, traversalInput, captureReady, goalBudget };
}
