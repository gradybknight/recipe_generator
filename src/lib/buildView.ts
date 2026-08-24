import type { Ingredient, Recipe, Step, StepToken } from '../types'

export type MatrixRow =
  | { type: 'ingredient'; item: Ingredient }
  | { type: 'summary'; items: Ingredient[]; label: string }

export interface StepLayout {
  step: Step
  start: number
  end: number
  span: number
}

export interface MatrixView {
  ingredients: Ingredient[]
  rows: MatrixRow[]
  layouts: StepLayout[]
}

export function buildView(recipe: Recipe, completedThrough: number): MatrixView {
  const ingredients = [...recipe.ingredients].sort((a, b) => a.row_order - b.row_order)
  const componentNames = Object.fromEntries(recipe.components.map((component) => [component.id, component.name]))
  const summaryLabel = (items: Ingredient[]) => {
    const names = [...new Set(items.map((item) => componentNames[item.component_id] || 'Prepared component'))]
    return `${names.join(' + ')} — prepared`
  }
  const directUses: Record<string, number[]> = Object.fromEntries(ingredients.map((item) => [item.id, recipe.steps
    .filter((step) => step.inputs.some((token) => token.type === 'ingredient' && token.id === item.id))
    .map((step) => step.order)]))

  const rows: MatrixRow[] = []
  let collapsedItems: Ingredient[] = []
  const flushCollapsed = () => {
    if (!collapsedItems.length) return
    rows.push({ type: 'summary', items: collapsedItems, label: summaryLabel(collapsedItems) })
    collapsedItems = []
  }
  ingredients.forEach((item) => {
    const uses = directUses[item.id]
    const lastDirectUse = Math.max(...(uses.length ? uses : [0]))
    const canCollapse = completedThrough > 0 && item.first_use_step !== null && item.first_use_step <= completedThrough && lastDirectUse <= completedThrough
    if (canCollapse) collapsedItems.push(item)
    else {
      flushCollapsed()
      rows.push({ type: 'ingredient', item })
    }
  })
  flushCollapsed()

  const rowIndex = new Map<string, number>()
  rows.forEach((row, index) => {
    if (row.type === 'summary') row.items.forEach((item) => rowIndex.set(item.id, index))
    else rowIndex.set(row.item.id, index)
  })
  const componentItems: Record<string, Ingredient[]> = Object.fromEntries(recipe.components.map((component) => [component.id, ingredients.filter((item) => item.component_id === component.id)]))
  const boundsFor = (token: StepToken, step: Step): number[] => {
    const items = token.type === 'ingredient'
      ? [ingredients.find((item) => item.id === token.id)]
      : (componentItems[token.id] || []).filter((item) => item.first_use_step !== null && item.first_use_step < step.order)
    return items
      .filter((item): item is Ingredient => Boolean(item))
      .map((item) => rowIndex.get(item.id))
      .filter((index): index is number => index !== undefined)
  }
  const layouts: StepLayout[] = recipe.steps.filter((step) => step.order > completedThrough).map((step) => {
    const indexes = step.inputs.flatMap((token) => boundsFor(token, step))
    const start = indexes.length ? Math.min(...indexes) : 0
    const end = indexes.length ? Math.max(...indexes) : Math.max(0, rows.length - 1)
    return { step, start, end, span: end - start + 1 }
  })
  return { ingredients, rows, layouts }
}
