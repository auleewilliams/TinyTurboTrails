import type { GameAudio } from '../core/audio';
import type { InputFrame } from '../core/input';
import type { Scene } from '../core/scene';
import { animationFrame } from '../art/animation';
import type { HenryAssets } from '../art/henry';
import { animationFor, createPlayer, simulatePlayer, type Player } from './movement';
import { activateCheckpoint, applySpring, collectGem, createRun, damagePlayer, recoverFromFall, tickRun, type RunEvent, type RunState } from './interactions';
import { ScreenController } from './screens';
import { PLAINS_LEVEL } from '../world/level';
import { Camera } from '../world/camera';
import { drawWorld } from '../world/renderer';
import type { WorldAssets } from '../world/assets';

export class AdventureScene implements Scene {
  private readonly screens = new ScreenController();
  private player: Player = createPlayer(PLAINS_LEVEL.start.x, PLAINS_LEVEL);
  private run: RunState = createRun(PLAINS_LEVEL);
  private readonly camera = new Camera({ width: 426, height: 240, worldWidth: PLAINS_LEVEL.width, worldHeight: PLAINS_LEVEL.height });
  private elapsed = 0;
  private events: RunEvent[] = [];
  constructor(private readonly henry: HenryAssets, private readonly world: WorldAssets, private readonly audio: GameAudio) {}
  get screenState(): ScreenController['state'] { return this.screens.state; }
  get gemTotal(): number { return this.screens.gems; }
  get playerX(): number { return this.player.x; }
  get playerY(): number { return this.player.y; }
  get playerVelocityX(): number { return this.player.vx; }
  enter(): void { this.elapsed = 0; }
  exit(): void { this.audio.stop(); }

  update(seconds: number, input: InputFrame): void {
    this.elapsed += seconds;
    if (this.screens.state === 'title' && (input.jumpPressed || input.pausePressed)) {
      this.screens.start();
      this.screens.loaded();
      return;
    }
    if (this.screens.state === 'finish') {
      if (input.jumpPressed) {
        this.run = createRun(PLAINS_LEVEL);
        this.player = createPlayer(PLAINS_LEVEL.start.x, PLAINS_LEVEL);
        this.screens.replay();
      }
      return;
    }
    this.screens.update(() => this.stepGameplay(seconds, input));
  }

  private stepGameplay(seconds: number, input: InputFrame): void {
    tickRun(this.run, seconds);
    simulatePlayer(this.player, input, PLAINS_LEVEL, seconds);
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
    if (this.player.x >= PLAINS_LEVEL.finish.x && this.screens.state === 'playing') {
      this.screens.complete(this.run.collectedGems.size);
      this.audio.play('complete');
    }
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
    if (this.screens.state === 'playing') this.drawHenry(ctx);
    ctx.fillStyle = '#10252cdd';
    ctx.fillRect(5, 5, 205, 25);
    ctx.fillStyle = '#e9f2df';
    ctx.font = '8px monospace';
    if (this.screens.state === 'playing') {
      ctx.fillText(`GEMS ${this.run.collectedGems.size}   CHECKPOINT ${this.run.checkpointId ?? 'START'}`, 10, 16);
      ctx.fillText('Arrows/A-D move · Space jump · Esc pause', 10, 26);
    } else if (this.screens.state === 'title') {
      this.panel(ctx, 'TINY TURBO TRAILS', 'Press Space to start');
    } else if (this.screens.state === 'finish') {
      this.panel(ctx, 'TRAIL COMPLETE!', `Gems ${this.screens.gems} · Henry celebrates · Space to replay`);
      this.drawCelebration(ctx);
    } else if (this.screens.state === 'error') {
      this.panel(ctx, 'LOADING ERROR', `${this.screens.error} · Reload to retry`);
    }
  }

  private drawHenry(ctx: CanvasRenderingContext2D): void {
    const name = animationFor(this.player);
    const clip = this.henry.manifest.animations[name];
    const frame = this.henry.manifest.frames[animationFrame(clip, this.elapsed)];
    const offset = this.camera.position;
    ctx.drawImage(this.henry.atlas, frame.x, frame.y, frame.width, frame.height,
      this.player.x - offset.x - this.henry.manifest.anchor.x,
      this.player.y - offset.y + 34 - this.henry.manifest.anchor.y,
      48, 48);
  }

  private drawCelebration(ctx: CanvasRenderingContext2D): void {
    const clip = this.henry.manifest.animations.idle;
    const frame = this.henry.manifest.frames[animationFrame(clip, this.elapsed)];
    const bob = Math.sin(this.elapsed * 10) * 3;
    const x = 213 - this.henry.manifest.anchor.x;
    const y = 164 - this.henry.manifest.anchor.y + bob;
    ctx.drawImage(this.henry.atlas, frame.x, frame.y, frame.width, frame.height, x, y, 48, 48);
    ctx.fillStyle = '#ffda75';
    for (const [starX, starY] of [[174, 158], [252, 150], [269, 181]] as const) {
      ctx.fillRect(starX, starY + Math.round(bob), 4, 4);
      ctx.fillRect(starX + 2, starY - 2 + Math.round(bob), 1, 8);
      ctx.fillRect(starX - 2, starY + 1 + Math.round(bob), 8, 1);
    }
  }

  private panel(ctx: CanvasRenderingContext2D, title: string, subtitle: string): void {
    ctx.fillStyle = '#10252cee';
    ctx.fillRect(44, 66, 338, 92);
    ctx.strokeStyle = '#ffda75';
    ctx.strokeRect(46, 68, 334, 88);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffda75';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(title, 213, 105);
    ctx.fillStyle = '#e9f2df';
    ctx.font = '10px monospace';
    ctx.fillText(subtitle, 213, 130);
    ctx.textAlign = 'left';
  }
}
