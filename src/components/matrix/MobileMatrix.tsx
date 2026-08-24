import type { Ingredient, Recipe, Step } from '../../types'
import type { StepLayout } from '../../lib/buildView'
import { formatCriticalDetail } from '../../lib/formatCriticalDetail'

interface MobileMatrixProps {
  recipe: Recipe
  ingredients: Ingredient[]
  layouts: StepLayout[]
  completedThrough: number
  onComplete: (order: number) => void
  onUndo: () => void
}

type MobileMatrixInput =
  | { type: 'ingredient'; item: Ingredient }
  | { type: 'component'; label: string }

export function MobileMatrix({ recipe, ingredients, layouts, completedThrough, onComplete, onUndo }: MobileMatrixProps) {
  const inputsFor = (step: Step): MobileMatrixInput[] => {
    const seen = new Set<string>()
    return step.inputs.flatMap((token): MobileMatrixInput[] => {
      if (token.type === 'ingredient') {
        const item = ingredients.find((ingredient) => ingredient.id === token.id)
        return item && !seen.has(item.id) ? (seen.add(item.id), [{ type: 'ingredient', item }]) : []
      }
      const component = recipe.components.find((candidate) => candidate.id === token.id)
      return [{ type: 'component', label: component?.name === 'Main' ? 'Prepared ingredients' : `Prepared ${component?.name.toLowerCase() || 'component'}` }]
    })
  }

  return (
    <div className="mobile-matrix">
      {completedThrough > 0 && <div className="mobile-completed">
        <span className="summary-check">✓</span>
        <div><strong>Completed through step {completedThrough}</strong><small>Ingredients are ready and tucked away</small></div>
        <button type="button" onClick={onUndo}>undo</button>
      </div>}
      <div className="mobile-step-list">
        {layouts.map((layout) => {
          const items = inputsFor(layout.step)
          return <article className="mobile-step-card" key={layout.step.id}>
            <div className="mobile-step-heading"><span>{String(layout.step.order).padStart(2, '0')}</span><strong>{layout.step.card_label}</strong></div>
            {layout.step.card_detail && <small className="mobile-step-detail">{formatCriticalDetail(layout.step.card_detail)}</small>}
            {items.length > 0 && <div className="mobile-step-ingredients">
              {items.map((input, index) => input.type === 'ingredient'
                ? <div key={input.item.id}><span>{input.item.quantity.display}</span>{input.item.name}{input.item.prep && <em>, {input.item.prep}</em>}</div>
                : <div className="mobile-prepared-input" key={`${input.label}-${index}`}>{input.label}</div>)}
            </div>}
            <button type="button" className="mobile-complete-button" onClick={() => onComplete(layout.step.order)}>Mark complete</button>
          </article>
        })}
      </div>
    </div>
  )
}
