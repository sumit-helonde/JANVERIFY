import { expect, test, type Page } from '@playwright/test'

const TILE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

async function stubMapTiles(page: Page) {
  await page.route('**/*.png', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(TILE_PNG, 'base64'),
    }),
  )
}

async function collectErrors(page: Page) {
  const consoleErrors: string[] = []
  const pageErrors: Error[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => pageErrors.push(err))
  return { consoleErrors, pageErrors }
}

test.describe('reference dashboard', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('desktop: renders hero, metrics, map pins and NRD-204 detail', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = await collectErrors(page)
    await stubMapTiles(page)

    await page.goto('/')

    await expect(page.getByRole('link', { name: 'JANVERIFY' })).toBeVisible()
    await expect(
      page.getByText('See where public money is going.'),
    ).toBeVisible()
    await expect(page.getByText('127', { exact: true })).toBeVisible()
    await expect(page.getByText('\u20B92,840 Cr', { exact: true })).toBeVisible()
    await expect(page.getByText('83%', { exact: true })).toBeVisible()

    await expect(page.locator('.jv-pin')).toHaveCount(4)

    await expect(page.getByText('Featured Project · NRD-204')).toBeVisible()
    await expect(
      page.getByText('\u20B950 Cr', { exact: true }).first(),
    ).toBeVisible()
    await expect(
      page.getByText('\u20B947.8 Cr', { exact: true }).first(),
    ).toBeVisible()
    await expect(page.getByText('\u20B942 Cr', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('\u20B939 Cr', { exact: true }).first()).toBeVisible()
    await expect(page.getByTestId('trustmesh-state')).toHaveText('CONFLICTING')
    await expect(page.getByTestId('financial-review-amount')).toHaveText(
      '\u20B98.2 Cr',
    )

    const quickActions = page.getByRole('region', { name: 'Quick actions' })
    for (const action of [
      'View Evidence Graph',
      'Compare Projects',
      'Download Report',
      'Submit Evidence',
    ]) {
      await expect(quickActions.getByRole('link', { name: action })).toBeVisible()
    }

    // Search filters the project grid.
    await page.getByRole('searchbox', { name: 'Search projects' }).fill('water')
    await expect(page.getByText('Water Treatment Plant')).toBeVisible()
    await expect(page.getByText('City Hospital Expansion')).toBeHidden()

    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('desktop: tabs switch between Overview, Evidence, Financials, Timeline and Map', async ({
    page,
  }) => {
    await stubMapTiles(page)
    await page.goto('/')

    for (const tab of ['Overview', 'Evidence', 'Financials', 'Timeline', 'Map']) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible()
    }

    await page.getByRole('tab', { name: 'Evidence' }).click()
    await expect(page.getByText('Latest Site Inspection')).toBeVisible()
    await expect(page.getByText('Payment Voucher Batch')).toBeVisible()
    await expect(page.getByText('Citizen Photo Report')).toBeVisible()

    await page.getByRole('tab', { name: 'Timeline' }).click()
    await expect(page.getByText('Planning & approvals')).toBeVisible()
    await expect(page.getByText('Asphalt surfacing')).toBeVisible()
  })

  test('desktop: backend API is still reachable through the Vite proxy', async ({
    page,
  }) => {
    const response = await page.request.get('http://localhost:5173/api/health')
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({
      status: 'ok',
      service: 'janverify-api',
    })
  })
})

test.describe('tablet 768x1024', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('tablet: layout renders without horizontal overflow', async ({ page }) => {
    const { consoleErrors, pageErrors } = await collectErrors(page)
    await stubMapTiles(page)

    await page.goto('/')
    await expect(page.getByRole('link', { name: 'JANVERIFY' })).toBeVisible()
    await expect(page.locator('.jv-pin')).toHaveCount(4)

    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasOverflow).toBe(false)

    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})

test.describe('mobile 375x800', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('mobile: sidebar opens from the hamburger menu', async ({ page }) => {
    const { consoleErrors, pageErrors } = await collectErrors(page)
    await stubMapTiles(page)

    await page.goto('/')

    await expect(page.getByRole('link', { name: 'JANVERIFY' })).toBeVisible()
    await expect(page.locator('.jv-pin')).toHaveCount(4)

    await page.getByRole('button', { name: 'Open navigation menu' }).click()
    await expect(page.getByRole('link', { name: 'My Watchlist' })).toBeVisible()
    await expect(page.getByText('Independent.')).toBeVisible()

    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})