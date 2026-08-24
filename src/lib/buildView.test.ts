import { describe, expect, it } from 'vitest'
import { buildView, type MatrixRow } from './buildView'
import type { Recipe } from '../types'
import sampleRecipeJson from '../../test/fixtures/sample-recipe.json'

const sampleRecipe = sampleRecipeJson as Recipe

function asSummaryRow(row: MatrixRow) {
  if (row.type !== 'summary') throw new Error(`expected a summary row, got ${row.type}`)
  return row
}

describe('buildView', () => {
  it('sorts ingredients by row_order and keeps every ingredient as its own row when nothing is completed', () => {
    const { ingredients, rows } = buildView(sampleRecipe, 0)
    expect(ingredients.map((item) => item.id)).toEqual([
      'ingredient-potato',
      'ingredient-onion',
      'ingredient-egg',
      'ingredient-hotsauce',
    ])
    expect(rows.every((row) => row.type === 'ingredient')).toBe(true)
    expect(rows).toHaveLength(4)
  })

  it('includes a layout for every step when nothing is completed', () => {
    const { layouts } = buildView(sampleRecipe, 0)
    expect(layouts.map((layout) => layout.step.id)).toEqual(['step-1', 'step-2', 'step-3'])
  })

  it('spans a layout across the rows its inputs touch', () => {
    const { layouts } = buildView(sampleRecipe, 0)
    // step-1 uses potato (row 0) and onion (row 1) directly.
    const step1 = layouts.find((layout) => layout.step.id === 'step-1')
    expect(step1).toMatchObject({ start: 0, end: 1, span: 2 })

    // step-2 uses component-main (potato/onion, first used before step 2 -> rows 0-1)
    // plus hotsauce directly (row 3).
    const step2 = layouts.find((layout) => layout.step.id === 'step-2')
    expect(step2).toMatchObject({ start: 0, end: 3, span: 4 })

    // step-3 uses component-main (only potato/onion were used *before* step 3 -> rows 0-1)
    // plus egg directly (row 2). The egg itself isn't part of component-main's carry-forward
    // because its first_use_step (3) is not strictly before step 3.
    const step3 = layouts.find((layout) => layout.step.id === 'step-3')
    expect(step3).toMatchObject({ start: 0, end: 2, span: 3 })
  })

  it('collapses ingredients whose first use and last use are both completed into a summary row', () => {
    const { rows } = buildView(sampleRecipe, 1)
    // potato and onion are both first-used and last (directly) used in step 1, so they collapse.
    // egg (first used step 3) and hotsauce (first used step 2) stay as their own rows.
    expect(rows).toHaveLength(3)
    const summary = asSummaryRow(rows[0])
    expect(summary.items.map((item) => item.id).sort()).toEqual(['ingredient-onion', 'ingredient-potato'])
    expect(rows[1]).toMatchObject({ type: 'ingredient', item: { id: 'ingredient-egg' } })
    expect(rows[2]).toMatchObject({ type: 'ingredient', item: { id: 'ingredient-hotsauce' } })
  })

  it('excludes completed steps from the layouts', () => {
    const { layouts } = buildView(sampleRecipe, 1)
    expect(layouts.map((layout) => layout.step.id)).toEqual(['step-2', 'step-3'])
  })

  it('labels a summary row with the component names of its collapsed ingredients', () => {
    const { rows } = buildView(sampleRecipe, 1)
    expect(asSummaryRow(rows[0]).label).toBe('Main — prepared')
  })

  it('never collapses ingredients when completedThrough is 0', () => {
    const { rows } = buildView(sampleRecipe, 0)
    expect(rows.some((row) => row.type === 'summary')).toBe(false)
  })
})
