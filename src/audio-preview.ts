import { MUSIC, type MusicId } from './core/music';
import type { GameAudio, SoundEffect } from './core/audio';

/** Explicit opt-in preview until gameplay events and the title screen are integrated. */
export function mountAudioPreview(audio: GameAudio): () => void {
  if (!new URLSearchParams(location.search).has('audio')) return () => {};
  const panel = document.createElement('aside');
  panel.className = 'audio-preview';
  panel.setAttribute('aria-label', 'Audio preview');
  const label = document.createElement('p');
  label.textContent = 'Audio preview / M to mute / Escape to pause';
  panel.append(label);
  let revision = 0;
  const button = (name: string, action: () => void, effect = false): void => {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = name;
    element.onclick = () => {
      const pending = audio.unlock();
      if (effect) {
        const current = revision;
        void pending.then(() => { if (current === revision) action(); });
      } else { revision++; action(); }
    };
    panel.append(element);
  };
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Level soundtrack');
  for (const [id, track] of Object.entries(MUSIC)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${id} / ${track.name} / ${track.bpm} BPM`;
    select.append(option);
  }
  panel.append(select);
  const start = (): void => { audio.stop(); audio.startMusic(select.value as MusicId); };
  select.onchange = () => { revision++; void audio.unlock(); start(); };
  button('Start music', start);
  button('Stop audio', () => audio.stop());
  const effects: SoundEffect[] = ['jump', 'gem', 'spring', 'damage', 'checkpoint', 'complete'];
  for (const effect of effects) button(effect, () => audio.play(effect), true);
  document.body.append(panel);
  return () => { revision++; panel.remove(); };
}
