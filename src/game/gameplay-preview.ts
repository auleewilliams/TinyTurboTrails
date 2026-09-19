import type { GameAudio } from '../core/audio';
import type { InputFrame } from '../core/input';
import type { Scene } from '../core/scene';
import { animationFrame } from '../art/animation';
import { loadHenry, type HenryAssets } from '../art/henry';
import { hitFlashAtlas } from '../art/hit-flash';
import { drawFacingSprite } from '../art/sprite';
import { animationFor, createPlayer, simulatePlayer, DEFAULT_MOVEMENT, type PlatformBody, type Player } from './movement';
import { platformBodiesAt } from './platforms';
import { activeLedgePlatforms, createRun, entityPosition, isEntityActive, recoverFromFall, stepEntities, tickRun, type RunEvent, type RunState } from './interactions';
import { DEFAULT_LEVEL } from '../world/levels';
import type { LevelData } from '../world/level';
import { Camera } from '../world/camera';
import { drawWorld, drawWorldForeground } from '../world/renderer';
import { loadWorldAssets, type WorldAssets } from '../world/assets';
import { drawGameplayHud, HudPresentation } from './hud';
import { Feedback } from './feedback';

export class GameplayPreviewScene implements Scene {
  private readonly player: Player;
  private readonly run: RunState;
  private readonly camera: Camera;
  private elapsed = 0;
  private readonly feedback = new Feedback();
  private hud = new HudPresentation();
  private get reducedMotion(): boolean { return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  private platforms: PlatformBody[] = [];
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
    const step = tickRun(this.run, seconds);
    this.feedback.tick(step);
    this.hud.update(step, input, this.level, this.player.x);
    this.platforms = platformBodiesAt(this.level.platforms, this.run.seconds, step);
    const previousPosition = { x: this.player.x, y: this.player.y };
    const wasGrounded = this.player.onGround;
    const previousVelocityY = this.player.vy;
    simulatePlayer(this.player, input, this.level, seconds, [...this.platforms, ...activeLedgePlatforms(this.run, this.level)]);
    if (previousVelocityY >= 0 && this.player.vy < -DEFAULT_MOVEMENT.jumpVelocity * 0.75) this.audio.play('jump');
    if (!wasGrounded && this.player.onGround && previousVelocityY > 180) {
      this.feedback.add('landing', this.player.x, this.player.y + DEFAULT_MOVEMENT.height);
    }
    this.events = [];
    stepEntities(this.run, this.level, this.player, seconds, this.events, previousPosition);
    if (this.player.y > this.level.height + 80) recoverFromFall(this.run, this.player, this.events, this.level);
    this.feedback.consume(this.events, this.level);
    for (const event of this.events) {
      if (event.type === 'gem') this.audio.play('gem');
      else if (event.type === 'checkpoint') this.audio.play('checkpoint');
      else if (event.type === 'spring') this.audio.play('spring');
      else if (event.type === 'damage') this.audio.play('damage');
    }
    this.camera.update(this.player.x, this.player.y);
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.world, this.level, this.camera,
      (entity) => isEntityActive(this.run, entity.id), (entity) => ({ ...entityPosition(this.run, entity),
        checkpointActive: entity.kind === 'checkpoint' && this.run.checkpointId === entity.id,
        springScale: entity.kind === 'spring' ? this.feedback.springScale(entity.id, this.reducedMotion) : undefined }), this.platforms);
    const hurt = this.run.invulnerableSeconds > 0;
    const name = hurt ? 'fall' : animationFor(this.player);
    const clip = this.henry.manifest.animations[name];
    const frame = this.henry.manifest.frames[animationFrame(clip, this.elapsed)];
    const offset = this.camera.position;
    ctx.save();
    // Fade only opaque sprite pixels: Henry's silhouette never becomes a rectangle.
    if (hurt) ctx.globalAlpha = this.reducedMotion ? 0.65 : Math.floor(this.run.invulnerableSeconds * 10) % 2 ? 0.45 : 1;
    drawFacingSprite(ctx, this.run.healthFlashSeconds > 0 ? hitFlashAtlas(this.henry.atlas) : this.henry.atlas, frame,
      this.player.x - offset.x - this.henry.manifest.anchor.x,
      this.player.y - offset.y + 34 - this.henry.manifest.anchor.y,
      48, 48, this.player.facing);
    ctx.restore();
    drawWorldForeground(ctx, this.world, this.level, this.camera);
    this.feedback.draw(ctx, this.world, this.camera.position, this.reducedMotion);
    drawGameplayHud(ctx, this.run, this.hud.hint, this.feedback.checkpointSeconds > 0
      ? 'Checkpoint reached!' : this.hud.locationSeconds > 0 ? this.hud.location : '');
  }
}

export async function loadGameplayAssets(level: LevelData = DEFAULT_LEVEL): Promise<{ henry: HenryAssets; world: WorldAssets }> {
  const [world, henry] = await Promise.all([loadWorldAssets(level.atlas), loadHenry()]);
  return { henry, world };
}
