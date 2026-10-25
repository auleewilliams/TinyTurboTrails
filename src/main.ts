import './style.css';
import { RetroAudio } from './core/retro-audio';
import { mountAudioPreview } from './audio-preview';
import { SimulationClock } from './core/clock';
import { BrowserInput, type InputFrame, type InputSource } from './core/input';
import { SceneHost } from './core/scene';
import { fitGameViewport } from './core/viewport';
import { FoundationScene } from './foundation-scene';
import { loadTitleArtwork } from './art/title';
import { loadHenry, loadHenryPreview } from './art/henry';
import { ArtPreviewScene } from './art/preview-scene';
import { MovementPreviewScene } from './game/movement-preview';
import { loadWorldAssetMap, loadWorldAssets } from './world/assets';
import { WorldPreviewScene } from './world/preview-scene';
import { GameplayPreviewScene, loadGameplayAssets } from './game/gameplay-preview';
import { AdventureScene } from './game/adventure-scene';
import { MenuOverlay } from './game/menu-overlay';
import { PauseMenu, drawFocusPause } from './game/pause-menu';
import { loadImage } from './art/henry';
import { loadSpellingAssets } from './art/spelling';
import { loadInterfaceKit, type InterfaceKit } from './art/interface-kit';
import { DEFAULT_LEVEL, LEVELS } from './world/levels';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const main = document.querySelector<HTMLElement>('main')!;
const feedbackControls = document.querySelector<HTMLElement>('.feedback-controls')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const muteButton = document.querySelector<HTMLButtonElement>('#mute')!;
const rumbleButton = document.querySelector<HTMLButtonElement>('#rumble')!;
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
  const rumble = input.rumble;
  const scenes = new SceneHost(() => { audio.stop(); rumble.stop(); });
  const menu = new MenuOverlay(canvas);
  let focused = !document.hidden && document.hasFocus();
  let userPaused = false;
  let muted = false;
  let rumbleEnabled = true;
  let request = 0;
  let pendingJump = false;
  let educationRevision = 0;
  let ui: InterfaceKit | undefined;
  const educationScene = (): AdventureScene | undefined => scenes.activeScene instanceof AdventureScene ? scenes.activeScene : undefined;
  let inputSource: InputSource = 'keyboard';
  const requestedScene = new URLSearchParams(location.search).get('scene')
    ?? (new URLSearchParams(location.search).has('audio') ? 'foundation' : 'adventure');
  const artPreview = requestedScene === 'art';
  const movementPreview = requestedScene === 'movement';
  const worldPreview = requestedScene === 'world';
  const gameplayPreview = requestedScene === 'gameplay';
  const adventure = requestedScene === 'adventure';
  document.body.classList.toggle('adventure-view', adventure);
  rumbleButton.hidden = !adventure;
  const debugAdventure = new URLSearchParams(location.search).get('debug') === '1';
  let assetState: 'loading' | 'ready' | 'failed' = artPreview || movementPreview || worldPreview || gameplayPreview || adventure ? 'loading' : 'ready';
  let disposed = false;

  const adventureStatus = (): string => {
    const scene = scenes.activeScene;
    if (!(scene instanceof AdventureScene)) return '';
    canvas.setAttribute('aria-label', scene.educationDescription || 'Tiny Turbo Trails game');
    const state = scene.screenState[0].toUpperCase() + scene.screenState.slice(1);
    return ` · ${state}${scene.educationDescription ? ` · ${scene.educationDescription}` : ''}${scene.screenState === 'finish' ? ` · Gems ${scene.gemTotal}/${scene.trailGemTotal}` : ''}${debugAdventure ? ` · X ${Math.round(scene.playerX)} Y ${Math.round(scene.playerY)} V ${Math.round(scene.playerVelocityX)} F ${scene.playerFacing}` : ''}`;
  };

  const previewStatus = (): string => `${artPreview ? 'Art' : movementPreview ? 'Movement' : worldPreview ? 'World' : gameplayPreview ? 'Gameplay' : adventure ? 'Adventure' : 'Foundation'} preview${adventure ? adventureStatus() : ''} · ${inputSource === 'controller' ? 'Start' : 'Escape'} to ${educationScene()?.educationOverlay.open ? 'leave activity' : 'pause'} · ${muted ? 'Muted · M to unmute' : 'M to mute'}`;

  const refreshPause = (): void => {
    input.setFocused(focused);
    const paused = !focused || userPaused || (educationScene()?.educationOverlay.open ?? false);
    clock.setPaused(paused);
    audio.setSuspended(paused);
    rumble.setSuspended(paused);
    if (!focused || userPaused) {
      input.clear();
      pendingJump = false;
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
    document.body.classList.toggle('asset-unavailable', assetState !== 'ready');
  };

  const resize = (): void => {
    const size = fitGameViewport(main.clientWidth, main.clientHeight, feedbackControls.getBoundingClientRect());
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    canvas.style.left = `${size.left}px`;
    canvas.style.top = `${size.top}px`;
  };
  const clearGameplayInput = (): void => {
    input.clear(); pendingJump = false;
  };
  const resume = (): void => {
    userPaused = false; pauseMenu.reset(); pendingJump = false; refreshPause();
  };
  const pauseMenu = new PauseMenu(resume, () => {
    const scene = scenes.activeScene;
    if (!(scene instanceof AdventureScene) || scene.screenState !== 'playing') return;
    clearGameplayInput();
    scene.returnToTrails();
    resume();
  });
  const blur = (): void => { focused = false; pauseMenu.reset(); refreshPause(); };
  const focus = (): void => { focused = !document.hidden; refreshPause(); };
  const visibility = (): void => {
    focused = !document.hidden && document.hasFocus();
    if (!focused) pauseMenu.reset();
    refreshPause();
  };
  const toggleMute = (): void => { muted = !muted; audio.setMuted(muted); refreshPause(); };
  const toggleRumble = (): void => {
    rumbleEnabled = !rumbleEnabled;
    rumble.setEnabled(rumbleEnabled);
    rumbleButton.setAttribute('aria-pressed', String(rumbleEnabled));
    rumbleButton.title = `Turn controller rumble ${rumbleEnabled ? 'off' : 'on'}`;
  };
  const feedbackKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') event.stopPropagation();
  };
  const retryLoading = (): void => {
    assetState = 'loading';
    refreshPause();
    location.reload();
  };
  const refreshRumble = (): void => rumble.setGameplay(scenes.activeScene instanceof AdventureScene && scenes.activeScene.screenState === 'playing' && !scenes.activeScene.educationOverlay.open);

  const frame = (now: number): void => {
    let controls: InputFrame = input.poll();
    if (inputSource !== (controls.source ?? 'keyboard')) { inputSource = controls.source ?? 'keyboard'; refreshPause(); }
    if (focused) {
      if (controls.pausePressed) {
        if (educationScene()?.educationOverlay.open) educationScene()!.educationOverlay.close();
        else if (userPaused && pauseMenu.confirming) pauseMenu.cancel();
        else if (userPaused) resume();
        else { userPaused = true; pauseMenu.reset(); refreshPause(); }
        controls = input.poll();
      }
      if (controls.mutePressed) { muted = !muted; audio.setMuted(muted); refreshPause(); }
      if (userPaused && scenes.activeScene instanceof AdventureScene && scenes.activeScene.screenState === 'playing') {
        pauseMenu.update(controls);
        // A menu selection must not also reach gameplay or the overworld this frame.
        if (!userPaused) controls = input.poll();
      }
    }
    if (focused && !userPaused) educationScene()?.handleEducationInput(controls);
    const educationOpen = educationScene()?.educationOverlay.open ?? false;
    const nextEducationRevision = educationScene()?.educationOverlay.revision ?? 0;
    if (nextEducationRevision !== educationRevision) {
      // Pointer and polled entry share this boundary, before any opening-frame step.
      // A finish activity may open inside advance and close before this frame.
      // Force a suspension boundary even when the final overlay state is closed.
      clock.setPaused(true);
      clearGameplayInput(); controls = input.poll(); educationRevision = nextEducationRevision; refreshPause();
    }
    if (focused && !userPaused && !educationOpen) pendingJump ||= controls.jumpPressed;
    refreshRumble();
    clock.advance(now, (seconds) => {
      scenes.update(seconds, { ...controls, jumpPressed: pendingJump });
      refreshRumble();
      pendingJump = false;
    });
    if (assetState === 'ready' && focused && !userPaused && adventure) status.textContent = previewStatus();
    context.imageSmoothingEnabled = false;
    scenes.render(context);
    const scene = scenes.activeScene instanceof AdventureScene ? scenes.activeScene : undefined;
    const trailPaused = focused && userPaused && scene?.screenState === 'playing';
    menu.update(scene, !focused || userPaused, trailPaused ? pauseMenu.targets : []);
    if (trailPaused) pauseMenu.draw(context, inputSource, ui);
    else if (!focused || userPaused) drawFocusPause(context, controls.source ?? 'keyboard', ui);
    request = requestAnimationFrame(frame);
  };

  window.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', resize);
  const layoutObserver = new ResizeObserver(resize);
  layoutObserver.observe(main);
  layoutObserver.observe(feedbackControls);
  window.addEventListener('blur', blur);
  window.addEventListener('focus', focus);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('pointerdown', unlockAudio);
  muteButton.addEventListener('click', toggleMute);
  muteButton.addEventListener('keydown', feedbackKeyDown);
  rumbleButton.addEventListener('click', toggleRumble);
  rumbleButton.addEventListener('keydown', feedbackKeyDown);
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
      loadSpellingAssets(),
      loadInterfaceKit(),
    ]).then(([titleArtwork, henry, worlds, landmarks, mapBackground, spelling, kit]) => {
      if (disposed) return;
      ui = kit;
      scenes.change(new AdventureScene(titleArtwork, henry, worlds, audio, DEFAULT_LEVEL, landmarks, mapBackground, rumble, spelling, kit));
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
    document.removeEventListener('fullscreenchange', resize);
    layoutObserver.disconnect();
    window.removeEventListener('blur', blur);
    window.removeEventListener('focus', focus);
    document.removeEventListener('visibilitychange', visibility);
    input.dispose();
    scenes.dispose();
    menu.dispose();
    canvas.removeEventListener('pointerdown', unlockAudio);
    muteButton.removeEventListener('click', toggleMute);
    muteButton.removeEventListener('keydown', feedbackKeyDown);
    rumbleButton.removeEventListener('click', toggleRumble);
    rumbleButton.removeEventListener('keydown', feedbackKeyDown);
    retryButton.removeEventListener('click', retryLoading);
    removeAudioPreview();
    audio.dispose();
  });
}
