import { describe, expect, it, vi } from 'vitest';
import { drawFacingSprite } from '../src/art/sprite';

const frame = { x: 4, y: 8, width: 16, height: 16 };

function fakeContext() {
  return {
    calls: [] as string[],
    save: vi.fn(function (this: { calls: string[] }) { this.calls.push('save'); }),
    restore: vi.fn(function (this: { calls: string[] }) { this.calls.push('restore'); }),
    translate: vi.fn(function (this: { calls: string[] }, x: number, y: number) { this.calls.push(`translate:${x},${y}`); }),
    scale: vi.fn(function (this: { calls: string[] }, x: number, y: number) { this.calls.push(`scale:${x},${y}`); }),
    drawImage: vi.fn(function (this: { calls: string[] }, _image: unknown, ...rest: number[]) { this.calls.push(`drawImage:${rest.join(',')}`); }),
  };
}

describe('drawFacingSprite', () => {
  it('draws the atlas frame in place when facing right', () => {
    const ctx = fakeContext();
    drawFacingSprite(ctx as never, {} as never, frame, 10, 20, 48, 48, 1);
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.calls).toEqual(['drawImage:4,8,16,16,10,20,48,48']);
  });

  it('mirrors the atlas frame about its own bounding box when facing left', () => {
    const ctx = fakeContext();
    drawFacingSprite(ctx as never, {} as never, frame, 10, 20, 48, 48, -1);
    expect(ctx.calls).toEqual([
      'save',
      'translate:58,20',
      'scale:-1,1',
      'drawImage:4,8,16,16,0,0,48,48',
      'restore',
    ]);
  });
});
