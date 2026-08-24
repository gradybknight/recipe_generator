import { describe, expect, it } from 'vitest'
import { validateRecipe } from './validateRecipe'
import type { Recipe } from '../types'
import sampleRecipeJson from '../../test/fixtures/sample-recipe.json'

const sampleRecipe = sampleRecipeJson as Recipe

describe('validateRecipe', () => {
  it('accepts a well-formed recipe', () => {
    expect(validateRecipe(sampleRecipe)).toEqual([])
  })

  it('rejects non-object candidates', () => {
    expect(validateRecipe(null)).toEqual(['Recipe JSON must contain one object'])
    expect(validateRecipe([1, 2, 3])).toEqual(['Recipe JSON must contain one object'])
    expect(validateRecipe('a string')).toEqual(['Recipe JSON must contain one object'])
  })

  it('reports every missing required field', () => {
    const errors = validateRecipe({ title: 'Only a title' })
    expect(errors).toContain('Missing required field: schema_version')
    expect(errors).toContain('Missing required field: servings')
    expect(errors).toContain('Missing required field: components')
    expect(errors).toContain('Missing required field: ingredients')
    expect(errors).toContain('Missing required field: steps')
    expect(errors).toContain('Missing required field: notes')
    expect(errors).toContain('Missing required field: validation')
  })

  it('requires components, ingredients, and steps to be arrays', () => {
    const candidate = {
      ...sampleRecipe,
      components: {},
    }
    expect(validateRecipe(candidate)).toEqual(['components, ingredients, and steps must be arrays'])
  })

  it('flags an ingredient that references an unknown component', () => {
    const candidate = structuredClone(sampleRecipe)
    candidate.ingredients[0].component_id = 'component-does-not-exist'
    expect(validateRecipe(candidate)).toContain('ingredient-potato references an unknown component')
  })

  it('flags an ingredient with a non-integer row_order', () => {
    const candidate = structuredClone(sampleRecipe)
    candidate.ingredients[0].row_order = 1.5
    expect(validateRecipe(candidate)).toContain('ingredient-potato needs an integer row_order')
  })

  it('allows first_use_step to be null but rejects other non-integers', () => {
    const withNull = structuredClone(sampleRecipe)
    withNull.ingredients[0].first_use_step = null
    expect(validateRecipe(withNull)).toEqual([])

    const withBadValue: any = structuredClone(sampleRecipe)
    withBadValue.ingredients[0].first_use_step = 'soon'
    expect(validateRecipe(withBadValue)).toContain('ingredient-potato needs an integer or null first_use_step')
  })

  it('flags a step that references an unknown input or output id', () => {
    const candidate = structuredClone(sampleRecipe)
    candidate.steps[0].inputs.push({ type: 'ingredient', id: 'ingredient-ghost' })
    expect(validateRecipe(candidate)).toContain('step-1 references an unknown ID: ingredient-ghost')
  })

  it('flags duplicate ingredient row_order values', () => {
    const candidate = structuredClone(sampleRecipe)
    candidate.ingredients[1].row_order = candidate.ingredients[0].row_order
    expect(validateRecipe(candidate)).toContain('ingredient row_order values must be unique')
  })
})
