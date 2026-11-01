import { createContourControllerKernel } from './plains-contour-controller';
export const captureReady = createContourControllerKernel().captureReady;
/** Neutral is a real release in the shared actuator; no ternary key adapter here. */
export function captureInput(direction: -1 | 0 | 1): number { return direction; }
