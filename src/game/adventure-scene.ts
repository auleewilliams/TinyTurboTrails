import { drawOverworld, MAP_POINTS, TrailSession, type MenuTarget } from './overworld';
import { musicForLevel } from '../core/music';
import type { GameAudio } from '../core/audio';
import type { InputFrame, InputSource } from '../core/input';
import type { Scene } from '../core/scene';
import { animationFrame } from '../art/animation';
import type { HenryAssets } from '../art/henry';
import { hitFlashAtlas } from '../art/hit-flash';
import { drawFacingSprite } from '../art/sprite';
import { animationFor, createPlayer, simulatePlayer, DEFAULT_MOVEMENT, type Facing, type PlatformBody, type Player } from './movement';
import { platformBodiesAt } from './platforms';
import { activeLedgePlatforms, createRun, entityPosition, isEntityActive, recoverFromFall, stepEntities, tickRun, type RunEvent, type RunState } from './interactions';
import { ScreenController } from './screens';
import type { LevelData } from '../world/level';
import { LEVELS } from '../world/levels';
import { Camera } from '../world/camera';
import { drawWorld, drawWorldForeground } from '../world/renderer';
import type { WorldAssetMap, WorldAssets } from '../world/assets';
import { drawGameplayHud, HudPresentation } from './hud';
import { Feedback } from './feedback';

export interface Rect { x: number; y: number; width: number; height: number }

/** Finish-screen composition: title, gem total, celebration band and replay prompt stacked without overlap. */
export const FINISH_LAYOUT = {
  centerX: 213,
  panel: { x: 44, y: 34, width: 338, height: 172 },
  title: { baseline: 66, size: 20 },
  gems: { baseline: 88, size: 10 },
  // Henry's feet rest on this line; the bob keeps his whole frame inside the band.
  celebration: { baseline: 147, bobAmplitude: 3, stars: [[168, 110], [250, 104], [264, 134]] as const },
  actions: { x: 56, y: 161, width: 102, height: 26, spacing: 106 },
  prompt: { baseline: 200, size: 9 },
} as const;

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
  private platforms: PlatformBody[];
  private elapsed = 0;
  private readonly feedback = new Feedback();
  private hud = new HudPresentation();
  private get reducedMotion(): boolean { return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  private events: RunEvent[] = [];
  private selectedIndex: number;
  private selectionDirection = 0;
  readonly session = new TrailSession();
  private finishIndex = 0;
  private menuArmed = true;
  private marker = { x: 48, y: 88 };
  private readonly previews = new Map<string, HTMLCanvasElement>();
  private inputSource: InputSource = 'keyboard';
  constructor(private readonly titleArtwork: HTMLImageElement, private readonly henry: HenryAssets, private readonly worlds: WorldAssetMap, private readonly audio: GameAudio, level: LevelData, private readonly landmarks?: HTMLImageElement, private readonly mapBackground?: HTMLImageElement) {
    const missing = [...new Set(LEVELS.map((candidate) => candidate.atlas))]
      .filter((atlas) => !worlds[atlas]);
    if (missing.length > 0) throw new Error(`Missing world assets: ${missing.join(', ')}`);
    this.level = level;
    const levelIndex = LEVELS.indexOf(level);
    this.selectedIndex = levelIndex >= 0 ? levelIndex : 0;
    this.player = createPlayer(level.start.x, level);
    this.run = createRun(level);
    this.camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
    this.platforms = platformBodiesAt(level.platforms, 0);
  }
  get screenState(): ScreenController['state'] { return this.screens.state; }
  get gemTotal(): number { return this.screens.gems; }
  get specialTotal(): number { return this.run.collectedSpecials.size; }
  get playerX(): number { return this.player.x; }
  get playerY(): number { return this.player.y; }
  get playerVelocityX(): number { return this.player.vx; }
  get playerFacing(): Facing { return this.player.facing; }
  get selectedLevelName(): string { return LEVELS[this.selectedIndex].name; }
  private get world(): WorldAssets { return this.worlds[this.level.atlas]; }
  enter(): void { this.elapsed = 0; }
  exit(): void { this.audio.stop(); }

  update(seconds: number, input: InputFrame): void {
    this.inputSource = input.source ?? 'keyboard';
    this.elapsed += seconds;
    this.session.returnedSeconds = Math.max(0, this.session.returnedSeconds - seconds);
    if (this.screens.state === 'title' || this.screens.state === 'finish') {
      const [x, y] = MAP_POINTS[this.selectedIndex];
      const blend = this.reducedMotion ? 1 : Math.min(1, seconds * 12);
      this.marker.x += (x - this.marker.x) * blend;
      this.marker.y += (y - this.marker.y) * blend;
      if (!this.menuArmed) {
        if (!input.jumpHeld && !input.jumpPressed && input.horizontal === 0) this.menuArmed = true;
        return;
      }
      if (this.screens.state === 'title') this.updateSelection(input.horizontal);
      else {
        const direction = Math.sign(input.horizontal);
        if (direction && direction !== this.selectionDirection) this.finishIndex = (this.finishIndex + direction + this.finishActions.length) % this.finishActions.length;
        this.selectionDirection = direction;
      }
      if (input.jumpPressed) {
        if (this.screens.state === 'title') this.startSelected();
        else this.activateFinish(this.finishActions[this.finishIndex]);
      }
      return;
    }
    this.screens.update(() => this.stepGameplay(seconds, input));
  }

  private stepGameplay(seconds: number, input: InputFrame): void {
    // Platforms advance first: movement then collides with where they are now, not where they were.
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
    if (this.player.x >= this.level.finish.x && this.screens.state === 'playing') {
      this.screens.complete(this.run.collectedGems.size);
      this.session.mark(this.level);
      this.finishIndex = 0;
      this.menuArmed = false;
      this.selectionDirection = 0;
      this.audio.stop();
      this.audio.play('complete');
    }
    this.feedback.consume(this.events, this.level);
    for (const event of this.events) {
      if (event.type === 'gem' || event.type === 'special') this.audio.play('gem');
      else if (event.type === 'checkpoint') this.audio.play('checkpoint');
      else if (event.type === 'spring') this.audio.play('spring');
      else if (event.type === 'damage') this.audio.play('damage');
    }
    this.camera.update(this.player.x, this.player.y);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.screens.state === 'title') { this.drawMap(ctx); return; }
    drawWorld(ctx, this.world, this.level, this.camera,
      (entity) => isEntityActive(this.run, entity.id), (entity) => ({ ...entityPosition(this.run, entity),
        checkpointActive: entity.kind === 'checkpoint' && this.run.checkpointId === entity.id,
        springScale: entity.kind === 'spring' ? this.feedback.springScale(entity.id, this.reducedMotion) : undefined }), this.platforms);
    if (this.screens.state === 'playing') this.drawHenry(ctx);
    drawWorldForeground(ctx, this.world, this.level, this.camera);
    this.feedback.draw(ctx, this.world, this.camera.position, this.reducedMotion);
    if (this.screens.state === 'playing') {
      drawGameplayHud(ctx, this.run, this.hud.hint, this.feedback.checkpointSeconds > 0
        ? 'Checkpoint reached!' : this.hud.locationSeconds > 0 ? this.hud.location : '');
    } else if (this.screens.state === 'finish') {
      this.drawFinish(ctx);
    } else if (this.screens.state === 'error') {
      this.panel(ctx, 'LOADING ERROR', `${this.screens.error} · Reload to retry`);
    }
  }

  private drawMap(ctx: CanvasRenderingContext2D): void {
    drawOverworld(ctx, LEVELS, this.selectedIndex, this.session.completed, this.titleArtwork, this.landmarks, this.preview(), this.mapBackground);
    const target = MAP_POINTS[this.selectedIndex];
    const moving = !this.reducedMotion && Math.hypot(target[0] - this.marker.x, target[1] - this.marker.y) > 2;
    const clip = this.henry.manifest.animations[moving ? 'run' : 'idle'];
    const frame = this.henry.manifest.frames[animationFrame(clip, this.reducedMotion ? 0 : this.elapsed)];
    ctx.drawImage(this.henry.atlas, frame.x, frame.y, frame.width, frame.height,
      Math.round(this.marker.x) - 39, Math.round(this.marker.y) + 4, 28, 28);
    ctx.fillStyle = '#17333b'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(this.inputSource === 'controller' ? 'D-pad / stick: choose   Face button: play' : '← → Choose   Space: play   Click a landmark', 8, 234);
    if (this.session.returnedSeconds > 0) {
      ctx.fillStyle = '#17333b'; ctx.fillText('Trail complete! ✓', 124, 49);
    }
  }

  selectDestination(index: number): void {
    if (this.screens.state === 'title' && LEVELS[index]) this.selectedIndex = index;
  }

  focusFinish(index: number): void {
    if (this.screens.state === 'finish' && this.finishActions[index]) this.finishIndex = index;
  }

  startSelected(): void {
    if (this.screens.state !== 'title') return;
    this.loadLevel(LEVELS[this.selectedIndex]);
    this.selectionDirection = 0;
    this.screens.start(); this.screens.loaded();
    this.audio.startMusic(musicForLevel(this.level.id));
  }

  private get finishActions(): string[] {
    return this.selectedIndex < LEVELS.length - 1 ? ['Replay', 'Next trail', 'Choose trail'] : ['Replay', 'Choose trail'];
  }

  activateFinish(action: string): void {
    if (this.screens.state !== 'finish' || !this.finishActions.includes(action)) return;
    this.screens.replay();
    this.selectionDirection = 0;
    this.menuArmed = false;
    if (action === 'Choose trail') {
      this.session.returnedSeconds = 2;
      this.audio.stop();
    } else {
      if (action === 'Next trail') this.selectedIndex++;
      this.startSelected();
    }
  }

  get menuTargets(): MenuTarget[] {
    if (this.screens.state === 'title') return [
      ...LEVELS.map((level, index) => ({ label: level.name, x: MAP_POINTS[index][0] - 35, y: MAP_POINTS[index][1] - 30,
        description: this.session.completed.has(level.id) ? 'Completed this session' : 'Ready to explore',
        width: 70, height: 60, selected: index === this.selectedIndex, action: () => this.selectDestination(index) })),
      { label: `Play ${this.selectedLevelName}`, x: 298, y: 180, width: 104, height: 27, action: () => this.startSelected() },
    ];
    if (this.screens.state === 'finish') return this.finishActions.map((label, index) => ({
      label, x: FINISH_LAYOUT.actions.x + index * FINISH_LAYOUT.actions.spacing, y: FINISH_LAYOUT.actions.y,
      width: FINISH_LAYOUT.actions.width, height: FINISH_LAYOUT.actions.height, selected: index === this.finishIndex,
      action: () => this.activateFinish(label),
    }));
    return [];
  }

  private preview(): HTMLCanvasElement | undefined {
    if (typeof document === 'undefined') return;
    const level = LEVELS[this.selectedIndex];
    if (!this.previews.has(level.id)) {
      const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
      const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
      const camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
      drawWorld(ctx, this.worlds[level.atlas], level, camera);
      drawWorldForeground(ctx, this.worlds[level.atlas], level, camera);
      this.previews.set(level.id, canvas);
    }
    return this.previews.get(level.id);
  }

  private drawHenry(ctx: CanvasRenderingContext2D): void {
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
  }

  private loadLevel(level: LevelData): void {
    this.audio.stop();
    this.elapsed = 0;
    this.events = [];
    this.feedback.clear();
    this.hud = new HudPresentation();
    this.level = level;
    this.player = createPlayer(level.start.x, level);
    this.run = createRun(level);
    this.camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
    this.platforms = platformBodiesAt(level.platforms, 0);
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
    const { panel, title, gems } = FINISH_LAYOUT;
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
    ctx.fillText(finishGemsText(this.screens.gems), this.run.specialTotal ? 132 : FINISH_LAYOUT.centerX, gems.baseline);
    if (this.run.specialTotal) {
      ctx.fillStyle = '#ffda75';
      ctx.fillText(`STARS ${this.specialTotal}/${this.run.specialTotal}`, 292, gems.baseline);
    }
    this.menuTargets.forEach((target, index) => {
      ctx.fillStyle = index === this.finishIndex ? '#ffda75' : '#34515a';
      ctx.fillRect(target.x, target.y, target.width, target.height);
      ctx.fillStyle = index === this.finishIndex ? '#10252c' : '#e9f2df';
      ctx.font = '10px monospace'; ctx.fillText(target.label, target.x + target.width / 2, target.y + 17);
    });
    ctx.fillStyle = '#e9f2df'; ctx.font = '9px monospace';
    ctx.fillText(this.inputSource === 'controller' ? 'D-pad: choose · Face button: confirm' : '← → Choose · Space: confirm', 213, 200);
    ctx.textAlign = 'left';
    this.drawCelebration(ctx);
  }

  private drawCelebration(ctx: CanvasRenderingContext2D): void {
    const clip = this.henry.manifest.animations.idle;
    const frame = this.henry.manifest.frames[animationFrame(clip, this.reducedMotion ? 0 : this.elapsed)];
    const bob = this.reducedMotion ? 0 : celebrationBob(this.elapsed);
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
