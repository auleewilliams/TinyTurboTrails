/** Offline evidence only: npx tsx is unnecessary on Node 22.18+; run with node. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { MUSIC, MUSIC_STEPS, musicNotes, type MusicId } from '../src/core/music.ts';

const directory = 'docs/evidence/issue-108';
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const metrics = [];
  for (const id of Object.keys(MUSIC) as MusicId[]) {
    const stepSeconds = 60 / MUSIC[id].bpm / 2;
    const loopSeconds = stepSeconds * MUSIC_STEPS;
    const events = Array.from({ length: MUSIC_STEPS * 3 }, (_, step) => ({
      when: 0.015 + step * stepSeconds, notes: musicNotes(id, step),
    }));
    const result = await page.evaluate(async ({ events, loopSeconds }) => {
      const rate = 22050;
      const context = new OfflineAudioContext(1, Math.ceil((loopSeconds * 3 + 1) * rate), rate);
      const master = context.createGain(); master.gain.value = 0.075; master.connect(context.destination);
      const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
      for (const { when, notes } of events) for (const note of notes) {
        const oscillator = context.createOscillator(); const gain = context.createGain();
        oscillator.type = note.type; oscillator.frequency.setValueAtTime(hz(note.midi), when);
        if (note.endMidi !== undefined) oscillator.frequency.exponentialRampToValueAtTime(hz(note.endMidi), when + note.duration);
        gain.gain.setValueAtTime(0, when); gain.gain.linearRampToValueAtTime(note.volume, when + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, when + note.duration);
        gain.gain.linearRampToValueAtTime(0, when + note.duration + 0.009);
        oscillator.connect(gain); gain.connect(master); oscillator.start(when); oscillator.stop(when + note.duration + 0.01);
      }
      const data = (await context.startRendering()).getChannelData(0);
      let peak = 0; let squares = 0;
      for (const sample of data) { peak = Math.max(peak, Math.abs(sample)); squares += sample * sample; }
      // First twelve seconds, then six seconds spanning the first loop boundary.
      const sample = [...data.slice(0, rate * 12), ...data.slice(Math.floor((loopSeconds - 3) * rate), Math.floor((loopSeconds + 3) * rate))];
      return { peak, rms: Math.sqrt(squares / data.length), sample, rate };
    }, { events, loopSeconds });
    const wav = Buffer.alloc(44 + result.sample.length * 2);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(result.rate, 24); wav.writeUInt32LE(result.rate * 2, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
    wav.writeUInt32LE(wav.length - 44, 40);
    result.sample.forEach((sample, index) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
    writeFileSync(`${directory}/${id}.wav`, wav);
    metrics.push({ id, loopSeconds, loopsRendered: 3, peak: result.peak, rms: result.rms });
  }
  writeFileSync(`${directory}/metrics.json`, JSON.stringify(metrics, null, 2) + '\n');
} finally { await browser.close(); }
