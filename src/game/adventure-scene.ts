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
import { CompletionCelebration, celebrationJump, celebrationSparkles } from './celebration';
import { StoryBook, drawStory, drawStoryPicture, STORY_DESCRIPTIONS } from './story';

export interface Rect { x: number; y: number; width: number; height: number }

/** Finish-screen composition: title, gem total, celebration band and replay prompt stacked without overlap. */
export const FINISH_LAYOUT = {
  centerX: 213,
  panel: { x: 44, y: 24, width: 338, height: 196 },
  title: { baseline: 52, size: 20 },
  gems: { baseline: 76, size: 10 },
  // Fixed feet anchor; the jump and bounded sparkles stay below results.
  celebration: { baseline: 147 },
  payoff: { x: 68, y: 86, width: 105, height: 70 },
  actions: { x: 56, y: 177, width: 102, height: 26, spacing: 106 },
  prompt: { baseline: 214, size: 9 },
} as const;

export const CELEBRATION_SIZE = 48;

/** Collected against the trail's total, in the same shape as the star result. */
export function finishGemsText(gems: number, total: number): string {
  return `GEMS ${gems}/${total}`;
}

export function celebrationHenryRect(anchor: { x: number; y: number }, jump: number): Rect {
  return { x: 280 - anchor.x, y: FINISH_LAYOUT.celebration.baseline - anchor.y + jump,
    width: CELEBRATION_SIZE, height: CELEBRATION_SIZE };
}

export function celebrationStarRects(seconds: number, reduced = false): Rect[] {
  return celebrationSparkles(seconds, reduced).map(({ x, y, size }) => ({ x: x - size, y: y - size, width: size * 2, height: size * 2 }));
}

export class AdventureScene implements Scene {
  private readonly screens = new ScreenController();
  private level: LevelData;
  private player: Player;
  private run: RunState;
  private camera: Camera;
  private platforms: PlatformBody[];
  private elapsed = 0;
  private readonly celebration = new CompletionCelebration();
  private readonly story = new StoryBook();
  private storyDirection = 0;
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
  constructor(private readonly titleArtwork: HTMLImageElement, private readonly henry: HenryAssets, private readonly worlds: WorldAssetMap, private readonly audio: GameAudio, level: LevelData, private readonly landmarks?: HTMLImageElement, private readonly mapBackground?: HTMLImageElement, private readonly storyArtwork?: HTMLImageElement) {
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
  get screenState(): ScreenController['state'] | 'story' { return this.storyArtwork && this.story.active ? 'story' : this.screens.state; }
  get storyDescription(): string { return this.screenState === 'story' ? STORY_DESCRIPTIONS[this.story.page] : ''; }
  get gemTotal(): number { return this.screens.gems; }
  get trailGemTotal(): number { return this.run.gemTotal; }
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
    if (this.screenState === 'story') {
      if (!this.menuArmed) {
        if (!input.jumpHeld && !input.jumpPressed && input.horizontal === 0 && !input.storyPressed) this.menuArmed = true;
        return;
      }
      const direction = Math.sign(input.horizontal);
      if (direction && direction !== this.storyDirection) this.story.selected = (this.story.selected + direction + 3) % 3;
      this.storyDirection = direction;
      if (input.jumpPressed) this.activateStory(this.story.selected);
      return;
    }
    if (input.storyPressed && this.storyArtwork && (this.screens.state === 'title' || (this.screens.state === 'finish' && this.level.id === LEVELS[0].id))) {
      this.openStory(this.screens.state === 'finish'); return;
    }
    if (this.screens.state === 'finish') this.celebration.update(seconds);
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
      this.celebration.reset();
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
    if (this.screenState === 'story' && this.storyArtwork) { drawStory(ctx, this.storyArtwork, this.story, this.inputSource === 'controller'); return; }
    if (this.screens.state === 'title') { this.drawMap(ctx); return; }
    drawWorld(ctx, this.world, this.level, this.camera,
      (entity) => isEntityActive(this.run, entity.id), (entity) => ({ ...entityPosition(this.run, entity),
        checkpointActive: entity.kind === 'checkpoint' && this.run.checkpointId === entity.id,
        springScale: entity.kind === 'spring' ? this.feedback.springScale(entity.id, this.reducedMotion) : undefined }), this.platforms);
    if (this.screens.state === 'playing') this.drawHenry(ctx);
    drawWorldForeground(ctx, this.world, this.level, this.camera);
    this.feedback.draw(ctx, this.world, this.camera.position, this.reducedMotion);
    if (this.screens.state === 'playing') {
      // A quiet picture sign near the start, outside the HUD and running line.
      if (this.storyArtwork && this.level.id === LEVELS[0].id && this.player.x < 260) {
        drawStoryPicture(ctx, this.storyArtwork, 2, 322, 40, 96, 64);
        ctx.fillStyle = '#ffda75'; ctx.font = 'bold 16px monospace'; ctx.fillText('→', 402, 119);
      }
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
    if (this.storyArtwork) {
      ctx.fillStyle = '#17333b'; ctx.fillRect(367, 7, 47, 29);
      ctx.fillStyle = '#ffda75'; ctx.font = 'bold 22px monospace'; ctx.fillText('↶', 382, 29);
      ctx.font = '8px monospace'; ctx.fillStyle = '#17333b';
      ctx.fillText(this.inputSource === 'controller' ? 'View' : 'R', 381, 44);
      // The selected Plains thumbnail pictures the same neighbour and arch as the opening.
      if (this.selectedIndex === 0) drawStoryPicture(ctx, this.storyArtwork, 2, 287, 79, 126, 84);
    }
    if (this.session.returnedSeconds > 0) {
      ctx.fillStyle = '#17333b'; ctx.fillText('Trail complete! ✓', 124, 49);
    }
  }

  selectDestination(index: number): void {
    if (this.screenState === 'title' && LEVELS[index]) this.selectedIndex = index;
  }

  focusFinish(index: number): void {
    if (this.screens.state === 'finish' && this.finishActions[index]) this.finishIndex = index;
  }

  startSelected(): void {
    if (this.screenState !== 'title') return;
    this.loadLevel(LEVELS[this.selectedIndex]);
    this.selectionDirection = 0;
    this.screens.start(); this.screens.loaded();
    this.audio.startMusic(musicForLevel(this.level.id));
  }

  private get finishActions(): string[] {
    return this.selectedIndex < LEVELS.length - 1 ? ['Replay', 'Next trail', 'Choose trail'] : ['Replay', 'Choose trail'];
  }

  activateFinish(action: string): void {
    if (this.screenState !== 'finish' || !this.finishActions.includes(action)) return;
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

  private openStory(payoff = false): void {
    this.story.open(payoff); this.menuArmed = false; this.storyDirection = 0;
  }

  private activateStory(index: number): void {
    this.story.selected = index;
    this.story.targets[index]?.action();
    this.menuArmed = false; this.storyDirection = 0;
  }

  get menuTargets(): MenuTarget[] {
    if (this.screenState === 'story') return this.story.targets.map((target, index) => ({ ...target, action: () => this.activateStory(index) }));
    if (this.screens.state === 'title') return [
      ...LEVELS.map((level, index) => ({ label: level.name, x: MAP_POINTS[index][0] - 35, y: MAP_POINTS[index][1] - 30,
        description: this.session.completed.has(level.id) ? 'Completed this session' : 'Ready to explore',
        width: 70, height: 60, selected: index === this.selectedIndex, action: () => this.selectDestination(index) })),
      { label: `Play ${this.selectedLevelName}`, x: 298, y: 180, width: 104, height: 27, action: () => this.startSelected() },
      ...(this.storyArtwork ? [{ label: 'Replay story', nativeSpace: true, description: 'Pictures • R key or controller View button', x: 367, y: 7, width: 47, height: 29, action: () => this.openStory() }] : []),
    ];
    if (this.screens.state === 'finish') return [...this.finishActions.map((label, index) => ({
      label, x: FINISH_LAYOUT.actions.x + index * FINISH_LAYOUT.actions.spacing, y: FINISH_LAYOUT.actions.y,
      width: FINISH_LAYOUT.actions.width, height: FINISH_LAYOUT.actions.height, selected: index === this.finishIndex,
      action: () => this.activateFinish(label),
    })), ...(this.storyArtwork && this.level.id === LEVELS[0].id ? [{ label: 'View reunion picture', nativeSpace: true, description: 'R key or controller View button', ...FINISH_LAYOUT.payoff, action: () => this.openStory(true) }] : [])];
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
    this.celebration.reset();
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
    ctx.fillText(finishGemsText(this.screens.gems, this.run.gemTotal), this.run.specialTotal ? 132 : FINISH_LAYOUT.centerX, gems.baseline);
    if (this.run.specialTotal) {
      ctx.fillStyle = '#ffda75';
      ctx.fillText(`STARS ${this.specialTotal}/${this.run.specialTotal}`, 292, gems.baseline);
    }
    this.menuTargets.slice(0, this.finishActions.length).forEach((target, index) => {
      ctx.fillStyle = index === this.finishIndex ? '#ffda75' : '#34515a';
      ctx.fillRect(target.x, target.y, target.width, target.height);
      ctx.fillStyle = index === this.finishIndex ? '#10252c' : '#e9f2df';
      // Large symbols and short labels survive the 320px fractional downscale.
      ctx.font = 'bold 18px monospace';
      if (target.label === 'Choose trail') {
        for (const [dx, dy] of [[0, 0], [7, 0], [0, 7], [7, 7]]) ctx.fillRect(target.x + 9 + dx, target.y + 7 + dy, 5, 5);
      } else ctx.fillText(target.label === 'Replay' ? '↶' : '▶', target.x + 15, target.y + 19);
      ctx.font = 'bold 12px monospace';
      ctx.fillText(target.label === 'Next trail' ? 'Next' : target.label === 'Choose trail' ? 'Trails' : 'Replay', target.x + 61, target.y + 18);
    });
    ctx.fillStyle = '#e9f2df'; ctx.font = '9px monospace';
    ctx.fillText(this.inputSource === 'controller' ? 'D-pad + Face' + (this.level.id === LEVELS[0].id ? ' · View: picture' : '') : '← → + Space' + (this.level.id === LEVELS[0].id ? ' · R: picture' : ''), 213, 214);
    ctx.textAlign = 'left';
    if (this.storyArtwork && this.level.id === LEVELS[0].id) {
      const { x, y, width, height } = FINISH_LAYOUT.payoff;
      drawStoryPicture(ctx, this.storyArtwork, 3, x, y, width, height);
      ctx.fillStyle = '#ffda75'; ctx.font = '12px monospace'; ctx.fillText('⊕', x + width - 11, y + height - 2);
    } else if (this.landmarks) {
      const w = this.landmarks.naturalWidth / 3, h = this.landmarks.naturalHeight / 2;
      ctx.drawImage(this.landmarks, this.selectedIndex % 3 * w, Math.floor(this.selectedIndex / 3) * h, w, h, 88, 90, 80, 66);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#e9f2df'; ctx.font = '10px monospace';
    ctx.fillText(this.level.id === LEVELS[0].id ? 'You reached our friend!' : 'Another trail explored!', 213, 169);
    ctx.textAlign = 'left';
    this.drawCelebration(ctx);
  }

  private drawCelebration(ctx: CanvasRenderingContext2D): void {
    const frame = this.henry.manifest.frames[this.celebration.frame(this.henry.manifest, this.reducedMotion)];
    const bob = celebrationJump(this.celebration.seconds, this.reducedMotion);
    const henry = celebrationHenryRect(this.henry.manifest.anchor, bob);
    ctx.drawImage(this.henry.atlas, frame.x, frame.y, frame.width, frame.height, henry.x, henry.y, henry.width, henry.height);
    ctx.fillStyle = '#ffda75';
    for (const star of celebrationStarRects(this.celebration.seconds, this.reducedMotion)) {
      ctx.fillRect(star.x + star.width / 2, star.y, 1, star.height);
      ctx.fillRect(star.x, star.y + star.height / 2, star.width, 1);
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
