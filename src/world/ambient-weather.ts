import type { LevelTheme } from './level';

/** A bounded field sampled directly from time and camera position. No particle
 * objects, random generator, or accumulated state are needed by the renderer. */
export function drawAmbientWeather(ctx: CanvasRenderingContext2D, weather: LevelTheme['weather'],
  offset: { x: number; y: number }, seconds: number, reducedMotion = false): void {
  if (!weather || reducedMotion) return;
  const count = Math.min(32, Math.max(0, Math.floor(weather.count)));
  if (!count) return;
  ctx.save();
  ctx.fillStyle = weather.color;
  for (let index = 0; index < count; index++) {
    // Coprime strides spread the field across a padded viewport. Wrapping also
    // handles negative drift and camera positions without growing route work.
    const phase = seconds * 0.7 + index * 2.4;
    const worldX = index * 137 + seconds * weather.drift + Math.sin(phase) * weather.sway - offset.x * 0.35;
    const worldY = index * 97 + seconds * weather.fall - offset.y * 0.35;
    const x = Math.round(((worldX % 458) + 458) % 458 - 16);
    const y = Math.round(((worldY % 272) + 272) % 272 - 16);
    // Leave the HUD band clear. Terrain, platforms, entities and Henry are all
    // painted later, so the weather can never cover their readable silhouettes.
    if (x < 0 || x > 422 || y < 40 || y > 236) continue;
    if (weather.kind === 'leaves') {
      const width = Math.sin(phase) > 0 ? 3 : 1;
      ctx.fillRect(x, y, width, 1);
      ctx.fillRect(x + 1, y + 1, 2, 1);
    } else {
      const size = weather.kind === 'snow' && index % 3 === 0 ? 2 : 1;
      ctx.fillRect(x, y, size, weather.kind === 'spray' ? 2 : size);
    }
  }
  ctx.restore();
}
