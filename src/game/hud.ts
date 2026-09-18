import { MAX_HEALTH, type RunState } from './interactions';

const PIP = { startX: 44, y: 10, size: 6, gap: 3 } as const;

export function drawGameplayHud(ctx: CanvasRenderingContext2D, run: RunState, controls: string): void {
  ctx.save();
  ctx.fillStyle = '#10252cdd';
  ctx.fillRect(5, 5, 270, 25);
  ctx.fillStyle = '#e9f2df';
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`GEMS ${run.collectedGems.size}       CHECKPOINT ${run.checkpointId ?? 'START'}`, 10, 16);
  ctx.fillText(controls, 10, 26);

  for (let index = 0; index < MAX_HEALTH; index++) {
    const full = index < run.health;
    const flashing = index === run.healthFlashPip && run.healthFlashSeconds > 0;
    ctx.fillStyle = flashing ? '#ffda75' : full ? '#ff5d5d' : '#31434a';
    const x = PIP.startX + index * (PIP.size + PIP.gap);
    ctx.fillRect(x, PIP.y, PIP.size, PIP.size);
    ctx.strokeStyle = '#e9f2df';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, PIP.y + 0.5, PIP.size - 1, PIP.size - 1);
  }
  ctx.restore();
}
