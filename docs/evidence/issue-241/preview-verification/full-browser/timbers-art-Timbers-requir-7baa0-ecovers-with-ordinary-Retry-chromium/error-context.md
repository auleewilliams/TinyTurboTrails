# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timbers-art.spec.ts >> Timbers required manifest.json fails visibly and recovers with ordinary Retry
- Location: tests/timbers-art.spec.ts:155:71

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Retry', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Retry', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Retry', exact: true })

```

```yaml
- main:
  - text: This game requires a browser with Canvas 2D support.
  - status: Artwork could not load. Reload to retry.
  - button "Pause"
  - button "Retry loading"
  - navigation "Trail navigation"
```

# Test source

```ts
  59  | async function capture(page: Page, info: TestInfo, name: string, width: number, supportId?: string) {
  60  |   await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = true; });
  61  |   const sample = await page.evaluate(() => {
  62  |     const canvas = document.querySelector<HTMLCanvasElement>('#game')!, box = canvas.getBoundingClientRect();
  63  |     const probe = (window as unknown as { timbersArtProbe: { actor: { feet: { x: number; y: number }; bounds: { left: number; right: number; top: number; bottom: number } }; frameDraws: { source: string; x: number; y: number; width: number; height: number }[]; seen: string[] } }).timbersArtProbe;
  64  |     return { status: document.querySelector('#status')!.textContent!, native: [canvas.width, canvas.height],
  65  |       css: { width: box.width, height: box.height }, viewport: [innerWidth, innerHeight], probe,
  66  |       png: canvas.toDataURL('image/png') };
  67  |   });
  68  |   const native = Buffer.from(sample.png.split(',')[1], 'base64');
  69  |   const nativePath = info.outputPath(`${name}-native.png`), cssPath = info.outputPath(`${name}-css.png`);
  70  |   writeFileSync(nativePath, native); await page.locator('#game').screenshot({ path: cssPath });
  71  |   await info.attach(`${name}-native`, { path: nativePath, contentType: 'image/png' });
  72  |   await info.attach(`${name}-css`, { path: cssPath, contentType: 'image/png' });
  73  |   const { png: _png, ...metadata } = sample;
  74  |   const metaPath = info.outputPath(`${name}.json`);
  75  |   writeFileSync(metaPath, JSON.stringify({ ...metadata, nativeSha256: hash(native), cssSha256: hash(readFileSync(cssPath)) }, null, 2));
  76  |   await info.attach(`${name}-metadata`, { path: metaPath, contentType: 'application/json' });
  77  |   expect(sample.native).toEqual([426, 240]); expect(sample.css.width).toBe(width);
  78  |   if (supportId) expect(Number(sample.status.match(/Y (-?\d+)/)![1]) + DEFAULT_MOVEMENT.height).toBe(support(supportId).from.y);
  79  |   await page.evaluate(() => { (window as unknown as { timberKeyboardPilot: { frozen: boolean } }).timberKeyboardPilot.frozen = false; });
  80  |   return metadata;
  81  | }
  82  | 
  83  | for (const width of [426, 320]) test(`Timbers illustrated preview input journey and actual silhouette clearance at ${width}px`, async ({ page, browser }, info) => {
  84  |   test.setTimeout(180_000);
  85  |   const errors: string[] = [], responses: { path: string; status: number; sha256?: string; buildSha256?: string; error?: string }[] = [], pending: Promise<void>[] = [];
  86  |   page.on('pageerror', error => errors.push(error.message));
  87  |   page.on('response', response => {
  88  |     if (!response.url().includes('/assets/timbers/terrain-kit-v1/')) return;
  89  |     pending.push((async () => {
  90  |       const path = new URL(response.url()).pathname;
  91  |       const entry: typeof responses[number] = { path, status: response.status() }; responses.push(entry);
  92  |       try { entry.sha256 = hash(await response.body()); entry.buildSha256 = hash(readFileSync(new URL(`../dist${path}`, import.meta.url))); }
  93  |       catch (error) { entry.error = String(error); }
  94  |     })());
  95  |   });
  96  |   await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
  97  |   await installTimberKeyboardPilot(page); await installArtObserver(page);
  98  |   const start = async () => {
  99  |     await page.goto('/?scene=adventure&debug=1');
  100 |     await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  101 |     await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  102 |     await expect(page.locator('#status')).toContainText('X 100 Y 1046');
  103 |   };
  104 |   const histories: { name: string; result: object }[] = [];
  105 |   const route = async (name: string, stages: Parameters<typeof runTimberStages>[1]) => {
  106 |     const result = await runTimberStages(page, stages); histories.push({ name, result });
  107 |     expect(result, name).toMatchObject({ done: true, error: '' });
  108 |   };
  109 |   try {
  110 |     await start(); await capture(page, info, 'roots', width);
  111 |     await route('middle', TIMBER_TO_MIDDLE); await capture(page, info, 'middle', width, 'timber-middle');
  112 |     await route('under-spring', [{ kind: 'walk', x: 100 }]);
  113 |     const under = await capture(page, info, 'under-spring', width, 'timber-middle');
  114 |     const actor = under.probe.actor, worldX = Number(under.status.match(/X (-?\d+)/)![1]);
  115 |     const camera = { x: worldX - actor.feet.x, y: support('timber-middle').from.y - actor.feet.y };
  116 |     const spring = support('timber-spring');
  117 |     const springDraws = under.probe.frameDraws.filter(draw => draw.width === spring.width
  118 |       && Math.abs(draw.x - (spring.from.x - camera.x)) < 1 && Math.abs(draw.y - (spring.from.y - camera.y)) < 1);
  119 |     expect(springDraws).toHaveLength(1);
  120 |     expect(actor.bounds.top - springDraws[0].y - springDraws[0].height).toBeGreaterThanOrEqual(2);
  121 |     await route('spring-reward', TIMBER_SPRING_RETRY.slice(1, 2)); await capture(page, info, 'spring-reward', width, 'timber-spring-reward');
  122 |     await route('spring-catch', TIMBER_SPRING_RETRY.slice(2, 4));
  123 |     const caught = await capture(page, info, 'spring-catch', width, 'timber-spring-catch');
  124 |     const catchCameraX = Number(caught.status.match(/X (-?\d+)/)![1]) - caught.probe.actor.feet.x;
  125 |     const reward = support('timber-spring-reward');
  126 |     expect(caught.probe.actor.bounds.left + catchCameraX).toBeGreaterThan(reward.from.x + reward.width);
  127 |     await route('spring-repeat', TIMBER_SPRING_RETRY.slice(4)); await capture(page, info, 'spring-repeat', width, 'timber-spring-reward');
  128 |     await start(); await route('full-ascent', TIMBER_ASCENT_RIGHT);
  129 |     await page.getByRole('button', { name: 'Build your word', exact: true }).click();
  130 |     await page.getByRole('button', { name: 'Find more letters', exact: true }).click();
  131 |     await route('middle-edge', TIMBER_DESCENT_ALL.slice(0, 14)); await capture(page, info, 'return-middle-edge', width, 'timber-middle');
  132 |     await route('return720', TIMBER_DESCENT_ALL.slice(14, 15)); await capture(page, info, 'return720', width, 'timber-return-720');
  133 |     await route('return780', TIMBER_DESCENT_ALL.slice(15, 16)); await capture(page, info, 'return780', width, 'timber-return-780');
  134 |     await route('returned-roots', TIMBER_DESCENT_ALL.slice(16)); await capture(page, info, 'returned-roots', width);
  135 |     await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
  136 |     await Promise.all(pending);
  137 |     for (const file of new Set(['manifest.json', 'ground.png', ...timbersPreviewIds().map(id => manifest.platforms[id].image)])) {
  138 |       const delivered = responses.filter(response => response.path.endsWith('/' + file) && response.status === 200 && response.sha256);
  139 |       expect(delivered.length, String(file)).toBeGreaterThan(0);
  140 |       for (const response of delivered) expect(response.sha256).toBe(response.buildSha256);
  141 |     }
  142 |     expect(errors).toEqual([]);
  143 |   } finally {
  144 |     await Promise.all(pending);
  145 |     const path = info.outputPath('journey.json');
  146 |     const files = ['src/world/renderer.ts', 'src/world/assets.ts', 'src/world/timbers-terrain.ts', 'src/world/treetop-timbers.ts',
  147 |       'src/game/education.ts', 'dist/index.html', 'assets/source/timbers/illustrated-v1/preparation.json'];
  148 |     writeFileSync(path, JSON.stringify({ sourceRevision: process.env.BROWSER_REPORT_SOURCE_SHA ?? null,
  149 |       browser: browser.browserType().name(), version: browser.version(), width, errors, responses, histories,
  150 |       files: Object.fromEntries(files.map(file => [file, hash(readFileSync(new URL(`../${file}`, import.meta.url)))])) }, null, 2));
  151 |     await info.attach('journey', { path, contentType: 'application/json' });
  152 |   }
  153 | });
  154 | 
  155 | for (const file of ['manifest.json', 'ground.png', 'branch-580.png']) test(`Timbers required ${file} fails visibly and recovers with ordinary Retry`, async ({ page }, info) => {
  156 |   let fail = true;
  157 |   await page.route(`**/assets/timbers/terrain-kit-v1/${file}`, route => fail ? route.fulfill({ status: 503, body: 'intentional required-resource test' }) : route.continue());
  158 |   await page.goto('/?scene=adventure');
> 159 |   await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
      |                                                                          ^ Error: expect(locator).toBeVisible() failed
  160 |   const failedPath = info.outputPath('required-resource-failed.png'); await page.screenshot({ path: failedPath });
  161 |   await info.attach('required-resource-failed', { path: failedPath, contentType: 'image/png' });
  162 |   fail = false; await page.getByRole('button', { name: 'Retry', exact: true }).click();
  163 |   await page.getByRole('button', { name: 'TREETOP TIMBERS', exact: true }).click();
  164 |   await page.getByRole('button', { name: 'Play TREETOP TIMBERS', exact: true }).click();
  165 |   await expect(page.locator('#status')).toContainText('Playing');
  166 |   const recoveredPath = info.outputPath('required-resource-recovered.png'); await page.locator('#game').screenshot({ path: recoveredPath });
  167 |   await info.attach('required-resource-recovered', { path: recoveredPath, contentType: 'image/png' });
  168 | });
  169 | 
```