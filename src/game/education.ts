/** Authored optional pickups, separate from gems, stars and run entities. */
export const LETTER_PICKUPS = [
  { id: 'timbers-letter-t', letter: 'T', x: 360 },
  { id: 'timbers-letter-r', letter: 'R', x: 1300 },
  { id: 'timbers-letter-e1', letter: 'E', x: 3600 },
  { id: 'timbers-letter-e2', letter: 'E', x: 7100 },
] as const;

export class EducationSession {
  private readonly collected = new Set<string>();
  private readonly slots = ['_', '_', '_', '_'];
  get wordProgress(): string { return this.slots.join(' '); }
  get stickers(): string[] { return this.collected.size === 4 ? ['Timbers TREE'] : []; }
  hasLetter(id: string): boolean { return this.collected.has(id); }
  collect(id: string): boolean {
    const pickup = LETTER_PICKUPS.find(letter => letter.id === id);
    if (!pickup || this.collected.has(id)) return false;
    const index = [...'TREE'].findIndex((letter, slot) => letter === pickup.letter && this.slots[slot] === '_');
    if (index < 0) return false;
    this.slots[index] = pickup.letter;
    this.collected.add(id);
    return true;
  }
}
