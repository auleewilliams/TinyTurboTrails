import type { GameAudio } from '../core/audio';
import type { InputFrame } from '../core/input';
import type { Scene } from '../core/scene';
import { animationFrame } from '../art/animation';
import { loadHenry, type HenryAssets } from '../art/henry';
import { drawFacingSprite } from '../art/sprite';
import { animationFor, createPlayer, simulatePlayer, DEFAULT_MOVEMENT, type Player } from './movement';
import { activateCheckpoint, applySpring, collectGem, createRun, damagePlayer, isEntityActive, recoverFromFall, tickRun, type RunEvent, type RunState } from './interactions';
import { DEFAULT_LEVEL } from '../world/levels';
import type { LevelData } from '../world/level';
import { Camera } from '../world/camera';
import { drawWorld } from '../world/renderer';
import { loadWorldAssets, type WorldAssets } from '../world/assets';

export class GameplayPreviewScene implements Scene {
  private readonly player: Player;
  private readonly run: RunState;
  private readonly camera: Camera;
  private elapsed = 0;
  private events: RunEvent[] = [];
  constructor(private readonly henry: HenryAssets, private readonly world: WorldAssets, private readonly audio: GameAudio, private readonly level: LevelData = DEFAULT_LEVEL) {
    this.player = createPlayer(level.start.x, level);
    this.run = createRun(level);
    this.camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
  }
  enter(): void { this.elapsed = 0; }
  exit(): void { this.audio.stop(); }

  update(seconds: number, input: InputFrame): void {
    this.elapsed += seconds;
    tickRun(this.run, seconds);
    const previousVelocityY = this.player.vy;
    simulatePlayer(this.player, input, this.level, seconds);
    if (previousVelocityY >= 0 && this.player.vy < -DEFAULT_MOVEMENT.jumpVelocity * 0.75) this.audio.play('jump');
    this.events = [];
    for (const entity of this.level.entities) {
      const state = this.run.entities.find((candidate) => candidate.id === entity.id);
      const touching = Math.abs(entity.x - this.player.x) <= 18 && Math.abs(entity.y - (this.player.y + 34)) <= 28;
      if (entity.kind === 'spring') {
        applySpring(this.run, this.player, entity.id, this.events, touching);
        continue;
      }
      if (!state?.active || !touching) continue;
      if (entity.kind === 'gem') collectGem(this.run, entity.id, this.events);
      else if (entity.kind === 'checkpoint') activateCheckpoint(this.run, entity.id, this.events);
      else if (entity.kind === 'slime' || entity.kind === 'hazard') damagePlayer(this.run, this.player, entity.x - this.player.x, this.events, entity.id);
    }
    if (this.player.y > this.level.height + 80) recoverFromFall(this.run, this.player, this.events, this.level);
    for (const event of this.events) {
      if (event.type === 'gem') this.audio.play('gem');
      else if (event.type === 'checkpoint') this.audio.play('checkpoint');
      else if (event.type === 'spring') this.audio.play('spring');
      else if (event.type === 'damage') this.audio.play('damage');
    }
    this.camera.update(this.player.x, this.player.y);
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.world, this.level, this.camera, (entity) => isEntityActive(this.run, entity.id));
    const hurt = this.run.invulnerableSeconds > 0;
    const name = hurt ? 'fall' : animationFor(this.player);
    const clip = this.henry.manifest.animations[name];
    const frame = this.henry.manifest.frames[animationFrame(clip, this.elapsed)];
    const offset = this.camera.position;
    const shake = hurt ? Math.sin(this.elapsed * 42) * 2 : 0;
    ctx.save();
    ctx.translate(shake, 0);
    drawFacingSprite(ctx, this.henry.atlas, frame,
      this.player.x - offset.x - this.henry.manifest.anchor.x,
      this.player.y - offset.y + 34 - this.henry.manifest.anchor.y,
      48, 48, this.player.facing);
    if (hurt) {
      ctx.fillStyle = '#ff5d5d88';
      ctx.fillRect(this.player.x - offset.x - 22, this.player.y - offset.y - 12, 44, 50);
    }
    ctx.restore();
    ctx.fillStyle = '#10252cdd';
    ctx.fillRect(5, 5, 160, 25);
    ctx.fillStyle = '#e9f2df';
    ctx.font = '8px monospace';
    ctx.fillText(`GEMS ${this.run.collectedGems.size}   CHECKPOINT ${this.run.checkpointId ?? 'START'}`, 10, 16);
    ctx.fillText('Arrows/A-D · Space · Esc pause', 10, 26);
  }
}

export async function loadGameplayAssets(level: LevelData = DEFAULT_LEVEL): Promise<{ henry: HenryAssets; world: WorldAssets }> {
  const [world, henry] = await Promise.all([loadWorldAssets(level.atlas), loadHenry()]);
  return { henry, world };
}
