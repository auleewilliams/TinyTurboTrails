/** Original project-local scores. Zero is a rest; pitches are MIDI notes. */
export type MusicId = 'plains' | 'quarry' | 'timbers' | 'sunset' | 'frost' | 'cove';
export interface MusicTrack {
  readonly name: string;
  readonly bpm: number;
  readonly lead: OscillatorType;
  readonly volume: number;
  readonly gate: number;
  readonly phrases: readonly (readonly number[])[];
  readonly bass: readonly number[];
  readonly pulse: readonly number[];
  readonly percussion: readonly number[];
}
export const MUSIC: Readonly<Record<MusicId, MusicTrack>> = {
  plains: { name: 'Meadow morning', bpm: 132, lead: 'square', volume: 0.12, gate: 0.7,
    phrases: [
      [72, 76, 79, 0, 76, 79, 81, 79, 77, 0, 76, 74, 72, 0, 67, 0],
      [69, 72, 76, 0, 79, 76, 74, 0, 71, 74, 79, 77, 76, 74, 72, 0],
      [84, 0, 81, 79, 76, 0, 79, 81, 77, 81, 79, 0, 76, 74, 72, 0],
      [69, 0, 72, 76, 74, 0, 71, 67, 72, 76, 79, 74, 72, 0, 0, 0],
    ], bass: [48, 53, 45, 55, 48, 53, 50, 55], pulse: [0, 4], percussion: [2, 6] },
  quarry: { name: 'Pebble parade', bpm: 108, lead: 'triangle', volume: 0.23, gate: 0.85,
    phrases: [
      [62, 0, 69, 0, 65, 67, 0, 69, 72, 0, 69, 0, 67, 0, 65, 0],
      [65, 0, 62, 65, 0, 69, 0, 67, 64, 0, 67, 0, 69, 0, 62, 0],
      [74, 0, 72, 0, 69, 72, 0, 74, 77, 0, 74, 72, 0, 69, 0, 67],
      [65, 0, 69, 0, 67, 65, 0, 62, 64, 0, 67, 69, 62, 0, 0, 0],
    ], bass: [38, 43, 46, 45, 38, 43, 40, 45], pulse: [0, 3, 6], percussion: [4] },
  timbers: { name: 'Canopy caper', bpm: 120, lead: 'triangle', volume: 0.23, gate: 0.42,
    phrases: [
      [79, 83, 86, 81, 84, 88, 83, 0, 81, 79, 76, 0, 74, 79, 83, 0],
      [76, 79, 83, 74, 78, 81, 79, 0, 83, 81, 78, 0, 79, 0, 0, 0],
      [86, 83, 79, 88, 84, 81, 86, 0, 83, 79, 76, 0, 81, 83, 86, 0],
      [84, 81, 76, 83, 79, 74, 81, 0, 78, 74, 81, 0, 79, 0, 0, 0],
    ], bass: [43, 48, 40, 50, 43, 48, 45, 50], pulse: [0, 3], percussion: [2, 5, 7] },
  sunset: { name: 'Golden girders', bpm: 126, lead: 'sawtooth', volume: 0.13, gate: 0.6,
    phrases: [
      [69, 0, 73, 76, 0, 78, 76, 0, 74, 0, 78, 0, 76, 74, 73, 0],
      [73, 0, 76, 0, 80, 78, 0, 76, 71, 0, 75, 78, 0, 76, 73, 0],
      [81, 0, 80, 78, 0, 76, 73, 0, 78, 0, 81, 0, 83, 81, 78, 0],
      [76, 0, 73, 0, 69, 73, 0, 74, 71, 0, 75, 78, 69, 0, 0, 0],
    ], bass: [45, 50, 54, 52, 45, 50, 47, 52], pulse: [0, 3, 4, 7], percussion: [2, 6] },
  frost: { name: 'Snowlight glide', bpm: 92, lead: 'sine', volume: 0.24, gate: 1.8,
    phrases: [
      [86, 0, 0, 81, 0, 83, 0, 0, 78, 0, 81, 0, 0, 86, 0, 0],
      [83, 0, 0, 78, 0, 76, 0, 0, 81, 0, 78, 0, 74, 0, 0, 0],
      [90, 0, 0, 86, 0, 88, 0, 0, 85, 0, 81, 0, 0, 83, 0, 0],
      [79, 0, 0, 83, 0, 81, 0, 0, 78, 0, 76, 0, 74, 0, 0, 0],
    ], bass: [50, 47, 43, 45, 50, 47, 43, 45], pulse: [0], percussion: [6] },
  cove: { name: 'Tidepool holiday', bpm: 100, lead: 'sine', volume: 0.24, gate: 0.95,
    phrases: [
      [77, 0, 81, 0, 84, 81, 0, 79, 77, 0, 74, 0, 72, 0, 0, 74],
      [79, 0, 82, 0, 86, 84, 0, 82, 81, 0, 79, 0, 77, 0, 0, 0],
      [84, 0, 81, 0, 89, 86, 0, 84, 82, 0, 79, 0, 77, 0, 0, 79],
      [81, 0, 77, 0, 74, 77, 0, 79, 76, 0, 72, 0, 77, 0, 0, 0],
    ], bass: [41, 46, 43, 48, 41, 46, 43, 48], pulse: [0, 5], percussion: [2, 4, 7] },
};

export interface MusicNote { midi: number; duration: number; type: OscillatorType; volume: number; endMidi?: number }
export const MUSIC_STEPS = 128; // Sixteen bars: A, B, C, D, A', B', C', D'.
export function musicForLevel(id: string): MusicId {
  return Object.hasOwn(MUSIC, id) ? id as MusicId : 'plains';
}
/** Pure score reader, independent of the audio clock and gameplay simulation. */
export function musicNotes(id: MusicId, step: number): readonly MusicNote[] {
  const track = MUSIC[id];
  const position = step % MUSIC_STEPS;
  const beat = position % 8;
  const phrase = track.phrases[Math.floor(position / 16) % 4];
  const midi = phrase[position % 16];
  const seconds = 60 / track.bpm / 2;
  const notes: MusicNote[] = [];
  if (midi) notes.push({ midi, duration: seconds * track.gate, type: track.lead, volume: track.volume });
  if (track.pulse.includes(beat)) notes.push({ midi: track.bass[Math.floor(position / 8) % 8],
    duration: seconds * 1.3, type: 'triangle', volume: 0.25 });
  if (track.percussion.includes(beat)) notes.push({ midi: id === 'sunset' ? 96 : id === 'timbers' ? 79 : 48,
    endMidi: id === 'sunset' ? 91 : 30, duration: 0.055, type: 'sine', volume: 0.09 });
  // Second pass adds quiet answering plucks in the spaces between lead phrases.
  if (position >= 64 && !midi && beat === 7) notes.push({ midi: phrase.find(note => note > 0)! - 12,
    duration: seconds * 0.5, type: 'triangle', volume: 0.12 });
  return notes;
}
