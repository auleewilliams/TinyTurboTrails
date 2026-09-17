import type { GameAudio } from '../core/audio';
import type { InputFrame } from '../core/input';
import type { Scene } from '../core/scene';
import { animationFrame } from '../art/animation';
import type { HenryAssets } from '../art/henry';
import { drawFacingSprite } from '../art/sprite';
import { animationFor, createPlayer, simulatePlayer, DEFAULT_MOVEMENT, type Facing, type Player } from './movement';
import { activateCheckpoint, applySpring, collectGem, createRun, damagePlayer, isEntityActive, recoverFromFall, tickRun, type RunEvent, type RunState } from './interactions';
import { ScreenController } from './screens';
import type { LevelData } from '../world/level';
import { LEVELS } from '../world/levels';
import { Camera } from '../world/camera';
import { drawWorld } from '../world/renderer';
import type { WorldAssets } from '../world/assets';

export interface Rect { x: number; y: number; width: number; height: number }

/** Finish-screen composition: title, gem total, celebration band and replay prompt stacked without overlap. */
export const FINISH_LAYOUT = {
  centerX: 213,
  panel: { x: 44, y: 34, width: 338, height: 172 },
  title: { baseline: 66, size: 20 },
  gems: { baseline: 88, size: 10 },
  // Henry's feet rest on this line; the bob keeps his whole frame inside the band.
  celebration: { baseline: 147, bobAmplitude: 3, stars: [[168, 110], [250, 104], [264, 134]] as const },
  replay: { baseline: 180, size: 10 },
} as const;

export const FINISH_REPLAY_TEXT = 'Press Space to replay';
export const CELEBRATION_SIZE = 48;

export function finishGemsText(gems: number): string {
  return `${gems} ${gems === 1 ? 'gem' : 'gems'} collected`;
}

export function celebrationBob(elapsed: number): number {
  return Math.round(Math.sin(elapsed * 10) * FINISH_LAYOUT.celebration.bobAmplitude);
}

export function celebrationHenryRect(anchor: { x: number; y: number }, bob: number): Rect {
  return {
    x: FINISH_LAYOUT.centerX - anchor.x,
    y: FINISH_LAYOUT.celebration.baseline - anchor.y + bob,
    width: CELEBRATION_SIZE,
    height: CELEBRATION_SIZE,
  };
}

/** Bounding boxes of the 8x8 sparkle stars, which bob with Henry. */
export function celebrationStarRects(bob: number): Rect[] {
  return FINISH_LAYOUT.celebration.stars.map(([x, y]) => ({ x: x - 2, y: y - 2 + bob, width: 8, height: 8 }));
}

export class AdventureScene implements Scene {
  private readonly screens = new ScreenController();
  private level: LevelData;
  private player: Player;
  private run: RunState;
  private camera: Camera;
  private elapsed = 0;
  private events: RunEvent[] = [];
  private selectedIndex = 0;
  private selectionDirection = 0;
  constructor(private readonly henry: HenryAssets, private readonly world: WorldAssets, private readonly audio: GameAudio, level: LevelData) {
    this.level = level;
    this.player = createPlayer(level.start.x, level);
    this.run = createRun(level);
    this.camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
  }
  get screenState(): ScreenController['state'] { return this.screens.state; }
  get gemTotal(): number { return this.screens.gems; }
  get playerX(): number { return this.player.x; }
  get playerY(): number { return this.player.y; }
  get playerVelocityX(): number { return this.player.vx; }
  get playerFacing(): Facing { return this.player.facing; }
  get selectedLevelName(): string { return LEVELS[this.selectedIndex].name; }
  enter(): void { this.elapsed = 0; }
  exit(): void { this.audio.stop(); }

  update(seconds: number, input: InputFrame): void {
    this.elapsed += seconds;
    if (this.screens.state === 'title') {
      this.updateSelection(input.horizontal);
      if (input.jumpPressed) {
        this.loadLevel(LEVELS[this.selectedIndex]);
        this.selectionDirection = 0;
        this.screens.start();
        this.screens.loaded();
      }
      return;
    }
    if (this.screens.state === 'finish') {
      if (input.jumpPressed) {
        this.loadLevel(this.level);
        this.selectionDirection = 0;
        this.screens.replay();
      }
      return;
    }
    this.screens.update(() => this.stepGameplay(seconds, input));
  }

  private stepGameplay(seconds: number, input: InputFrame): void {
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
    if (this.player.x >= this.level.finish.x && this.screens.state === 'playing') {
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
    drawWorld(ctx, this.world, this.level, this.camera, (entity) => isEntityActive(this.run, entity.id));
    if (this.screens.state === 'playing') this.drawHenry(ctx);
    ctx.fillStyle = '#10252cdd';
    ctx.fillRect(5, 5, 205, 25);
    ctx.fillStyle = '#e9f2df';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    if (this.screens.state === 'playing') {
      ctx.fillText(`GEMS ${this.run.collectedGems.size}   CHECKPOINT ${this.run.checkpointId ?? 'START'}`, 10, 16);
      ctx.fillText('Arrows/A-D move · Space jump · Esc pause', 10, 26);
    } else if (this.screens.state === 'title') {
      this.panel(ctx, 'TINY TURBO TRAILS', `◀ ${this.selectedLevelName} ▶`);
      ctx.fillStyle = '#e9f2df';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Press Space to start', 213, 150);
      ctx.textAlign = 'left';
    } else if (this.screens.state === 'finish') {
      this.drawFinish(ctx);
    } else if (this.screens.state === 'error') {
      this.panel(ctx, 'LOADING ERROR', `${this.screens.error} · Reload to retry`);
    }
  }

  private drawHenry(ctx: CanvasRenderingContext2D): void {
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
  }

  private loadLevel(level: LevelData): void {
    this.level = level;
    this.player = createPlayer(level.start.x, level);
    this.run = createRun(level);
    this.camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
  }

  private updateSelection(horizontal: number): void {
    const direction = Math.sign(horizontal);
    if (direction === 0) {
      this.selectionDirection = 0;
      return;
    }
    if (direction === this.selectionDirection) return;
    this.selectedIndex = (this.selectedIndex + direction + LEVELS.length) % LEVELS.length;
    this.selectionDirection = direction;
  }

  private drawFinish(ctx: CanvasRenderingContext2D): void {
    const { panel, title, gems, replay } = FINISH_LAYOUT;
    ctx.fillStyle = '#10252cee';
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    ctx.strokeStyle = '#ffda75';
    ctx.strokeRect(panel.x + 2, panel.y + 2, panel.width - 4, panel.height - 4);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffda75';
    ctx.font = `bold ${title.size}px monospace`;
    ctx.fillText('TRAIL COMPLETE!', FINISH_LAYOUT.centerX, title.baseline);
    ctx.fillStyle = '#e9f2df';
    ctx.font = `${gems.size}px monospace`;
    ctx.fillText(finishGemsText(this.screens.gems), FINISH_LAYOUT.centerX, gems.baseline);
    ctx.font = `${replay.size}px monospace`;
    ctx.fillText(FINISH_REPLAY_TEXT, FINISH_LAYOUT.centerX, replay.baseline);
    ctx.textAlign = 'left';
    this.drawCelebration(ctx);
  }

  private drawCelebration(ctx: CanvasRenderingContext2D): void {
    const clip = this.henry.manifest.animations.idle;
    const frame = this.henry.manifest.frames[animationFrame(clip, this.elapsed)];
    const bob = celebrationBob(this.elapsed);
    const henry = celebrationHenryRect(this.henry.manifest.anchor, bob);
    ctx.drawImage(this.henry.atlas, frame.x, frame.y, frame.width, frame.height, henry.x, henry.y, henry.width, henry.height);
    ctx.fillStyle = '#ffda75';
    for (const star of celebrationStarRects(bob)) {
      ctx.fillRect(star.x + 2, star.y + 2, 4, 4);
      ctx.fillRect(star.x + 4, star.y, 1, 8);
      ctx.fillRect(star.x, star.y + 3, 8, 1);
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
