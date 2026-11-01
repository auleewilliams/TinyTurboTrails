export interface NativeMatrix { a: number; b: number; c: number; d: number; e: number; f: number }
export interface ContourObserverConfig { ribbonReferenceOffsetX?: number; sky: string; width: number; height: number; anchor: { x: number; y: number }; logicalSize: { width: number; height: number } }
/** Observe the raw camera displacement and its exact start-boundary predicate. */
export function contourCameraObservation(originX: number): { cameraX: number; isStartBoundary: boolean } {
  const cameraX = -originX;
  return { cameraX, isStartBoundary: cameraX === 0 };
}
export function createContourObserver(config: ContourObserverConfig) {
  let frame = 0, obscured = false;
  let henry: { x: number; feet: number; sourceRect: number[]; frame: number; transform: NativeMatrix } | null = null;
  let ribbon: { x: number; y: number; args: number[]; frame: number; origin: { x: number; y: number }; referenceOffsetX: number } | null = null;
  return {
    fill(isGame: boolean, args: number[], style: string, alpha: number, m: NativeMatrix) {
      if (!isGame || args.join(',') !== `0,0,${config.width},${config.height}`) return;
      if (style === config.sky && alpha === 1 && m.a === 1 && m.d === 1 && m.b === 0 && m.c === 0 && m.e === 0 && m.f === 0) {
        frame++; henry = null; ribbon = null; obscured = false;
      } else if (frame > 0) obscured = true;
    },
    ribbon(args: number[], m: NativeMatrix) {
      const referenceOffsetX = config.ribbonReferenceOffsetX ?? 0;
      const origin = { x: m.a * args[0] + m.c * args[1] + m.e, y: m.b * args[0] + m.d * args[1] + m.f };
      // The frozen controller measures from world580; retain the actual bitmap draw too.
      ribbon = { x: origin.x + m.a * referenceOffsetX, y: origin.y + m.b * referenceOffsetX, args, frame, origin, referenceOffsetX };
    },
    actor(args: number[], m: NativeMatrix) {
      const x = args[4] + config.anchor.x * args[6] / config.logicalSize.width;
      const y = args[5] + config.anchor.y * args[7] / config.logicalSize.height;
      henry = { x: m.a * x + m.c * y + m.e, feet: m.b * x + m.d * y + m.f, sourceRect: args.slice(0, 4), frame, transform: m };
    },
    snapshot(status: string) { return { frame, obscured, coherent: frame > 0 && !obscured && status.includes('· Playing ·') && henry?.frame === frame && ribbon?.frame === frame, henry, ribbon }; },
  };
}
