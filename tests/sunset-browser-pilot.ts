import { expect, type Page } from '@playwright/test';
import { installTimberKeyboardPilot, runTimberStages, type TimberPilotStage } from './timbers-browser-pilot';

export async function startSunsetPilot(page: Page): Promise<void> {
  await installTimberKeyboardPilot(page);
  await page.setViewportSize({ width: 426, height: 300 });
  await page.goto('/?scene=adventure&debug=1');
  await page.getByRole('button', { name: 'SUNSET SITE', exact: true }).click();
  await page.getByRole('button', { name: 'Play SUNSET SITE', exact: true }).click();
  await expect(page.locator('#status')).toContainText('X 60 Y 526 V 0');
}

export async function driveSunset(page: Page, stages: readonly TimberPilotStage[]): Promise<object> {
  // Keep each walk within the existing 200-frame guard. Long horizontal decks
  // use intermediate travel observations; only the requested destination stops.
  let x = Number((await page.locator('#status').innerText()).match(/X (-?\d+)/)?.[1]);
  const bounded: TimberPilotStage[] = [];
  for (const stage of stages) {
    if (stage.kind === 'walk' || stage.kind === 'travel') while (Math.abs(stage.x! - x) > 320) {
      const direction = Math.sign(stage.x! - x) as -1 | 1;
      x += direction * 300;
      bounded.push(stage.kind === 'walk' ? { kind: 'travel', x, direction } : { ...stage, x });
    }
    bounded.push(stage);
    if (stage.x !== undefined) x = stage.x;
  }
  const result = await runTimberStages(page, bounded);
  expect(result, JSON.stringify(result)).toMatchObject({ done: true, error: '' });
  return result;
}
