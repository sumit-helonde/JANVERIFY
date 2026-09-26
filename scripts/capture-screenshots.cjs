const { chromium } = require('@playwright/test')
const TILE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

;(async () => {
  const browser = await chromium.launch()
  const views = [
    [1280, 800, 'desktop'],
    [768, 1024, 'tablet'],
    [375, 800, 'mobile'],
  ]
  for (const [w, h, name] of views) {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    await page.route('**/*.png', (r) =>
      r.fulfill({
        contentType: 'image/png',
        body: Buffer.from(TILE_PNG, 'base64'),
      }),
    )
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('.jv-pin')
    await page.waitForTimeout(800)
    await page.screenshot({
      path: `docs/screenshots/phase1-${name}.png`,
      fullPage: true,
    })
    console.log('saved phase1-' + name + '.png')
    await page.close()
  }
  await browser.close()
})()