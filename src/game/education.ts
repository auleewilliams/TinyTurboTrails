import { surfaceY, type Terrain } from './movement';

export interface LetterPickup { readonly id: string; readonly letter: string; readonly x: number; readonly supportY?: number }
/** The authored value is the floor under Henry, shared by contact, drawing and flight. */
export function letterSupportY(letter: LetterPickup, terrain: Terrain): number {
  return letter.supportY ?? surfaceY(terrain, letter.x);
}

export interface TrailWord {
  readonly id: string;
  readonly name: string;
  readonly word: string;
  readonly pickups: readonly LetterPickup[];
}

function trailWord(id: string, name: string, word: string, positions: readonly number[], supports?: readonly number[]): TrailWord {
  return { id, name, word, pickups: [...word].map((letter, slot) => ({
    id: `${id}-letter-${letter.toLowerCase()}${word.indexOf(letter) !== word.lastIndexOf(letter) ? [...word].slice(0, slot + 1).filter(value => value === letter).length : ''}`,
    letter, x: positions[slot], ...(supports ? { supportY: supports[slot] } : {}),
  })) };
}

/** Optional authored pickups, separate from terrain, gems, stars and run entities. */
export const TRAIL_WORDS: readonly TrailWord[] = [
  trailWord('plains', 'Plains', 'HILL', [650, 2180, 3150, 3750]),
  trailWord('quarry', 'Quarry', 'ROCK', [230, 370, 220, 330], [140, 420, 700, 980]),
  trailWord('timbers', 'Timbers', 'TREE', [220, 270, 300, 350], [1080, 900, 420, 180]),
  trailWord('sunset', 'Sunset', 'BEAM', [350, 1120, 740, 2000], [440, 500, 320, 200]),
  trailWord('frost', 'Frost', 'SNOW', [360, 1300, 3600, 7100]),
  trailWord('cove', 'Cove', 'SAND', [360, 1300, 3600, 7100]),
];

/** Retain the accepted Timbers pickup identities, including both separate Es. */
export const LETTER_PICKUPS = TRAIL_WORDS[2].pickups;

export class TrailEducation {
  private readonly collected = new Set<string>();
  private readonly slots: (string | undefined)[] = Array(4).fill(undefined);
  constructor(readonly config: TrailWord) {}
  get wordProgress(): string { return this.slots.map(id => this.config.pickups.find(pickup => pickup.id === id)?.letter ?? '_').join(' '); }
  get hasWordSticker(): boolean { return this.wordProgress === [...this.config.word].join(' '); }
  get letterCount(): number { return this.collected.size; }
  get pile(): LetterPickup[] {
    // Stable mixed order; repeated letters remain separate collectible identities.
    return [3, 1, 0, 2].map(index => this.config.pickups[index])
      .filter(pickup => this.collected.has(pickup.id) && !this.slots.includes(pickup.id));
  }
  place(id: string, slot: number): boolean {
    const pickup = this.pile.find(letter => letter.id === id);
    if (!pickup || !Number.isInteger(slot) || slot < 0 || slot >= 4 || this.slots[slot]
      || pickup.letter !== this.config.word[slot]) return false;
    this.slots[slot] = id;
    return true;
  }
  hasLetter(id: string): boolean { return this.collected.has(id); }
  collect(id: string): boolean {
    const pickup = this.config.pickups.find(letter => letter.id === id);
    if (!pickup || this.collected.has(id)) return false;
    this.collected.add(id);
    return true;
  }
}

/** In-memory trail progress survives replay and switching; reload constructs a new session. */
export class EducationSession {
  private readonly trails = new Map(TRAIL_WORDS.map(config => [config.id, new TrailEducation(config)]));
  private activeId = 'timbers';
  progressFor(id: string): TrailEducation {
    const progress = this.trails.get(id);
    if (!progress) throw new Error(`Unknown spelling trail: ${id}`);
    return progress;
  }
  selectTrail(id: string): void { this.progressFor(id); this.activeId = id; }
  get config(): TrailWord { return this.progressFor(this.activeId).config; }
  get pickups(): readonly LetterPickup[] { return this.config.pickups; }
  get wordProgress(): string { return this.progressFor(this.activeId).wordProgress; }
  get hasWordSticker(): boolean { return this.progressFor(this.activeId).hasWordSticker; }
  get letterCount(): number { return this.progressFor(this.activeId).letterCount; }
  get pile(): LetterPickup[] { return this.progressFor(this.activeId).pile; }
  get stickers(): string[] { return TRAIL_WORDS.filter(config => this.progressFor(config.id).hasWordSticker).map(config => `${config.name} ${config.word}`); }
  hasLetter(id: string): boolean { return this.progressFor(this.activeId).hasLetter(id); }
  collect(id: string): boolean { return this.progressFor(this.activeId).collect(id); }
  place(id: string, slot: number): boolean { return this.progressFor(this.activeId).place(id, slot); }
}
