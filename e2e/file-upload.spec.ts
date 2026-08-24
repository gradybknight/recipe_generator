import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sampleRecipePath = path.join(__dirname, '..', 'test', 'fixtures', 'sample-recipe.json')
const sampleRecipe = JSON.parse(fs.readFileSync(sampleRecipePath, 'utf-8'))

test('loads a valid uploaded recipe JSON from the empty state', async ({ page }) => {
  await page.goto('/')
  await page.locator('.upload-target input[type="file"]').setInputFiles({
    name: 'sample-recipe.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sampleRecipe)),
  })

  await expect(page.getByRole('heading', { level: 1, name: sampleRecipe.title })).toBeVisible()
  await expect(page.locator('.loaded-file')).toHaveText('sample-recipe.json')
})

test('shows an error for malformed JSON without leaving the empty state', async ({ page }) => {
  await page.goto('/')
  await page.locator('.upload-target input[type="file"]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ this is not valid json'),
  })

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Choose a recipe' })).toBeVisible()
})

test('shows validation errors for JSON missing required fields', async ({ page }) => {
  const incomplete = { ...sampleRecipe }
  delete incomplete.steps

  await page.goto('/')
  await page.locator('.upload-target input[type="file"]').setInputFiles({
    name: 'incomplete-recipe.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(incomplete)),
  })

  await expect(page.getByRole('alert')).toContainText('Missing required field: steps')
  await expect(page.getByRole('heading', { name: 'Choose a recipe' })).toBeVisible()
})

test('uploading a replacement recipe from the loaded-recipe header resets progress', async ({ page }) => {
  await page.goto('/')
  await page.locator('.example-list-item').first().click()
  await page.locator('.matrix-desktop .operation-cell button').first().click()
  await expect(page.locator('.progress-strip')).toBeVisible()

  await page.locator('.file-picker input[type="file"]').setInputFiles({
    name: 'sample-recipe.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sampleRecipe)),
  })

  await expect(page.getByRole('heading', { level: 1, name: sampleRecipe.title })).toBeVisible()
  await expect(page.locator('.progress-strip')).toHaveCount(0)
})
