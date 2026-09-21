import './style.css';
import { RetroAudio } from './core/retro-audio';
import { mountAudioPreview } from './audio-preview';
import { SimulationClock } from './core/clock';
import { BrowserInput, type InputFrame, type InputSource } from './core/input';
import { SceneHost } from './core/scene';
import { fitViewport } from './core/viewport';
import { FoundationScene } from './foundation-scene';
import { loadTitleArtwork } from './art/title';
import { loadHenry, loadHenryPreview } from './art/henry';
import { ArtPreviewScene } from './art/preview-scene';
import { MovementPreviewScene } from './game/movement-preview';
import { loadWorldAssetMap, loadWorldAssets } from './world/assets';
import { WorldPreviewScene } from './world/preview-scene';
import { GameplayPreviewScene, loadGameplayAssets } from './game/gameplay-preview';
import { controlHints } from './game/hud';
import { AdventureScene } from './game/adventure-scene';
import { MenuOverlay } from './game/menu-overlay';
import { loadImage } from './art/henry';
import { DEFAULT_LEVEL, LEVELS } from './world/levels';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const muteButton = document.querySelector<HTMLButtonElement>('#mute')!;
const retryButton = document.querySelector<HTMLButtonElement>('#retry')!;
const context = canvas.getContext('2d');

if (!context) {
  status.textContent = 'Canvas 2D is unavailable. Please open this preview in a supported desktop browser.';
} else {
  const clock = new SimulationClock();
  const audio = new RetroAudio();
  const removeAudioPreview = mountAudioPreview(audio);
  const unlockAudio = (): void => { void audio.unlock(); };
  const input = new BrowserInput(window, () => { void audio.unlock().catch(() => {}); });
  const scenes = new SceneHost(() => audio.stop());
  const menu = new MenuOverlay(canvas);
  let focused = !document.hidden && document.hasFocus();
  let userPaused = false;
  let muted = false;
  let request = 0;
  let pendingJump = false;
  let pendingStory = false;
  let inputSource: InputSource = 'keyboard';
  const requestedScene = new URLSearchParams(location.search).get('scene')
    ?? (new URLSearchParams(location.search).has('audio') ? 'foundation' : 'adventure');
  const artPreview = requestedScene === 'art';
  const movementPreview = requestedScene === 'movement';
  const worldPreview = requestedScene === 'world';
  const gameplayPreview = requestedScene === 'gameplay';
  const adventure = requestedScene === 'adventure';
  const debugAdventure = new URLSearchParams(location.search).get('debug') === '1';
  let assetState: 'loading' | 'ready' | 'failed' = artPreview || movementPreview || worldPreview || gameplayPreview || adventure ? 'loading' : 'ready';
  let disposed = false;

  const adventureStatus = (): string => {
    const scene = scenes.activeScene;
    if (!(scene instanceof AdventureScene)) return '';
    canvas.setAttribute('aria-label', scene.storyDescription || 'Tiny Turbo Trails game');
    const state = scene.screenState[0].toUpperCase() + scene.screenState.slice(1);
    return ` · ${state}${scene.screenState === 'finish' ? ` · Gems ${scene.gemTotal}` : ''}${debugAdventure ? ` · X ${Math.round(scene.playerX)} Y ${Math.round(scene.playerY)} V ${Math.round(scene.playerVelocityX)} F ${scene.playerFacing}` : ''}`;
  };

  const previewStatus = (): string => `${artPreview ? 'Art' : movementPreview ? 'Movement' : worldPreview ? 'World' : gameplayPreview ? 'Gameplay' : adventure ? 'Adventure' : 'Foundation'} preview${adventure ? adventureStatus() : ''} · ${inputSource === 'controller' ? 'Start' : 'Escape'} to pause · ${muted ? 'Muted · M to unmute' : 'M to mute'}`;

  const refreshPause = (): void => {
    input.setFocused(focused);
    const paused = !focused || userPaused;
    clock.setPaused(paused);
    audio.setSuspended(paused);
    if (paused) {
      input.clear();
      pendingJump = false;
      pendingStory = false;
    }
    status.textContent = assetState === 'failed' ? 'Artwork could not load. Reload to retry.'
      : assetState === 'loading' ? 'Loading artwork…'
      : !focused ? 'Paused · Return to the game to continue'
      : userPaused ? `Paused · ${inputSource === 'controller' ? 'Start' : 'Escape'} to resume`
      : previewStatus();
    muteButton.textContent = muted ? 'Unmute' : 'Mute';
    muteButton.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    muteButton.setAttribute('aria-pressed', String(muted));
    retryButton.hidden = assetState !== 'failed';
  };

  const resize = (): void => {
    const size = fitViewport(window.innerWidth, window.innerHeight);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
  };
  const blur = (): void => { focused = false; refreshPause(); };
  const focus = (): void => { focused = !document.hidden; refreshPause(); };
  const visibility = (): void => { focused = !document.hidden && document.hasFocus(); refreshPause(); };
  const toggleMute = (): void => { muted = !muted; audio.setMuted(muted); refreshPause(); };
  const retryLoading = (): void => { location.reload(); };

  const frame = (now: number): void => {
    const controls: InputFrame = input.poll();
    if (inputSource !== (controls.source ?? 'keyboard')) { inputSource = controls.source ?? 'keyboard'; refreshPause(); }
    if (focused) {
      if (controls.pausePressed) { userPaused = !userPaused; refreshPause(); }
      if (controls.mutePressed) { muted = !muted; audio.setMuted(muted); refreshPause(); }
    }
    if (focused && !userPaused) { pendingJump ||= controls.jumpPressed; pendingStory ||= controls.storyPressed ?? false; }
    clock.advance(now, (seconds) => {
      scenes.update(seconds, { ...controls, jumpPressed: pendingJump, storyPressed: pendingStory });
      pendingJump = false;
      pendingStory = false;
    });
    if (assetState === 'ready' && focused && !userPaused && adventure) status.textContent = previewStatus();
    context.imageSmoothingEnabled = false;
    scenes.render(context);
    menu.update(scenes.activeScene instanceof AdventureScene ? scenes.activeScene : undefined, !focused || userPaused);
    if (!focused || userPaused) {
      // Save/restore so the centered overlay cannot leak into the next frame's scene HUD.
      context.save();
      context.fillStyle = '#0c1922cc';
      context.fillRect(0, 0, 426, 240);
      context.fillStyle = '#ffda75';
      context.textAlign = 'center';
      context.font = 'bold 20px monospace';
      context.fillText('PAUSED', 213, 83);
      context.font = '12px monospace';
      context.fillStyle = '#e9f2df';
      controlHints(controls.source ?? 'keyboard').forEach((hint, index) => context.fillText(hint, 213, 111 + index * 20));
      context.restore();
    }
    request = requestAnimationFrame(frame);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('blur', blur);
  window.addEventListener('focus', focus);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('pointerdown', unlockAudio);
  muteButton.addEventListener('click', toggleMute);
  retryButton.addEventListener('click', retryLoading);
  scenes.change(new FoundationScene());
  if (!adventure && !new URLSearchParams(location.search).has('audio')) audio.startMusic();
  if (adventure) {
    void Promise.all([
      loadTitleArtwork(),
      loadHenry(),
      loadWorldAssetMap(LEVELS.map(({ atlas }) => atlas)),
      loadImage(`${import.meta.env.BASE_URL}assets/overworld/landmarks.png`),
      loadImage(`${import.meta.env.BASE_URL}assets/overworld/background.png`),
      loadImage(`${import.meta.env.BASE_URL}assets/story/patchwork-vale.png`),
    ]).then(([titleArtwork, henry, worlds, landmarks, mapBackground, storyArtwork]) => {
      if (disposed) return;
      scenes.change(new AdventureScene(titleArtwork, henry, worlds, audio, DEFAULT_LEVEL, landmarks, mapBackground, storyArtwork));
      assetState = 'ready';
      refreshPause();
    }).catch(() => {
      if (disposed) return;
      assetState = 'failed';
      refreshPause();
    });
  } else if (gameplayPreview) {
    void loadGameplayAssets().then((assets) => {
      if (disposed) return;
      scenes.change(new GameplayPreviewScene(assets.henry, assets.world, audio));
      audio.startMusic();
      assetState = 'ready';
      refreshPause();
    }).catch(() => {
      if (disposed) return;
      assetState = 'failed';
      refreshPause();
    });
  } else if (worldPreview) {
    void loadWorldAssets().then((assets) => {
      if (disposed) return;
      scenes.change(new WorldPreviewScene(assets));
      assetState = 'ready';
      refreshPause();
    }).catch(() => {
      if (disposed) return;
      assetState = 'failed';
      refreshPause();
    });
  } else if (artPreview) {
    void loadHenryPreview().then((assets) => {
      if (disposed) return;
      scenes.change(new ArtPreviewScene(assets, new URLSearchParams(location.search).get('animation') === 'celebrate'));
      assetState = 'ready';
      refreshPause();
    }).catch(() => {
      if (disposed) return;
      assetState = 'failed';
      refreshPause();
    });
  } else if (movementPreview) {
    void loadHenry().then((assets) => {
      if (disposed) return;
      scenes.change(new MovementPreviewScene(assets));
      assetState = 'ready';
      refreshPause();
    }).catch(() => {
      if (disposed) return;
      assetState = 'failed';
      refreshPause();
    });
  }
  resize();
  refreshPause();
  request = requestAnimationFrame(frame);

  if (import.meta.hot) import.meta.hot.dispose(() => {
    disposed = true;
    cancelAnimationFrame(request);
    window.removeEventListener('resize', resize);
    window.removeEventListener('blur', blur);
    window.removeEventListener('focus', focus);
    document.removeEventListener('visibilitychange', visibility);
    input.dispose();
    scenes.dispose();
    menu.dispose();
    canvas.removeEventListener('pointerdown', unlockAudio);
    muteButton.removeEventListener('click', toggleMute);
    retryButton.removeEventListener('click', retryLoading);
    removeAudioPreview();
    audio.dispose();
  });
}
