import type { Recipe } from '../types'
import { formatCriticalDetail } from '../lib/formatCriticalDetail'

export function TraditionalView({ recipe }: { recipe: Recipe }) {
  const ingredients = [...recipe.ingredients].sort((a, b) => a.row_order - b.row_order)
  return (
    <section className="traditional-view">
      <div className="traditional-panel">
        <div className="traditional-panel-heading">
          <div className="section-kicker">Mise en place</div>
          <h2>Ingredients</h2>
        </div>
        {recipe.components.map((component) => (
          <section className="traditional-group" key={component.id}>
            <h3>{component.name}</h3>
            {ingredients.filter((item) => item.component_id === component.id).map((item) => (
              <div className="traditional-ingredient" key={item.id}>
                <span>{item.display}</span>
                {item.optional && <em>optional</em>}
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className="traditional-panel">
        <div className="traditional-panel-heading">
          <div className="section-kicker">Method</div>
          <h2>Steps</h2>
        </div>
        <div className="traditional-steps">
          {recipe.steps.map((step) => (
            <article className="traditional-step" key={step.id}>
              <div className="traditional-step-number">{String(step.order).padStart(2, '0')}</div>
              <div>
                <h3>{step.card_label}</h3>
                <p>{step.text}</p>
                {step.card_detail && <small>{formatCriticalDetail(step.card_detail)}</small>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
