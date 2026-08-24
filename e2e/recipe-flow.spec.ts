import { expect, test } from '@playwright/test'

test.describe('empty state', () => {
  test('shows bundled recipes and an upload target', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Choose a recipe' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Upload a recipe JSON' })).toBeVisible()
    const exampleButtons = page.locator('.example-list-item')
    await expect(exampleButtons).not.toHaveCount(0)
  })
})

test.describe('viewing a bundled recipe', () => {
  test('loads a bundled example and renders the matrix view by default', async ({ page }) => {
    await page.goto('/')
    const firstExample = page.locator('.example-list-item').first()
    const title = (await firstExample.locator('span').innerText()).trim()
    await firstExample.click()

    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Matrix view' })).toHaveClass(/active/)
    await expect(page.locator('.recipe-matrix')).toBeVisible()
  })

  test('switches between matrix, traditional, and timeline views', async ({ page }) => {
    await page.goto('/')
    await page.locator('.example-list-item').first().click()

    await page.getByRole('button', { name: 'Traditional recipe' }).click()
    await expect(page.locator('.traditional-view')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Steps' })).toBeVisible()

    await page.getByRole('button', { name: 'Timeline' }).click()
    await expect(page.locator('.timeline-panel')).toBeVisible()

    await page.getByRole('button', { name: 'Matrix view' }).click()
    await expect(page.locator('.recipe-matrix')).toBeVisible()
  })

  test('completes and undoes a step in matrix view', async ({ page }) => {
    await page.goto('/')
    await page.locator('.example-list-item').first().click()

    await expect(page.locator('.progress-strip')).toHaveCount(0)

    await page.locator('.matrix-desktop .operation-cell button').first().click()

    await expect(page.getByText('Progress saved through step 1')).toBeVisible()

    await page.getByRole('button', { name: 'Undo step 1' }).click()
    await expect(page.locator('.progress-strip')).toHaveCount(0)
  })

  test('returns to the empty state via the home button', async ({ page }) => {
    await page.goto('/')
    await page.locator('.example-list-item').first().click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Return home' }).click()

    await expect(page.getByRole('heading', { name: 'Choose a recipe' })).toBeVisible()
  })

  test('loads a bundled example from the header example picker while a recipe is open', async ({ page }) => {
    await page.goto('/')
    await page.locator('.example-list-item').first().click()
    const firstTitle = await page.getByRole('heading', { level: 1 }).innerText()

    await page.getByRole('button', { name: 'Choose a new recipe' }).click()
    const options = await page.locator('.example-picker select option:not([disabled])').allTextContents()
    const otherTitle = options.find((label) => label !== firstTitle) ?? options[0]
    await page.locator('.example-picker select').selectOption({ label: otherTitle })

    await expect(page.getByRole('heading', { level: 1, name: otherTitle })).toBeVisible()
  })
})
