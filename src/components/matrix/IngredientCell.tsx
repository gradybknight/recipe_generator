import type { Ingredient } from '../../types'

const colors: Record<string, string> = {
  'component-salad': 'sage',
  'component-dressing': 'gold',
  'component-guacamole': 'sage',
  'component-optional': 'gold',
}

export function IngredientCell({ item, isStepStart }: { item: Ingredient; isStepStart: boolean }) {
  const label = item.quantity.display === null
    ? item.display
    : <>{item.name}{item.prep && <em>, {item.prep}</em>}</>
  return (
    <div className={`matrix-ingredient ${colors[item.component_id] || ''} ${isStepStart ? 'step-start' : ''}`}>
      <span className="matrix-amount">{item.quantity.display}</span>
      <span>
        {label}
        {item.optional && <em> (optional)</em>}
      </span>
    </div>
  )
}
