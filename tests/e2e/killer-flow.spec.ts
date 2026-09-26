import { expect, test } from '@playwright/test'

test('killer flow: homepage search → NRD-204 → TRUSTMESH → FRAUDSCOPE → evidence', async ({ page }) => {
  const hardErrors: string[] = []
  page.on('pageerror', (err) => hardErrors.push(String(err)))

  await page.goto('/')
  const search = page.getByRole('searchbox', { name: 'Search projects' })
  await expect(search).toBeVisible()
  await search.fill('NRD-204')

  await page.getByRole('link', { name: /Open Ward 24 Road Development/ }).click()
  await expect(page).toHaveURL(/\/projects\/NRD-204/)
  await expect(
    page.getByRole('region', { name: /Project details: Ward 24 Road/ }).getByRole('heading', { name: 'Ward 24 Road Development' }),
  ).toBeVisible()

  await expect(page.getByTestId('trustmesh-state')).toContainText(/Conflicting/i)
  await expect(page.getByText(/The records don.*fully agree yet/i).first()).toBeVisible()

  await expect(page.getByText('Financial / Procurement Review', { exact: false }).first()).toBeVisible()

  await page.getByRole('tab', { name: 'Evidence' }).click()
  await expect(page.getByRole('heading', { name: 'Citizen Evidence' })).toBeVisible()

  await expect(page.getByText(/Fraud confirmed/i)).toHaveCount(0)
  await expect(page.getByText(/Corruption confirmed/i)).toHaveCount(0)
  expect(hardErrors).toEqual([])
})