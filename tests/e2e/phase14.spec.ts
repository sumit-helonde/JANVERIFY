import { expect, test } from '@playwright/test'

test('phase 14 compare: metrics load from backend and filters update', async ({ page }) => {
  await page.goto('/compare')
  await expect(page.getByText('Total projects', { exact: false }).first()).toBeVisible()
  await expect(page.getByTestId('compare-metrics')).toBeVisible()
  await expect(page.getByText('Sanctioned', { exact: false }).first()).toBeVisible()
  const depSelect = page.getByLabel('Department')
  await expect(depSelect).toBeVisible()
  await depSelect.selectOption({ index: 1 })
  await expect(page.getByText(/\· Communication \[SYNTHETIC HACKATHON DATA\]/i).first()).toBeVisible()
})

test('phase 14 reports: open NRD-204 report with real values', async ({ page }) => {
  await page.goto('/reports')
  await expect(page.getByText('Available reports', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: /NRD-204/ }).click()
  const view = page.getByTestId('report-view')
  await expect(view.getByRole('heading', { name: /NRD-204 — Ward 24 Road Development/ })).toBeVisible()
  await expect(view.getByText('₹50 Cr', { exact: false }).first()).toBeVisible()
  await expect(view.getByText('FINANCIAL TRAIL', { exact: false })).toBeVisible()
  await expect(view.getByText('TRUSTMESH DECISION', { exact: false })).toBeVisible()
  await expect(view.getByText(/Financial documentation needs review/i)).toBeVisible()
  await expect(view.getByText('SOURCES', { exact: false })).toBeVisible()
  await expect(page.getByText(/Fraud confirmed/i)).toHaveCount(0)
  await expect(page.getByText(/Corruption confirmed/i)).toHaveCount(0)
})