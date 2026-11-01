export interface NativeMatrix { a: number; b: number; c: number; d: number; e: number; f: number }
export interface ContourObserverConfig { sky: string; width: number; height: number; anchor: { x: number; y: number }; logicalSize: { width: number; height: number } }
export function createContourObserver(config: ContourObserverConfig) {
  let frame = 0, obscured = false;
  let henry: { x: number; feet: number; sourceRect: number[]; frame: number; transform: NativeMatrix } | null = null;
  let ribbon: { x: number; y: number; args: number[]; frame: number } | null = null;
  return {
    fill(isGame: boolean, args: number[], style: string, alpha: number, m: NativeMatrix) {
      if (!isGame || args.join(',') !== `0,0,${config.width},${config.height}`) return;
      if (style === config.sky && alpha === 1 && m.a === 1 && m.d === 1 && m.b === 0 && m.c === 0 && m.e === 0 && m.f === 0) {
        frame++; henry = null; ribbon = null; obscured = false;
      } else if (frame > 0) obscured = true;
    },
    ribbon(args: number[], m: NativeMatrix) { ribbon = { x: m.a * args[0] + m.c * args[1] + m.e, y: m.b * args[0] + m.d * args[1] + m.f, args, frame }; },
    actor(args: number[], m: NativeMatrix) {
      const x = args[4] + config.anchor.x * args[6] / config.logicalSize.width;
      const y = args[5] + config.anchor.y * args[7] / config.logicalSize.height;
      henry = { x: m.a * x + m.c * y + m.e, feet: m.b * x + m.d * y + m.f, sourceRect: args.slice(0, 4), frame, transform: m };
    },
    snapshot(status: string) { return { frame, obscured, coherent: frame > 0 && !obscured && status.includes('· Playing ·') && henry?.frame === frame && ribbon?.frame === frame, henry, ribbon }; },
  };
}
