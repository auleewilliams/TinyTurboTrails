/** Authored optional pickups, separate from gems, stars and run entities. */
export const MATHS_SPOT = { x: 2350 } as const;

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
  get hasWordSticker(): boolean { return this.collected.size === 4; }
  private question?: MathsQuestion;
  mathsComplete = false;
  get maths(): MathsQuestion { return this.question ??= mathsQuestion(220 + this.collected.size * 151); }
  get stickers(): string[] {
    return [...(this.hasWordSticker ? ['Timbers TREE'] : []), ...(this.mathsComplete ? ['Timbers number leaf'] : [])];
  }
  answerMaths(choice: number): boolean {
    if (this.mathsComplete || choice !== this.maths.answer) return false;
    this.mathsComplete = true;
    return true;
  }
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


export interface MathsQuestion {
  readonly left: number;
  readonly right: number;
  readonly operation: '+' | '−';
  readonly answer: number;
  readonly choices: readonly number[];
}

/** Enumerates all 1,326 valid pairs per operation; no randomness or clock state. */
export function mathsQuestion(index: number): MathsQuestion {
  const seed = ((Math.floor(index) % 2652) + 2652) % 2652;
  const operation = seed % 2 === 0 ? '+' : '−';
  let pair = Math.floor(seed / 2), left = 0;
  while (pair >= (operation === '+' ? 51 - left : left + 1)) {
    pair -= operation === '+' ? 51 - left : left + 1;
    left++;
  }
  const right = pair, answer = operation === '+' ? left + right : left - right;
  const choices = [answer, (answer + 1 + seed % 24) % 51, (answer + 26 + seed % 24) % 51];
  const rotation = seed % 3;
  return { left, right, operation, answer, choices: [...choices.slice(rotation), ...choices.slice(0, rotation)] };
}
