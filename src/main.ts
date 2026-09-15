import './style.css';
import { SilentAudio } from './core/audio';
import { SimulationClock } from './core/clock';
import { BrowserInput, type InputFrame } from './core/input';
import { SceneHost } from './core/scene';
import { fitViewport } from './core/viewport';
import { FoundationScene } from './foundation-scene';
import { loadHenry } from './art/henry';
import { ArtPreviewScene } from './art/preview-scene';
import { MovementPreviewScene } from './game/movement-preview';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const context = canvas.getContext('2d');

if (!context) {
  status.textContent = 'Canvas 2D is unavailable. Please open this preview in a supported desktop browser.';
} else {
  const clock = new SimulationClock();
  const audio = new SilentAudio();
  const input = new BrowserInput(window, () => { void audio.unlock().catch(() => {}); });
  const scenes = new SceneHost(() => audio.stop());
  let focused = !document.hidden && document.hasFocus();
  let userPaused = false;
  let muted = false;
  let request = 0;
  let pendingJump = false;
  const requestedScene = new URLSearchParams(location.search).get('scene');
  const artPreview = requestedScene === 'art';
  const movementPreview = requestedScene === 'movement';
  let assetState: 'loading' | 'ready' | 'failed' = artPreview || movementPreview ? 'loading' : 'ready';
  let disposed = false;

  const refreshPause = (): void => {
    input.setFocused(focused);
    const paused = !focused || userPaused;
    clock.setPaused(paused);
    audio.setSuspended(paused);
    if (paused) {
      input.clear();
      pendingJump = false;
    }
    status.textContent = assetState === 'failed' ? 'Artwork could not load. Reload to retry.'
      : assetState === 'loading' ? 'Loading artwork…'
      : !focused ? 'Paused · Return to the game to continue'
      : userPaused ? 'Paused · Escape to resume'
      : `${artPreview ? 'Art' : movementPreview ? 'Movement' : 'Foundation'} preview · Escape to pause · ${muted ? 'Muted · M to unmute' : 'M to mute'}`;
  };

  const resize = (): void => {
    const size = fitViewport(window.innerWidth, window.innerHeight);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
  };
  const blur = (): void => { focused = false; refreshPause(); };
  const focus = (): void => { focused = !document.hidden; refreshPause(); };
  const visibility = (): void => { focused = !document.hidden && document.hasFocus(); refreshPause(); };

  const frame = (now: number): void => {
    const controls: InputFrame = input.poll();
    if (focused) {
      if (controls.pausePressed) { userPaused = !userPaused; refreshPause(); }
      if (controls.mutePressed) { muted = !muted; audio.setMuted(muted); refreshPause(); }
    }
    if (focused && !userPaused) pendingJump ||= controls.jumpPressed;
    clock.advance(now, (seconds) => {
      scenes.update(seconds, { ...controls, jumpPressed: pendingJump });
      pendingJump = false;
    });
    context.imageSmoothingEnabled = false;
    scenes.render(context);
    if (!focused || userPaused) {
      context.fillStyle = '#0c1922cc';
      context.fillRect(0, 0, 426, 240);
      context.fillStyle = '#ffda75';
      context.textAlign = 'center';
      context.font = 'bold 20px monospace';
      context.fillText('PAUSED', 213, 116);
    }
    request = requestAnimationFrame(frame);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('blur', blur);
  window.addEventListener('focus', focus);
  document.addEventListener('visibilitychange', visibility);
  scenes.change(new FoundationScene());
  if (artPreview || movementPreview) {
    void loadHenry().then((assets) => {
      if (disposed) return;
      scenes.change(artPreview ? new ArtPreviewScene(assets) : new MovementPreviewScene(assets));
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
    audio.dispose();
  });
}
