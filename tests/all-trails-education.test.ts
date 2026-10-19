import { expect, it } from 'vitest';
import { EducationSession } from '../src/game/education';
import { LEVELS } from '../src/world/levels';

const words = ['HILL', 'ROCK', 'TREE', 'BEAM', 'SNOW', 'SAND'];

it('keeps all six manual words, repeated identities and stickers independent within one session', () => {
  const session = new EducationSession();
  for (const [index, level] of LEVELS.entries()) {
    session.selectTrail(level.id);
    expect(session.config.word).toBe(words[index]);
    expect(session.letterCount).toBe(0);
    expect(session.wordProgress).toBe('_ _ _ _');
    expect(session.pickups.map(pickup => pickup.letter).join('')).toBe(words[index]);
    expect(new Set(session.pickups.map(pickup => pickup.id)).size).toBe(4);
    expect(session.collect('foreign-letter')).toBe(false);
    const foreign = session.progressFor(LEVELS[(index + 1) % 6].id).config.pickups[0].id;
    expect(session.collect(foreign)).toBe(false);
    for (const pickup of [...session.pickups].reverse()) expect(session.collect(pickup.id)).toBe(true);
    expect(session.hasWordSticker).toBe(false);
    expect(session.pile.map(pickup => pickup.letter).join('')).not.toBe(words[index]);
    expect(session.place(session.pickups[3].id, 0)).toBe(false);
    for (const [slot, pickup] of session.pickups.entries()) {
      expect(session.place(pickup.id, slot)).toBe(true);
      expect(session.place(pickup.id, (slot + 1) % 4)).toBe(false);
      expect(session.collect(pickup.id)).toBe(false);
    }
    expect(session.hasWordSticker).toBe(true);
    expect(session.stickers).toHaveLength(index + 1);
  }
  for (const [index, level] of LEVELS.entries()) {
    session.selectTrail(level.id);
    expect(session.wordProgress).toBe([...words[index]].join(' '));
    expect(session.letterCount).toBe(4);
    expect(session.pile).toEqual([]);
  }
  expect(new EducationSession().stickers).toEqual([]);
});
