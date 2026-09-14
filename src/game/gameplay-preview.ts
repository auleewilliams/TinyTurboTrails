import type { GameAudio } from '../core/audio';
import type { InputFrame } from '../core/input';
import type { Scene } from '../core/scene';
import { animationFrame } from '../art/animation';
import { loadHenry, type HenryAssets } from '../art/henry';
import { animationFor, createPlayer, simulatePlayer, DEFAULT_MOVEMENT, type Player } from './movement';
import { activateCheckpoint, applySpring, collectGem, createRun, damagePlayer, recoverFromFall, tickRun, type RunEvent, type RunState } from './interactions';
import { PLAINS_LEVEL } from '../world/level';
import { Camera } from '../world/camera';
import { drawWorld } from '../world/renderer';
import { loadWorldAssets, type WorldAssets } from '../world/assets';

export class GameplayPreviewScene implements Scene {
  private readonly player: Player = createPlayer(PLAINS_LEVEL.start.x, PLAINS_LEVEL);
  private readonly run: RunState = createRun(PLAINS_LEVEL);
  private readonly camera = new Camera({ width: 426, height: 240, worldWidth: PLAINS_LEVEL.width, worldHeight: PLAINS_LEVEL.height });
  private elapsed = 0;
  private events: RunEvent[] = [];
  constructor(private readonly henry: HenryAssets, private readonly world: WorldAssets, private readonly audio: GameAudio) {}
  enter(): void { this.elapsed = 0; }
  exit(): void { this.audio.stop(); }

  update(seconds: number, input: InputFrame): void {
    this.elapsed += seconds;
    tickRun(this.run, seconds);
    const previousVelocityY = this.player.vy;
    simulatePlayer(this.player, input, PLAINS_LEVEL, seconds);
    if (previousVelocityY >= 0 && this.player.vy < -DEFAULT_MOVEMENT.jumpVelocity * 0.75) this.audio.play('jump');
    this.events = [];
    for (const entity of PLAINS_LEVEL.entities) {
      const state = this.run.entities.find((candidate) => candidate.id === entity.id);
      if (!state?.active || Math.abs(entity.x - this.player.x) > 18 || Math.abs(entity.y - (this.player.y + 34)) > 28) continue;
      if (entity.kind === 'gem') collectGem(this.run, entity.id, this.events);
      else if (entity.kind === 'checkpoint') activateCheckpoint(this.run, entity.id, this.events);
      else if (entity.kind === 'spring') applySpring(this.run, this.player, entity.id, this.events);
      else if (entity.kind === 'slime' || entity.kind === 'hazard') damagePlayer(this.run, this.player, entity.x - this.player.x, this.events, entity.id);
    }
    if (this.player.y > PLAINS_LEVEL.height + 80) recoverFromFall(this.run, this.player, this.events, PLAINS_LEVEL);
    for (const event of this.events) {
      if (event.type === 'gem') this.audio.play('gem');
      else if (event.type === 'checkpoint') this.audio.play('checkpoint');
      else if (event.type === 'spring') this.audio.play('spring');
      else if (event.type === 'damage') this.audio.play('damage');
    }
    this.camera.update(this.player.x, this.player.y);
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.world, PLAINS_LEVEL, this.camera);
    const name = animationFor(this.player);
    const clip = this.henry.manifest.animations[name];
    const frame = this.henry.manifest.frames[animationFrame(clip, this.elapsed)];
    const offset = this.camera.position;
    ctx.drawImage(this.henry.atlas, frame.x, frame.y, frame.width, frame.height,
      this.player.x - offset.x - this.henry.manifest.anchor.x,
      this.player.y - offset.y + 34 - this.henry.manifest.anchor.y,
      48, 48);
    ctx.fillStyle = '#10252cdd';
    ctx.fillRect(5, 5, 160, 25);
    ctx.fillStyle = '#e9f2df';
    ctx.font = '8px monospace';
    ctx.fillText(`GEMS ${this.run.collectedGems.size}   CHECKPOINT ${this.run.checkpointId ?? 'START'}`, 10, 16);
    ctx.fillText('Arrows/A-D · Space · Esc pause', 10, 26);
  }
}

export async function loadGameplayAssets(): Promise<{ henry: HenryAssets; world: WorldAssets }> {
  const [world, henry] = await Promise.all([loadWorldAssets(), loadHenry()]);
  return { henry, world };
}
