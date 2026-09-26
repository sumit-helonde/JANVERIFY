const { chromium } = require('@playwright/test')
const TILE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const SHOTS = [
  { path: '/projects', viewport: [1280, 800], file: 'phase2-projects-desktop.png', wait: 'h1' },
  { path: '/projects/NRD-204', viewport: [1280, 800], file: 'phase2-project-desktop.png', wait: 'h2' },
  { path: '/contractors/CTR-001', viewport: [1280, 800], file: 'phase2-contractor-desktop.png', wait: 'h1' },
  { path: '/tenders/TND-2024-118', viewport: [1280, 800], file: 'phase2-tender-desktop.png', wait: 'h1' },
  { path: '/compare', viewport: [1280, 800], file: 'phase2-compare-desktop.png', wait: 'h1' },
  { path: '/submit-evidence', viewport: [1280, 800], file: 'phase2-submit-evidence-desktop.png', wait: 'h1' },
  { path: '/about', viewport: [1280, 800], file: 'phase2-about-desktop.png', wait: 'h1' },
  { path: '/contractors/CTR-001', viewport: [768, 1024], file: 'phase2-contractor-tablet.png', wait: 'h1' },
  { path: '/projects/NRD-204', viewport: [375, 800], file: 'phase2-project-mobile.png', wait: 'h2' },
]

;(async () => {
  const browser = await chromium.launch()
  for (const { path, viewport, file, wait } of SHOTS) {
    const page = await browser.newPage({ viewport: { width: viewport[0], height: viewport[1] } })
    await page.route('**/*.png', (r) =>
      r.fulfill({
        contentType: 'image/png',
        body: Buffer.from(TILE_PNG, 'base64'),
      }),
    )
    await page.goto('http://localhost:5173' + path)
    await page.waitForSelector(wait)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `docs/screenshots/${file}`, fullPage: true })
    console.log('saved ' + file)
    await page.close()
  }
  await browser.close()
})()