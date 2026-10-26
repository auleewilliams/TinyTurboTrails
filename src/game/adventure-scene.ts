import { EducationOverlay } from './education-overlay';
import { EducationSession, TRAIL_WORDS, letterSupportY } from './education';
import { drawLetterTile, type SpellingAssets } from '../art/spelling';
import { drawKitButton, drawKitFrame, type InterfaceKit } from '../art/interface-kit';
import { advanceMapMarker, drawOverworld, MAP_POINTS, OVERWORLD_LAYOUT, TrailSession, type MenuTarget } from './overworld';
import { musicForLevel } from '../core/music';
import type { GameAudio } from '../core/audio';
import type { GameRumble } from '../core/rumble';
import { FootstepCadence, isMeaningfulLanding } from './movement-audio';
import type { InputFrame, InputSource } from '../core/input';
import type { Scene } from '../core/scene';
import { animationFrame } from '../art/animation';
import type { HenryAssets } from '../art/henry';
import { hitFlashAtlas } from '../art/hit-flash';
import { drawFacingSprite } from '../art/sprite';
import { animationFor, createPlayer, simulatePlayer, surfaceY, DEFAULT_MOVEMENT, type Facing, type PlatformBody, type Player } from './movement';
import { platformBodiesAt } from './platforms';
import { activeLedgePlatforms, createRun, entityPosition, isEntityActive, recoverFromFall, stepEntities, tickRun, type RunEvent, type RunState } from './interactions';
import { ScreenController } from './screens';
import type { LevelData } from '../world/level';
import { LEVELS } from '../world/levels';
import { Camera } from '../world/camera';
import { drawWorld, drawWorldForeground } from '../world/renderer';
import type { WorldAssetMap, WorldAssets } from '../world/assets';
import { drawCollectionBag, drawGameplayHud, HudPresentation } from './hud';
import { Feedback } from './feedback';
import { CompletionCelebration, celebrationJump, celebrationSparkles } from './celebration';

export interface Rect { x: number; y: number; width: number; height: number }

/** Finish-screen composition: title, gem total, celebration band and action prompt stacked without overlap. */
export const FINISH_LAYOUT = {
  centerX: 213,
  // Wide enough for four 12 px labels in one row inside the panel's 10 px timber frame.
  panel: { x: 16, y: 16, width: 394, height: 212 },
  title: { baseline: 52, size: 20 },
  gems: { baseline: 76, size: 10 },
  // Fixed feet anchor; the jump and bounded sparkles stay below results.
  celebration: { baseline: 147 },
  landmark: { x: 88, y: 90, width: 80, height: 66 },
  actions: { y: 177, height: 26, gap: 4 },
  prompt: { baseline: 214, size: 9 },
} as const;

export const CELEBRATION_SIZE = 48;

/** Results actions in navigation order; the first is the default (Next trail, or Map on the final trail). */
export type FinishAction = 'Next trail' | 'Map' | 'Build your word' | 'Replay';
/** Icon actions keep the existing symbol at x + 15 and a 12 px label from x + 24; Build your word is a centred label. */
export const FINISH_ACTION_WIDTHS: Readonly<Record<FinishAction, number>> = { 'Next trail': 104, Map: 54, 'Build your word': 124, Replay: 76 };

/** One centred row; widths fit each full label within the button's 6 px quiet interior. */
export function finishActionRects(actions: readonly FinishAction[]): Rect[] {
  const { y, height, gap } = FINISH_LAYOUT.actions;
  const total = actions.reduce((sum, action) => sum + FINISH_ACTION_WIDTHS[action], 0) + gap * (actions.length - 1);
  let x = FINISH_LAYOUT.centerX - Math.round(total / 2);
  return actions.map(action => {
    const rect = { x, y, width: FINISH_ACTION_WIDTHS[action], height };
    x += rect.width + gap;
    return rect;
  });
}

/** Collected against the trail's total, in the same shape as the star result. */
export function finishGemsText(gems: number, total: number): string {
  return `GEMS ${gems}/${total}`;
}

export function celebrationHenryRect(anchor: { x: number; y: number }, jump: number): Rect {
  return { x: 280 - anchor.x, y: FINISH_LAYOUT.celebration.baseline - anchor.y + jump,
    width: CELEBRATION_SIZE, height: CELEBRATION_SIZE };
}

/** Results panel and action backings; labels and icons are drawn separately on top. */
export function drawFinishChrome(ctx: CanvasRenderingContext2D, ui: InterfaceKit | undefined, actions: readonly MenuTarget[]): void {
  const { panel } = FINISH_LAYOUT;
  drawKitFrame(ctx, ui, 'panel', panel.x, panel.y, panel.width, panel.height, { fill: '#10252cee' });
  if (!ui) { ctx.strokeStyle = '#ffda75'; ctx.strokeRect(panel.x + 2, panel.y + 2, panel.width - 4, panel.height - 4); }
  for (const target of actions) drawKitButton(ctx, ui, target, { fill: '#34515a', selectedFill: '#ffda75' });
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
  private readonly feedback = new Feedback();
  private readonly footsteps = new FootstepCadence();
  private hud = new HudPresentation();
  private get reducedMotion(): boolean { return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  private events: RunEvent[] = [];
  private selectedIndex: number;
  private selectionDirection = 0;
  readonly session = new TrailSession();
  readonly education = new EducationSession();
  private letterFlights: { letter: string; x: number; y: number; age: number }[] = [];
  readonly educationOverlay: EducationOverlay;
  private get hasWordActivity(): boolean { return TRAIL_WORDS.some(config => config.id === this.level.id); }
  get educationDescription(): string {
    if (this.educationOverlay.open) return this.educationOverlay.description;
    if (!this.hasWordActivity || this.screenState !== 'playing') return '';
    return `Letter bag: ${this.education.letterCount}/4${this.letterFlights.length ? ` · ${this.letterFlights.at(-1)!.letter} → bag` : ''}`;
  }
  private finishIndex = 0;
  private finishArmed = true;
  private menuArmed = true;
  private marker = { x: 48, y: 88 };
  private readonly previews = new Map<string, HTMLCanvasElement>();
  private inputSource: InputSource = 'keyboard';
  constructor(private readonly titleArtwork: HTMLImageElement, private readonly henry: HenryAssets, private readonly worlds: WorldAssetMap, private readonly audio: GameAudio, level: LevelData, private readonly landmarks?: HTMLImageElement, private readonly mapBackground?: HTMLImageElement, private readonly rumble?: GameRumble, private readonly spelling?: SpellingAssets, private readonly ui?: InterfaceKit) {
    this.educationOverlay = new EducationOverlay(this.education, spelling, ui);
    const missing = [...new Set(LEVELS.map((candidate) => candidate.atlas))]
      .filter((atlas) => !worlds[atlas]);
    if (missing.length > 0) throw new Error(`Missing world assets: ${missing.join(', ')}`);
    this.level = level;
    if (this.hasWordActivity) this.education.selectTrail(level.id);
    const levelIndex = LEVELS.indexOf(level);
    this.selectedIndex = levelIndex >= 0 ? levelIndex : 0;
    this.player = createPlayer(level.start.x, level, level.start.y);
    this.run = createRun(level);
    this.camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height, vertical: level.progressAxis === 'y' });
    this.platforms = platformBodiesAt(level.platforms, 0);
  }
  get screenState(): ScreenController['state'] { return this.screens.state; }
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
  exit(): void { this.audio.stop(); this.rumble?.stop(); }

  update(seconds: number, input: InputFrame): void {
    if (this.educationOverlay.open) return;
    this.inputSource = input.source ?? 'keyboard';
    if (this.screens.state === 'finish') this.celebration.update(seconds);
    this.elapsed += seconds;
    this.session.returnedSeconds = Math.max(0, this.session.returnedSeconds - seconds);
    if (this.screens.state === 'title' || this.screens.state === 'finish') {
      advanceMapMarker(this.marker, MAP_POINTS[this.selectedIndex], seconds, this.reducedMotion);
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
    this.letterFlights = this.letterFlights.filter(flight => (flight.age += step) < 0.65);
    this.platforms = platformBodiesAt(this.level.platforms, this.run.seconds, step);
    const previousPosition = { x: this.player.x, y: this.player.y };
    const wasGrounded = this.player.onGround;
    const previousVelocityY = this.player.vy;
    const trajectory = simulatePlayer(this.player, input, this.level, seconds, [...this.platforms, ...activeLedgePlatforms(this.run, this.level)]);
    if (previousVelocityY >= 0 && this.player.vy < -DEFAULT_MOVEMENT.jumpVelocity * 0.75) this.audio.play('jump');
    this.events = [];
    stepEntities(this.run, this.level, this.player, seconds, this.events, previousPosition, trajectory);
    if (!this.events.some(event => event.type === 'recover') && isMeaningfulLanding(wasGrounded, previousVelocityY, this.player)) {
      this.feedback.add('landing', this.player.x, this.player.y + DEFAULT_MOVEMENT.height);
      this.audio.play('landing');
    }
    if (this.player.y > this.level.height + 80) recoverFromFall(this.run, this.player, this.events, this.level);
    if (!wasGrounded || this.events.some(event => event.type === 'recover' || event.type === 'damage' || event.type === 'spring')) this.footsteps.reset();
    else if (this.footsteps.step(step, this.player, previousPosition.x)) this.audio.play('footstep');
    if (this.player.x < this.level.finish.x - 70) this.finishArmed = true;
    if (this.finishArmed && this.player.x >= this.level.finish.x && this.screens.state === 'playing'
      && (!this.level.finish.supportOnly || (this.player.onGround
        && Math.abs(this.player.y + DEFAULT_MOVEMENT.height - this.level.finish.y) < 2))) {
      this.screens.complete(this.run.collectedGems.size);
      this.celebration.reset();
      this.session.mark(this.level, this.run.collectedGems.size, this.run.collectedSpecials.size);
      this.finishIndex = 0;
      this.menuArmed = false;
      this.selectionDirection = 0;
      this.audio.stop();
      this.rumble?.stop();
      this.audio.play('complete');
    }
    this.feedback.consume(this.events, this.level);
    this.hud.consume(this.events);
    if (this.events.some(event => event.type === 'squash')) this.audio.play('squash');
    for (const event of this.events) {
      if (event.type === 'gem' || event.type === 'special') this.audio.play('gem');
      else if (event.type === 'checkpoint') this.audio.play('checkpoint');
      else if (event.type === 'spring') this.audio.play('spring');
      else if (event.type === 'damage') this.audio.play('damage');
      if (this.screens.state === 'playing') {
        if (event.type === 'special') this.rumble?.play('star');
        else if (event.type === 'spring' || event.type === 'damage') this.rumble?.play(event.type);
      }
    }
    if (this.hasWordActivity) for (const letter of this.education.pickups) {
      if (Math.abs(this.player.x - letter.x) <= 22 && Math.abs(this.player.y + 17 - (letterSupportY(letter, this.level) - 20)) <= 24 && this.education.collect(letter.id)) {
        this.letterFlights.push({ letter: letter.letter, x: letter.x - this.camera.position.x,
          y: letterSupportY(letter, this.level) - 20 - this.camera.position.y, age: 0 });
      }
    }
    this.hud.update(step, input, this.level, this.player.x, this.feedback.checkpointSeconds > 0
      || this.run.invulnerableSeconds > 0 || this.letterFlights.length > 0
      || this.feedback.effects.some(effect => effect.kind !== 'landing'), this.player.y + DEFAULT_MOVEMENT.height);
    this.camera.update(this.player.x, this.player.y);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.screens.state === 'title') {
      this.drawMap(ctx);
      if (this.educationOverlay.open) this.educationOverlay.draw(ctx);
      return;
    }
    drawWorld(ctx, this.world, this.level, this.camera,
      (entity) => isEntityActive(this.run, entity.id), (entity) => ({ ...entityPosition(this.run, entity),
        checkpointActive: entity.kind === 'checkpoint' && this.run.checkpointId === entity.id,
        springScale: entity.kind === 'spring' ? this.feedback.springScale(entity.id, this.reducedMotion) : undefined }), this.platforms,
      this.run.seconds, this.reducedMotion);
    if (this.screens.state === 'playing') { this.drawLetters(ctx); this.drawHenry(ctx); }
    drawWorldForeground(ctx, this.world, this.level, this.camera);
    this.feedback.draw(ctx, this.world, this.camera.position, this.reducedMotion);
    if (this.screens.state === 'playing') {
      drawGameplayHud(ctx, this.run, this.hud.hint, this.feedback.checkpointSeconds > 0
        ? 'Checkpoint reached!' : this.hud.locationSeconds > 0 ? this.hud.location : '', this.hud.progress(this.level, this.player.x, this.player.y + DEFAULT_MOVEMENT.height), this.ui);
      this.drawWordProgress(ctx);
      if (this.educationOverlay.open) this.educationOverlay.draw(ctx);
    } else if (this.screens.state === 'finish') {
      this.drawFinish(ctx);
      if (this.educationOverlay.open) this.educationOverlay.draw(ctx);
    } else if (this.screens.state === 'error') {
      this.panel(ctx, 'LOADING ERROR', `${this.screens.error} · Reload to retry`);
    }
  }

  private retraceFromFinish(): void {
    if (this.screens.state !== 'finish') return;
    this.finishArmed = false;
    this.screens.retrace();
    const x = this.level.retrace?.x ?? this.level.finish.x - 28;
    const supportY = this.level.retrace?.y ?? surfaceY(this.level, x);
    Object.assign(this.player, { x, y: supportY - DEFAULT_MOVEMENT.height, vx: 0, vy: 0, onGround: true,
      coyoteSeconds: DEFAULT_MOVEMENT.coyoteSeconds, jumpBufferSeconds: 0, squashBounce: false,
      platformId: null, groundVelocityX: 0 });
    this.camera.update(this.player.x, this.player.y);
    this.audio.startMusic(musicForLevel(this.level.id));
  }

  handleEducationInput(input: InputFrame): void {
    if (this.educationOverlay.open) this.educationOverlay.update(input);
    else if (input.activityPressed && this.screenState === 'title') this.educationOverlay.showStickers();
  }

  private drawLetters(ctx: CanvasRenderingContext2D): void {
    if (!this.hasWordActivity) return;
    ctx.save(); ctx.textAlign = 'center';
    ctx.font = 'bold 16px monospace';
    for (const letter of this.education.pickups) {
      if (this.education.hasLetter(letter.id)) continue;
      const x = Math.round(letter.x - this.camera.position.x), y = Math.round(letterSupportY(letter, this.level) - 32 - this.camera.position.y);
      drawLetterTile(ctx, this.spelling?.tile, letter.letter, x - 11, y, 22, 24);
    }
    ctx.restore();
  }

  private drawWordProgress(ctx: CanvasRenderingContext2D): void {
    if (!this.hasWordActivity) return;
    ctx.save();
    drawCollectionBag(ctx, this.education, this.spelling?.pouch, this.ui);
    for (const flight of this.letterFlights) {
      const t = flight.age / 0.65;
      const x = this.reducedMotion ? 342 : flight.x + (342 - flight.x) * t;
      const y = this.reducedMotion ? 74 : flight.y + (44 - flight.y) * t - Math.sin(t * Math.PI) * 25;
      ctx.globalAlpha = 1 - t * 0.5;
      drawLetterTile(ctx, this.spelling?.tile, flight.letter, x - 11, y - 18, 22, 24);
    }
    ctx.restore();
  }

  private drawMap(ctx: CanvasRenderingContext2D): void {
    drawOverworld(ctx, LEVELS, this.selectedIndex, this.session.results, this.titleArtwork, this.world.gems, this.landmarks, this.preview(), this.mapBackground, this.ui);
    const target = MAP_POINTS[this.selectedIndex];
    const moving = !this.reducedMotion && Math.hypot(target[0] - this.marker.x, target[1] - this.marker.y) > 2;
    const clip = this.henry.manifest.animations[moving ? 'run' : 'idle'];
    const frame = this.henry.manifest.frames[animationFrame(clip, this.reducedMotion ? 0 : this.elapsed)];
    ctx.drawImage(this.henry.atlas, frame.x, frame.y, frame.width, frame.height,
      Math.round(this.marker.x) - 39, Math.round(this.marker.y) + 4, 28, 28);
    ctx.fillStyle = '#17333b'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(this.inputSource === 'controller' ? 'D-pad: choose · Buttons 1–4: play' : '← → Choose · Space: play · Click trail', 8, 234);
    // Both lines sit inside the plank's quiet face (x 288-355, y 13-30), including the ↑ descent.
    ctx.fillStyle = '#ffda75'; ctx.font = 'bold 9px monospace'; ctx.fillText('STICKERS', 288, 20);
    ctx.font = '8px monospace'; ctx.fillText(`${this.education.stickers.length}/${TRAIL_WORDS.length} · ${this.inputSource === 'controller' ? 'D-pad ↑' : 'E/click'}`, 288, 28);
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

  /** The final trail has no successor: Map is its default, without wrapping to a new progression. */
  private get finishActions(): FinishAction[] {
    return [...this.selectedIndex < LEVELS.length - 1 ? ['Next trail' as const] : [], 'Map',
      ...this.hasWordActivity ? ['Build your word' as const] : [], 'Replay'];
  }

  /** Leaving the activity restores the default action and waits for every held control to release. */
  private restoreFinishDefault(): void {
    if (this.screens.state !== 'finish') return;
    this.finishIndex = 0;
    this.selectionDirection = 0;
    this.menuArmed = false;
  }

  returnToTrails(): void {
    if (this.screenState !== 'playing') return;
    this.loadLevel(this.level);
    this.screens.leave();
    this.selectionDirection = 0;
    // The pause return clears BrowserInput before exposing the map. Its release
    // guard filters held controls, so a fresh action can start immediately.
    this.menuArmed = true;
    this.session.returnedSeconds = 0;
  }

  activateFinish(action: string): void {
    if (this.screenState !== 'finish' || this.educationOverlay.open || !(this.finishActions as string[]).includes(action)) return;
    this.selectionDirection = 0;
    this.menuArmed = false;
    if (action === 'Build your word') {
      // Optional and deliberate: the finished run, results and celebration stay underneath, frozen.
      this.educationOverlay.showAssembly(() => this.retraceFromFinish(), () => this.restoreFinishDefault());
      return;
    }
    this.screens.replay();
    if (action === 'Map') {
      this.session.returnedSeconds = 2;
      this.audio.stop();
    } else {
      if (action === 'Next trail') this.selectedIndex++;
      this.startSelected();
    }
  }

  get menuTargets(): MenuTarget[] {
    if (this.educationOverlay.open) return this.educationOverlay.targets;
    if (this.screens.state === 'title') return [
      ...LEVELS.map((level, index) => ({ label: level.name, x: MAP_POINTS[index][0] - 35, y: MAP_POINTS[index][1] - 30,
        description: this.session.description(level),
        width: 70, height: 73, selected: index === this.selectedIndex, action: () => this.selectDestination(index) })),
      { label: `Play ${this.selectedLevelName}`, ...OVERWORLD_LAYOUT.play, action: () => this.startSelected() },
      { label: 'Open stickers', nativeSpace: true, description: `${this.education.stickers.length} of ${TRAIL_WORDS.length} stickers · E or controller D-pad up`,
        ...OVERWORLD_LAYOUT.stickers, action: () => this.educationOverlay.showStickers() },
    ];
    if (this.screens.state === 'finish') return this.finishTargets;
    return [];
  }

  /** Results actions, independent of any activity drawn over the finish screen. */
  private get finishTargets(): MenuTarget[] {
    const rects = finishActionRects(this.finishActions);
    return this.finishActions.map((label, index) => ({
      label, ...rects[index], selected: index === this.finishIndex,
      // Focused results buttons act once on a fresh Space/Enter; held repeats and keyups never act.
      nativeSpace: true, action: () => this.activateFinish(label),
    }));
  }

  private preview(): HTMLCanvasElement | undefined {
    if (typeof document === 'undefined') return;
    const level = LEVELS[this.selectedIndex];
    if (!this.previews.has(level.id)) {
      const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
      const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
      const camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height, vertical: level.progressAxis === 'y' });
      // The selected Quarry preview begins at its rim and renders the same fixed
      // shelves that support Henry; a zero-time snapshot keeps lifts deterministic.
      if (level.progressAxis === 'y') camera.update(level.start.x, level.start.y - 34);
      // A cached map thumbnail stays clear; ambient motion belongs to the run.
      drawWorld(ctx, this.worlds[level.atlas], level, camera, undefined, undefined,
        platformBodiesAt(level.platforms, 0), 0, true);
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
    this.rumble?.stop();
    this.educationOverlay.close();
    this.elapsed = 0;
    this.finishArmed = true;
    this.celebration.reset();
    this.events = [];
    this.feedback.clear();
    this.letterFlights = [];
    this.footsteps.reset();
    this.hud = new HudPresentation();
    this.level = level;
    if (this.hasWordActivity) this.education.selectTrail(level.id);
    this.player = createPlayer(level.start.x, level, level.start.y);
    this.run = createRun(level);
    this.camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height, vertical: level.progressAxis === 'y' });
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
    const { title, gems } = FINISH_LAYOUT;
    const actions = this.finishTargets;
    drawFinishChrome(ctx, this.ui, actions);
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
    actions.forEach((target, index) => {
      ctx.fillStyle = index === this.finishIndex ? '#10252c' : '#e9f2df';
      // Large symbols and full 12 px labels survive the 320px fractional downscale.
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      if (target.label === 'Map') {
        for (const [dx, dy] of [[0, 0], [7, 0], [0, 7], [7, 7]]) ctx.fillRect(target.x + 9 + dx, target.y + 7 + dy, 5, 5);
      } else if (target.label !== 'Build your word') ctx.fillText(target.label === 'Replay' ? '↶' : '▶', target.x + 15, target.y + 19);
      ctx.font = 'bold 12px monospace';
      // The rendered label is the accessible name and the input target's label.
      if (target.label === 'Build your word') ctx.fillText(target.label, target.x + target.width / 2, target.y + 17);
      else { ctx.textAlign = 'left'; ctx.fillText(target.label, target.x + 24, target.y + 17); }
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e9f2df'; ctx.font = '9px monospace';
    ctx.fillText(this.inputSource === 'controller' ? 'D-pad + buttons' : '← → + Space', 213, 214);
    ctx.textAlign = 'left';
    if (this.landmarks) {
      const w = this.landmarks.naturalWidth / 3, h = this.landmarks.naturalHeight / 2;
      const { x, y, width, height } = FINISH_LAYOUT.landmark;
      ctx.drawImage(this.landmarks, this.selectedIndex % 3 * w, Math.floor(this.selectedIndex / 3) * h, w, h, x, y, width, height);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#e9f2df'; ctx.font = '10px monospace';
    ctx.fillText('Another trail explored!', 213, 169);
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
