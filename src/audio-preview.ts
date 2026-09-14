import type { GameAudio, SoundEffect } from './core/audio';

/** Explicit opt-in preview until gameplay events and the title screen are integrated. */
export function mountAudioPreview(audio: GameAudio): () => void {
  if (!new URLSearchParams(location.search).has('audio')) return () => {};
  const panel = document.createElement('aside');
  panel.className = 'audio-preview';
  panel.setAttribute('aria-label', 'Audio preview');
  const label = document.createElement('p');
  label.textContent = 'Audio preview · M to mute · Escape to pause';
  panel.append(label);
  const button = (name: string, action: () => void): void => {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = name;
    element.onclick = () => { void audio.unlock().then(action); };
    panel.append(element);
  };
  button('Start music', () => audio.startMusic());
  button('Stop audio', () => audio.stop());
  const effects: SoundEffect[] = ['jump', 'gem', 'spring', 'damage', 'checkpoint', 'complete'];
  for (const effect of effects) button(effect, () => audio.play(effect));
  document.body.append(panel);
  return () => panel.remove();
}
