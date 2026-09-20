import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const stage = process.argv[2] ?? 'before';
const directory = `docs/evidence/trail-milestone/${stage}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 852, height: 520 } });
await page.routeWebSocket('**', socket => socket.close());
await page.goto('http://127.0.0.1:4175/?scene=foundation');
const captures = await page.evaluate(async () => {
  const { LEVELS } = await import('/src/world/levels.ts');
  const { loadWorldAssetMap } = await import('/src/world/assets.ts');
  const { drawWorld, drawWorldForeground } = await import('/src/world/renderer.ts');
  const worlds = await loadWorldAssetMap(LEVELS.map(l => l.atlas));
  const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const captures = [];
  for (const level of LEVELS) for (const x of [0, 1800, 3700, 5500, 7400, 9000]) {
    const camera = { position: { x, y: 0 } };
    drawWorld(ctx, worlds[level.atlas], level, camera);
    drawWorldForeground(ctx, worlds[level.atlas], level, camera);
    captures.push({ name: `${level.id}-${x}`, data: canvas.toDataURL().split(',')[1] });
  }
  return captures;
});
for (const capture of captures) await writeFile(`${directory}/${capture.name}.png`, Buffer.from(capture.data, 'base64'));
if (stage === 'after') {
  for (const [label, width, height] of [['native', 426, 240], ['2x', 852, 520], ['small', 320, 240]]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:4175/');
    await page.getByRole('button', { name: 'Play PLAINS', exact: true }).waitFor();
    await page.screenshot({ path: `${directory}/map-${label}.png` });
  }
  await page.setViewportSize({ width: 426, height: 240 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const name of ['PLAINS', 'QUARRY RUN', 'TREETOP TIMBERS', 'SUNSET SITE', 'FROST RIDGE', 'SANDY COVE']) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.waitForTimeout(80);
    await page.locator('canvas').screenshot({ path: `${directory}/map-${name.toLowerCase().replaceAll(' ', '-')}.png` });
  }
}
if (stage === 'before') {
  await page.setContent('<canvas width="426" height="240"></canvas>');
  await page.evaluate(() => {
    const c = document.querySelector('canvas').getContext('2d');
    c.fillStyle = '#dde5c1'; c.fillRect(0,0,426,240);
    c.fillStyle = '#17333b'; c.font = '12px monospace'; c.fillText('TRAIL MAP • layout prototype', 12, 22);
    const points = [[48,80],[140,80],[232,80],[232,168],[140,168],[48,168]];
    c.strokeStyle = '#526f55'; c.setLineDash([3,5]); c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.stroke();
    points.forEach(([x,y],i) => { c.fillStyle = i ? '#91ac87' : '#ffda75'; c.fillRect(x-28,y-24,56,48); c.fillStyle='#17333b'; c.fillText(['Hills','Mine','Trees','Crane','Snow','Cove'][i],x-22,y+4); });
    c.fillStyle='#17333b'; c.fillRect(283,45,135,175); c.fillStyle='#e9f2df'; c.fillText('Selected name',290,62); c.fillRect(290,74,120,68); c.fillText('Preview',300,158); c.fillStyle='#ffda75'; c.fillRect(300,176,100,28); c.fillStyle='#17333b'; c.fillText('PLAY',335,194);
    c.fillText('← → Choose   Space / face button: play',12,234);
  });
  await page.locator('canvas').screenshot({ path: `${directory}/map-prototype-426x240.png` });
}
await browser.close();
