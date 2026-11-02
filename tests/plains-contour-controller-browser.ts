import type { createContourControllerKernel, ControllerGoal } from './plains-contour-controller';
import type { createContourObserver } from './plains-contour-observer';
type Witness = ReturnType<ReturnType<typeof createContourObserver>['snapshot']>;
export interface ControllerReadback {
  id: number; witness: Witness; status: string; png: string; logical: number[];
  box: { x: number; y: number; width: number; height: number }; accepted: string;
}
export interface ControllerBridge {
  start(goal: ControllerGoal): number; results: ControllerReadback[]; records: object[]; error: string | null;
  stop(): void;
}
/** Additional RAF observer, not a RAF/clock override. DOM event transport, NOT OS-key certification. */
export function installContourController(config: { top: number; surfaces: { x1: number; x2: number; y1: number; y2: number }[] },
  factory: typeof createContourControllerKernel) {
  const kernel = factory(), c = kernel.controller();
  const actuator = kernel.actuator((type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code === 'Space' ? ' ' : code, bubbles: true, cancelable: true })));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bridge: ControllerBridge = { records: [], results: [], error: null,
    start(goal) { if (bridge.error) throw new Error(bridge.error); return c.start(goal, performance.now()); },
    stop() { c.stop(); actuator.apply({ horizontal: 0, jump: false }, -1, performance.now()); if (timer) clearTimeout(timer); },
  };
  Object.assign(window, { contourController: bridge });
  const frame = (now: number) => {
    const probe = (window as unknown as { contourProbe?: { snapshot(status: string): Witness } }).contourProbe;
    const status = document.querySelector('#status')?.textContent ?? '', w = probe?.snapshot(status);
    if (w) {
      const coherent = Boolean(w.coherent && w.henry && w.ribbon);
      const x = coherent ? w.henry!.x + 580 - w.ribbon!.x : NaN;
      const feet = coherent ? w.henry!.feet + config.top - w.ribbon!.y : NaN;
      const part = config.surfaces.find(s => x >= s.x1 && x <= s.x2);
      const ground = part ? part.y1 + (part.y2 - part.y1) * (x - part.x1) / (part.x2 - part.x1) : NaN;
      const match = status.match(/V (-?\d+)/);
      const sample = { frame: w.frame, time: now, coherent, x, feetGap: feet - ground, facing: w.henry?.transform.a ?? NaN, velocity: match ? Number(match[1]) : null };
      try {
        actuator.expire(now, w.frame);
        const decision = c.tick(sample, now, actuator.state());
        const emitted = actuator.apply(decision.command, w.frame, now);
        bridge.records.push({ ...decision.evidence, command: decision.command, emitted, physicalAccepted: decision.completed,
          transport: 'render-driven synthetic DOM KeyboardEvent through actual BrowserInput handlers; event emission is not receipt', status });
        if (timer) clearTimeout(timer);
        if (emitted.horizontal) timer = setTimeout(() => {
          const actual = actuator.expire(performance.now(), w.frame);
          bridge.records.push({ phase: 'single-actuator lease expiry', emitted: actual, time: performance.now() });
        }, Math.ceil(2 * 1000 / 60));
        if (decision.completed) {
          const canvas = document.querySelector<HTMLCanvasElement>('#game')!, rect = canvas.getBoundingClientRect();
          // No event-loop boundary between physical predicate and actual canvas readback.
          bridge.results.push({ id: decision.completed.id, accepted: decision.completed.accepted, witness: w, status,
            png: canvas.toDataURL('image/png'), logical: [canvas.width, canvas.height], box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } });
        }
      } catch (error) { bridge.error = String(error); bridge.stop(); }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
