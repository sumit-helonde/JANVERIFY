import { expect, test } from '@playwright/test'

test.describe('Phase 16 UI Polish + Quality Pass', () => {
  test('evidence graph deep link renders the graph instead of a 404', async ({ page }) => {
    await page.goto('/projects/nrd-204/evidence-graph')
    await expect(page.getByTestId('evidence-graph')).toBeVisible()
    await expect(page.locator('.react-flow__node').first()).toBeVisible()
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Financial documentation' }).first()).toBeVisible()
  })

  test('NRD-204 killer demo renders all judge-critical content with real values', async ({ page }) => {
    await page.goto('/projects/nrd-204')
    await expect(page.getByText('₹50 Cr').first()).toBeVisible()
    await expect(page.getByText('₹8.2 Cr').first()).toBeVisible()
    await expect(page.getByText(/Financial documentation needs review/i).first()).toBeVisible()
    await expect(page.getByText(/The records don't fully agree yet/i).first()).toBeVisible()
    await expect(page.getByText(/SYNTHETIC HACKATHON DATA/i).first()).toBeVisible()
  })

  test('no horizontal overflow on mobile for home and project pages', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const route of ['/', '/projects/nrd-204']) {
      await page.goto(route)
      await page.waitForTimeout(400)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `overflow on ${route}`).toBeLessThanOrEqual(1)
    }
  })
})