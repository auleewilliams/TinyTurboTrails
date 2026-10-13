/** Offline review evidence: run with Node 22.18+ and installed Playwright Chromium. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { EFFECTS, type Tone } from '../src/core/audio-effects.ts';
import { MUSIC, musicNotes, type MusicId } from '../src/core/music.ts';

interface Voice { tone: Tone; when: number; volume: number }
const directory = 'docs/evidence/issue-131';
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const effect = (id: keyof typeof EFFECTS, when: number): Voice[] => EFFECTS[id].tones.map(tone => {
    const voice = { tone, when, volume: EFFECTS[id].volume }; when += tone[1]; return voice;
  });
  const render = async (id: string, voices: Voice[], seconds: number, save = true) => {
    const result = await page.evaluate(async ({ voices, seconds }) => {
      const rate = 22050;
      const context = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
      const master = context.createGain(); master.gain.value = 0.075; master.connect(context.destination);
      // Match RetroAudio's oscillator sweeps and gain envelope exactly.
      for (const { tone: [hz, duration, type, endHz], when, volume } of voices) {
        const oscillator = context.createOscillator(); const gain = context.createGain();
        oscillator.type = type; oscillator.frequency.setValueAtTime(hz, when);
        if (endHz) oscillator.frequency.exponentialRampToValueAtTime(endHz, when + duration);
        gain.gain.setValueAtTime(0, when);
        gain.gain.linearRampToValueAtTime(volume, when + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
        gain.gain.linearRampToValueAtTime(0, when + duration + 0.009);
        oscillator.connect(gain); gain.connect(master);
        oscillator.start(when); oscillator.stop(when + duration + 0.01);
      }
      const data = (await context.startRendering()).getChannelData(0);
      let peak = 0; let squares = 0;
      for (const sample of data) { peak = Math.max(peak, Math.abs(sample)); squares += sample * sample; }
      return { peak, rms: Math.sqrt(squares / data.length), samples: [...data], rate };
    }, { voices, seconds });
    if (save) {
      const wav = Buffer.alloc(44 + result.samples.length * 2);
      wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
      wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(result.rate, 24); wav.writeUInt32LE(result.rate * 2, 28);
      wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
      wav.writeUInt32LE(wav.length - 44, 40);
      result.samples.forEach((sample, index) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
      writeFileSync(`${directory}/${id}.wav`, wav);
    }
    return { id, seconds, peak: result.peak, rms: result.rms };
  };
  const isolated = [];
  for (const id of ['footstep', 'landing', 'gem'] as const) isolated.push(await render(id, effect(id, 0.02), 0.3));
  // Slow walk, then run, with two landings and a reward over the second landing.
  const movement: Voice[] = [];
  for (let time = 0.6; time < 4; time += 48 / 80) movement.push(...effect('footstep', time));
  for (let time = 4.25; time < 12; time += 48 / 220) movement.push(...effect('footstep', time));
  movement.push(...effect('landing', 4), ...effect('landing', 8));
  const movementMetrics = await render('movement-only', movement, 12);
  const mixes = [];
  for (const id of Object.keys(MUSIC) as MusicId[]) {
    const music: Voice[] = [];
    const stepSeconds = 60 / MUSIC[id].bpm / 2;
    const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
    for (let step = 0; step * stepSeconds < 12; step++) {
      for (const note of musicNotes(id, step)) music.push({ when: 0.015 + step * stepSeconds,
        tone: [hz(note.midi), note.duration, note.type, note.endMidi === undefined ? undefined : hz(note.endMidi)], volume: note.volume });
    }
    const musicMetrics = await render(`${id}-music`, music, 12, false);
    const voices = [...music, ...movement, ...effect('gem', 8)];
    let maxVoices = 0;
    for (const voice of voices) maxVoices = Math.max(maxVoices, voices.filter(other => other.when <= voice.when && other.when + other.tone[1] + 0.01 > voice.when).length);
    if (maxVoices > 24) throw new Error(`${id} sample exceeds production voice limit`);
    const mix = await render(`${id}-mix`, voices, 12, id === 'plains' || id === 'frost');
    if (mix.peak >= 1) throw new Error(`${id} mix clips`);
    mixes.push({ ...mix, maxVoices, musicRms: musicMetrics.rms,
      movementBelowMusicDb: 20 * Math.log10(musicMetrics.rms / movementMetrics.rms) });
  }
  writeFileSync(`${directory}/metrics.json`, JSON.stringify({ isolated, movement: movementMetrics, mixes }, null, 2) + '\n');
} finally { await browser.close(); }
