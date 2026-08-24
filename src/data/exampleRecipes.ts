import type { Recipe } from '../types'

export interface ExampleEntry {
  path: string
  recipe: Recipe
}

const exampleModules = import.meta.glob('../../example_recipes/*.json', { eager: true, import: 'default' }) as Record<string, Recipe>

export const exampleRecipes: ExampleEntry[] = Object.entries(exampleModules)
  .map(([path, recipe]) => ({ path, recipe }))
  .sort((a, b) => a.recipe.title.localeCompare(b.recipe.title))
