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

function assertClean(errors: { consoleErrors: string[]; pageErrors: Error[] }) {
  expect(errors.pageErrors).toEqual([])
  expect(errors.consoleErrors).toEqual([])
}

test.describe('phase 2 routes: direct URL + browser refresh', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  const routes: Array<{
    path: string
    assert: (page: Page) => Promise<void>
  }> = [
    {
      path: '/',
      assert: async (page) => {
        await expect(page.getByText('See where public money is going.')).toBeVisible()
        await expect(page.getByText('127', { exact: true })).toBeVisible()
      },
    },
    {
      path: '/projects',
      assert: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'Projects', level: 1 }),
        ).toBeVisible()
        await expect(page.getByText('City Hospital Expansion')).toBeVisible()
      },
    },
    {
      path: '/projects/NRD-204',
      assert: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'Ward 24 Road Development', level: 2 }),
        ).toBeVisible()
        await expect(
          page.getByRole('link', { name: /BuildRight Infra Pvt\. Ltd\./ }).first(),
        ).toBeVisible()
      },
    },
    {
      path: '/contractors/CTR-001',
      assert: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'BuildRight Infra Pvt. Ltd.', level: 1 }),
        ).toBeVisible()
        await expect(
          page.getByRole('heading', { name: 'Inspection records' }),
        ).toBeVisible()
        await expect(page.getByText(/score/i)).toHaveCount(0)
      },
    },
    {
      path: '/tenders/TND-2024-118',
      assert: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'Public Works', level: 1 }),
        ).toBeVisible()
        await expect(
          page.getByRole('heading', { name: 'Tender details', level: 2 }),
        ).toBeVisible()
        await expect(page.getByText('TND-2024-118', { exact: true }).first()).toBeVisible()
      },
    },
    {
      path: '/compare',
      assert: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'Compare Projects', level: 1 }),
        ).toBeVisible()
      },
    },
    {
      path: '/reports',
      assert: async (page) => {
        await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible()
      },
    },
    {
      path: '/evidence',
      assert: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'Evidence', level: 1 }),
        ).toBeVisible()
      },
    },
    {
      path: '/submit-evidence',
      assert: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'Submit Evidence', level: 1 }),
        ).toBeVisible()
      },
    },
    {
      path: '/about',
      assert: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'About JANVERIFY', level: 1 }),
        ).toBeVisible()
      },
    },
  ]

  for (const route of routes) {
    test(`opens ${route.path} and survives a browser refresh`, async ({ page }) => {
      const errors = await collectErrors(page)
      await stubMapTiles(page)

      await page.goto(route.path)
      await expect(page.getByRole('link', { name: 'JANVERIFY' })).toBeVisible()
      await route.assert(page)

      await page.reload()
      await expect(page.getByRole('link', { name: 'JANVERIFY' })).toBeVisible()
      await route.assert(page)

      assertClean(errors)
    })
  }
})

test.describe('phase 2 navigation', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('home → projects → project → contractor → project → tender → shells', async ({
    page,
  }) => {
    const errors = await collectErrors(page)
    await stubMapTiles(page)

    await page.goto('/')
    await expect(page.getByText('127', { exact: true })).toBeVisible()

    const primaryNav = page.getByRole('navigation', { name: 'Primary' })
    await primaryNav.getByRole('link', { name: 'Projects' }).click()
    await expect(
      page.getByRole('heading', { name: 'Projects', level: 1 }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Open Ward 24 Road Development' }).click()
    await expect(
      page.getByRole('heading', { name: 'Ward 24 Road Development', level: 2 }),
    ).toBeVisible()

    await page.getByRole('link', { name: /BuildRight Infra Pvt\. Ltd\./ }).click()
    await expect(
      page.getByRole('heading', { name: 'BuildRight Infra Pvt. Ltd.', level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Inspection records' }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Ward 24 Road Development' }).click()
    await expect(
      page.getByRole('heading', { name: 'Ward 24 Road Development', level: 2 }),
    ).toBeVisible()

    await page.getByRole('link', { name: /TND-2024-118/ }).first().click()
    await expect(
      page.getByRole('heading', { name: 'Public Works', level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('\u20B951.2 Cr', { exact: true })).toBeVisible()

    for (const [label, heading] of [
      ['Compare', 'Compare Projects'],
      ['Reports', 'Reports'],
      ['About', 'About JANVERIFY'],
    ] as const) {
      await primaryNav.getByRole('link', { name: label }).click()
      await expect(
        page.getByRole('heading', { name: heading, level: 1 }),
      ).toBeVisible()
    }

    assertClean(errors)
  })
})

test.describe('phase 2 responsive integrity', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('simple and detail pages render without horizontal overflow', async ({
    page,
  }) => {
    const errors = await collectErrors(page)
    await stubMapTiles(page)

    for (const [path, assertHeading, level] of [
      ['/compare', 'Compare Projects', 1],
      ['/contractors/CTR-001', 'BuildRight Infra Pvt. Ltd.', 1],
      ['/tenders/TND-2024-118', 'Public Works', 1],
      ['/projects/NRD-204', 'Ward 24 Road Development', 2],
    ] as const) {
      await page.goto(path)
      await expect(
        page.getByRole('heading', { name: assertHeading, level }),
      ).toBeVisible()

      const hasOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(hasOverflow).toBe(false)
    }

    assertClean(errors)
  })
})