/** Authored optional pickups, separate from gems, stars and run entities. */
export const LETTER_PICKUPS = [
  { id: 'timbers-letter-t', letter: 'T', x: 360 },
  { id: 'timbers-letter-r', letter: 'R', x: 1300 },
  { id: 'timbers-letter-e1', letter: 'E', x: 3600 },
  { id: 'timbers-letter-e2', letter: 'E', x: 7100 },
] as const;

export class EducationSession {
  private readonly collected = new Set<string>();
  private readonly slots: (string | undefined)[] = Array(4).fill(undefined);
  get wordProgress(): string { return this.slots.map(id => LETTER_PICKUPS.find(pickup => pickup.id === id)?.letter ?? '_').join(' '); }
  get hasWordSticker(): boolean { return this.wordProgress === 'T R E E'; }
  get letterCount(): number { return this.collected.size; }
  get pile(): (typeof LETTER_PICKUPS)[number][] {
    // A stable mixed order keeps the two Es independent without random simulation state.
    return [LETTER_PICKUPS[3], LETTER_PICKUPS[1], LETTER_PICKUPS[0], LETTER_PICKUPS[2]]
      .filter(pickup => this.collected.has(pickup.id) && !this.slots.includes(pickup.id));
  }
  place(id: string, slot: number): boolean {
    const pickup = this.pile.find(letter => letter.id === id);
    if (!pickup || !Number.isInteger(slot) || slot < 0 || slot >= 4 || this.slots[slot]
      || pickup.letter !== 'TREE'[slot]) return false;
    this.slots[slot] = id;
    return true;
  }
  get stickers(): string[] { return this.hasWordSticker ? ['Timbers TREE'] : []; }
  hasLetter(id: string): boolean { return this.collected.has(id); }
  collect(id: string): boolean {
    const pickup = LETTER_PICKUPS.find(letter => letter.id === id);
    if (!pickup || this.collected.has(id)) return false;
    this.collected.add(id);
    return true;
  }
}
