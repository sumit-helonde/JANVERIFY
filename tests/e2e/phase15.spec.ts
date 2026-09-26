import { expect, test } from '@playwright/test'

test.describe('Phase 15 Authentication + RBAC + Audit Logs', () => {
  test('anonymous user is blocked from audit logs and sees an honest error', async ({ page }) => {
    await page.goto('/audit-logs')
    await expect(page.getByText(/sign in with a reviewer or admin account/i)).toBeVisible()
  })

  test('admin can sign in, view audit logs, and sign out', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('synthetic.admin.001@janverify.test')
    await page.getByLabel('Password').fill('admin:1')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Synthetic Admin')).toBeVisible()
    await expect(page.getByText('admin', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Audit Logs' })).toBeVisible()

    await page.getByRole('link', { name: 'Audit Logs' }).click()
    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByText('Synthetic Admin')).not.toBeVisible()
  })

  test('non-privileged signed-in user does not see Audit Logs', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('synthetic.citizen.001@janverify.test')
    await page.getByLabel('Password').fill('citizen:1')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Synthetic Citizen')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Audit Logs' })).not.toBeVisible()

    await page.goto('/audit-logs')
    await expect(page.getByText(/sign in with a reviewer or admin account/i)).toBeVisible()
  })
})