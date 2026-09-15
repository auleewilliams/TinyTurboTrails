export interface CameraBounds { width: number; height: number; worldWidth: number; worldHeight: number }

export class Camera {
  private x = 0;
  private y = 0;
  private readonly deadZone = { left: 110, right: 250, top: 74, bottom: 166 };
  constructor(private readonly bounds: CameraBounds) {}
  update(targetX: number, targetY: number): void {
    const screenX = targetX - this.x;
    const screenY = targetY - this.y;
    if (screenX < this.deadZone.left) this.x = targetX - this.deadZone.left;
    if (screenX > this.deadZone.right) this.x = targetX - this.deadZone.right;
    if (screenY < this.deadZone.top) this.y = targetY - this.deadZone.top;
    if (screenY > this.deadZone.bottom) this.y = targetY - this.deadZone.bottom;
    this.x = Math.max(0, Math.min(this.bounds.worldWidth - this.bounds.width, this.x));
    this.y = Math.max(0, Math.min(this.bounds.worldHeight - this.bounds.height, this.y));
  }
  get position(): { x: number; y: number } { return { x: this.x, y: this.y }; }
}
