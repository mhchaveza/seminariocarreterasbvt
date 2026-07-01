import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();
const base = 'http://localhost:4322';
const pages = [
  { path: '/', name: 'home' },
  { path: '/patrocinio', name: 'patrocinio' },
  { path: '/inscripcion', name: 'inscripcion' },
];
const viewports = [
  { name: 'mobile', width: 375, height: 812, deviceScaleFactor: 2, isMobile: true },
  { name: 'desktop', width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false },
];

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
  });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(base + p.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const file = `screenshots/${p.name}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log('saved', file);
  }
  await ctx.close();
}
await browser.close();
