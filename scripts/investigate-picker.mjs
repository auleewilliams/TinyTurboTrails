// Diagnostic reproduction of the OLD timing-only picker sequence, not a CI test.
// Run npm run build and npm run preview first. It deliberately delays game frames
// and reports the wrongly selected route; it does not change production code.
import { webkit } from '@playwright/test';
const browser = await webkit.launch();
for (let run = 0; run < 3; run++) {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (String(text).startsWith('◀')) this.canvas.dataset.selection = String(text);
      return Reflect.apply(draw, this, [text, ...args]);
    };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => raf(function frame(now) {
      if (window.blockFrames) raf(frame); else callback(now);
    });
  });
  await page.goto(`${process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173'}/?scene=adventure&debug=1`);
  await page.locator('#status').filter({hasText:'Title'}).waitFor();
  await page.evaluate(() => { window.blockFrames = true; });
  for (let i = 0; i < 2; i++) {
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(100);
    await page.keyboard.up('ArrowRight'); await page.waitForTimeout(50);
  }
  await page.evaluate(() => { window.blockFrames = false; });
  await page.keyboard.press('Space');
  await page.locator('#status').filter({hasText:'Playing'}).waitFor();
  console.log(JSON.stringify({run:run+1, intended:'Treetop Timbers',actual:await page.locator('canvas').getAttribute('data-selection')}));
  await page.close();
}
await browser.close();
