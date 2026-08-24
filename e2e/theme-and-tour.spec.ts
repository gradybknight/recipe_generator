import { expect, test } from '@playwright/test'

test.describe('dark mode', () => {
  test('toggles from the empty state', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    await page.getByRole('button', { name: 'Dark mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Light mode' })).toBeVisible()

    await page.getByRole('button', { name: 'Light mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('toggles while a recipe is loaded', async ({ page }) => {
    await page.goto('/')
    await page.locator('.example-list-item').first().click()

    const toggle = page.getByRole('button', { name: 'Switch to dark mode' })
    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
  })
})

test.describe('guided tour', () => {
  test('opens, advances, and closes with the × button', async ({ page }) => {
    await page.goto('/')
    await page.locator('.example-list-item').first().click()

    await page.getByRole('button', { name: 'How this works' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Start with the ingredient column' })).toBeVisible()

    await dialog.getByRole('button', { name: 'Next' }).click()
    await expect(dialog.getByRole('heading', { name: 'Read the recipe from left to right' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Back' })).toBeVisible()

    await dialog.getByRole('button', { name: 'Next' }).click()
    await expect(dialog.getByRole('heading', { name: 'Click an operation when it is done' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Done' })).toBeVisible()

    await dialog.getByRole('button', { name: 'Close tour' }).click()
    await expect(dialog).toBeHidden()
  })

  test('navigates with the keyboard and closes on Escape', async ({ page }) => {
    await page.goto('/')
    await page.locator('.example-list-item').first().click()
    await page.getByRole('button', { name: 'How this works' }).click()

    const dialog = page.getByRole('dialog')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(dialog.getByRole('heading', { name: 'Click an operation when it is done' })).toBeVisible()

    await page.keyboard.press('ArrowLeft')
    await expect(dialog.getByRole('heading', { name: 'Read the recipe from left to right' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('closes when clicking the backdrop', async ({ page }) => {
    await page.goto('/')
    await page.locator('.example-list-item').first().click()
    await page.getByRole('button', { name: 'How this works' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.locator('.tour-backdrop').click({ position: { x: 5, y: 5 } })
    await expect(dialog).toBeHidden()
  })
})
