import { expect, test } from '@playwright/test'

test.describe('Phase 16.5 Real Nagpur Public Data + Project Photos', () => {
  test('real public project page shows the REAL PUBLIC DATA tag, source and photo', async ({ page }) => {
    await page.goto('/projects/ngpm-002')
    await expect(page.getByText('REAL PUBLIC DATA — NAGPUR').first()).toBeVisible()
    await expect(page.getByText(/Maha-Metro|Maha Metro|Metro Rail Corporation/i).first()).toBeVisible()
    await expect(page.getByText(/Wikimedia Commons/i).first()).toBeVisible()
    await expect(page.locator('figure img').first()).toBeVisible()
  })

  test('project list exposes the data source filter and real/synthetic split', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByRole('button', { name: 'Real Public Data' })).toBeVisible()

    await page.getByRole('button', { name: 'Real Public Data' }).click()
    await expect(page.getByText('REAL PUBLIC DATA — NAGPUR').first()).toBeVisible()
    await expect(page.getByText('Nagpur Metro Rail Project — Phase II')).toBeVisible()

    await page.getByRole('button', { name: 'Synthetic Hackathon Data' }).click()
    await expect(page.getByText('REAL PUBLIC DATA — NAGPUR')).toHaveCount(0)
  })

  test('NRD-204 remains synthetic with unchanged killer-demo values', async ({ page }) => {
    await page.goto('/projects/nrd-204')
    await expect(page.getByText('₹50 Cr').first()).toBeVisible()
    await expect(page.getByText('₹8.2 Cr').first()).toBeVisible()
    await expect(page.getByText(/The records don't fully agree yet/i).first()).toBeVisible()
    await expect(page.getByText(/REAL PUBLIC DATA — NAGPUR/i)).toHaveCount(0)
  })
})