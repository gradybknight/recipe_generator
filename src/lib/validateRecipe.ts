export function validateRecipe(candidate: unknown): string[] {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return ['Recipe JSON must contain one object']
  const errors: string[] = []
  const required = ['schema_version', 'title', 'servings', 'components', 'ingredients', 'steps', 'notes', 'validation']
  required.forEach((field) => {
    if (!(field in candidate)) errors.push(`Missing required field: ${field}`)
  })
  if (errors.length) return errors
  const record = candidate as Record<string, unknown>
  if (!Array.isArray(record.components) || !Array.isArray(record.ingredients) || !Array.isArray(record.steps)) {
    return ['components, ingredients, and steps must be arrays']
  }
  const components = record.components as Array<{ id: string }>
  const ingredients = record.ingredients as Array<Record<string, any>>
  const steps = record.steps as Array<Record<string, any>>
  const componentIds = new Set(components.map((item) => item.id))
  const ingredientIds = new Set(ingredients.map((item) => item.id))
  const stepIds = new Set(steps.map((item) => item.id))
  const allIds = new Set([...componentIds, ...ingredientIds, ...stepIds])
  ingredients.forEach((item) => {
    if (!componentIds.has(item.component_id)) errors.push(`${item.id} references an unknown component`)
    if (!Number.isInteger(item.row_order)) errors.push(`${item.id} needs an integer row_order`)
    if (item.first_use_step !== null && !Number.isInteger(item.first_use_step)) errors.push(`${item.id} needs an integer or null first_use_step`)
  })
  steps.forEach((step) => {
    ;[...(step.inputs || []), ...(step.outputs || [])].forEach((token: { id: string }) => {
      if (!allIds.has(token.id)) errors.push(`${step.id} references an unknown ID: ${token.id}`)
    })
  })
  if (new Set(ingredients.map((item) => item.row_order)).size !== ingredients.length) errors.push('ingredient row_order values must be unique')
  return errors
}
