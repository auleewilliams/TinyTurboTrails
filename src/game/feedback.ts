import type { RunEvent } from './interactions';
import type { LevelData } from '../world/level';
import { drawAsset } from '../world/renderer';
import type { WorldAssets } from '../world/assets';

export type EffectKind = 'checkpoint' | 'gem' | 'landing' | 'spring';
export interface Effect { kind: EffectKind; x: number; y: number; age: number; duration: number; entityId?: string }
export const MAX_EFFECTS = 24;

/** Presentation only: fixed-step lifetimes, no random numbers or simulation writes. */
export class Feedback {
  effects: Effect[] = [];
  checkpointSeconds = 0;

  clear(): void { this.effects = []; this.checkpointSeconds = 0; }
  tick(seconds: number): void {
    this.checkpointSeconds = Math.max(0, this.checkpointSeconds - seconds);
    for (const effect of this.effects) effect.age += seconds;
    this.effects = this.effects.filter((effect) => effect.age < effect.duration);
  }
  add(kind: EffectKind, x: number, y: number, entityId?: string): void {
    if (this.effects.length >= MAX_EFFECTS) this.effects.shift();
    this.effects.push({ kind, x, y, entityId, age: 0, duration: kind === 'checkpoint' ? 0.8 : kind === 'gem' ? 0.65 : 0.3 });
  }
  consume(events: readonly RunEvent[], level: LevelData): void {
    for (const event of events) {
      if (event.type !== 'checkpoint' && event.type !== 'gem' && event.type !== 'spring') continue;
      const entity = level.entities.find((candidate) => candidate.id === event.entityId);
      if (!entity) continue;
      this.add(event.type, entity.x, entity.y, entity.id);
      if (event.type === 'checkpoint') this.checkpointSeconds = 2;
    }
  }
  springScale(entityId: string, reducedMotion: boolean): number {
    const effect = this.effects.find((candidate) => candidate.kind === 'spring' && candidate.entityId === entityId);
    if (!effect || reducedMotion) return 1;
    const progress = effect.age / effect.duration;
    return progress < 0.3 ? 0.6 + progress : 1 + Math.sin((progress - 0.3) / 0.7 * Math.PI) * 0.25;
  }
  draw(ctx: CanvasRenderingContext2D, assets: WorldAssets, offset: { x: number; y: number }, reducedMotion: boolean): void {
    ctx.save();
    for (const effect of this.effects) {
      if (effect.kind === 'spring') continue; // The renderer compresses the existing spring sprite.
      const progress = effect.age / effect.duration;
      const x = Math.round(effect.x - offset.x);
      const y = Math.round(effect.y - offset.y);
      if (x < -32 || x > 458 || y < -32 || y > 272) continue;
      ctx.globalAlpha = 1 - progress * 0.6;
      if (effect.kind === 'landing') {
        if (!reducedMotion) drawAsset(ctx, assets, 'dust', x, y + 2, 0.35 + progress * 0.15);
        continue;
      }
      const centerY = y - (effect.kind === 'checkpoint' ? 30 : 14);
      const radius = reducedMotion ? 9 : 5 + progress * 18;
      ctx.fillStyle = '#ffed9a';
      ctx.strokeStyle = '#10252c';
      ctx.lineWidth = 2;
      for (let index = 0; index < 6; index++) {
        const angle = index * Math.PI / 3;
        const px = Math.round(x + Math.cos(angle) * radius);
        const py = Math.round(centerY + Math.sin(angle) * radius * 0.6);
        ctx.strokeRect(px - 1, py - 1, 3, 3);
        ctx.fillRect(px - 1, py - 1, 3, 3);
      }
      if (effect.kind === 'gem') {
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        const textY = centerY - 10 - (reducedMotion ? 0 : progress * 10);
        ctx.strokeText('+1', x, textY);
        ctx.fillText('+1', x, textY);
      }
    }
    ctx.restore();
  }
}
