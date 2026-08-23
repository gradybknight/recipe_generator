import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import recipe from './recipe.json'
import './styles.css'

const colors = {
  'component-salad': 'sage',
  'component-dressing': 'gold',
}

function buildLayout(recipe) {
  const ingredients = [...recipe.ingredients].sort((a, b) => a.row_order - b.row_order)
  const ingredientIndex = Object.fromEntries(ingredients.map((item, index) => [item.id, index]))
  const componentIndexes = Object.fromEntries(recipe.components.map((component) => {
    return [component.id, ingredients.map((item, index) => ({ item, index }))]
  }))

  const boundsFor = (token, step) => {
    const indexes = token.type === 'ingredient'
      ? [ingredientIndex[token.id]]
      : componentIndexes[token.id]
        .filter(({ item }) => item.first_use_step !== null && item.first_use_step < step.order)
        .map(({ index }) => index)
    return indexes.filter((index) => index !== undefined)
  }

  return recipe.steps.map((step) => {
    const indexes = step.inputs.flatMap((token) => boundsFor(token, step))
    const start = Math.min(...indexes)
    const end = Math.max(...indexes)
    return { step, start, end, span: end - start + 1 }
  })
}

function IngredientCell({ item, isStart }) {
  return (
    <div className={`matrix-ingredient ${colors[item.component_id] || ''} ${isStart ? 'component-start' : ''}`}>
      <span className="matrix-amount">{item.quantity.display}</span>
      <span>
        {item.name}
        {item.prep && <em>, {item.prep}</em>}
      </span>
    </div>
  )
}

function OperationCell({ layout, column }) {
  const { step, start, span } = layout
  return (
    <div
      className={`operation-cell ${column % 2 === 0 ? 'warm' : ''}`}
      style={{ gridColumn: column + 2, gridRow: `${start + 2} / span ${span}` }}
      title={step.text}
    >
      <span className="operation-number">{String(step.order).padStart(2, '0')}</span>
      <strong>{step.card_label}</strong>
      <small>{step.text}</small>
    </div>
  )
}

function RecipeMatrix({ recipe }) {
  const layouts = buildLayout(recipe)
  const ingredients = [...recipe.ingredients].sort((a, b) => a.row_order - b.row_order)
  const columnCount = recipe.steps.length + 1
  return (
    <div className="matrix-scroll">
      <div className="recipe-matrix" style={{ '--matrix-columns': columnCount, '--ingredient-rows': ingredients.length }}>
        <div className="matrix-head ingredient-head">Ingredients</div>
        {recipe.steps.map((step) => (
          <div className="matrix-head operation-head" key={step.id} style={{ gridColumn: step.order + 1 }}>
            {String(step.order).padStart(2, '0')}
          </div>
        ))}
        {ingredients.map((item, index) => (
          <IngredientCell item={item} isStart={index > 0 && item.component_id !== ingredients[index - 1].component_id} key={item.id} />
        ))}
        {layouts.map((layout, index) => (
          <OperationCell layout={layout} column={index} key={layout.step.id} />
        ))}
        <div className="matrix-endcap" />
      </div>
    </div>
  )
}

function Notes({ recipe }) {
  return (
    <section className="notes-panel">
      <div className="section-kicker">Keep in mind</div>
      <h2>Notes</h2>
      <div className="notes-list">
        {recipe.notes.map((note, index) => (
          <div className="note" key={note.id}>
            <span className="note-index">{index + 1}</span>
            <p>{note.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function App() {
  return (
    <main className="app-shell">
      <div className="top-rule" />
      <header className="recipe-header">
        <div className="eyebrow"><span className="eyebrow-mark" /> Recipe matrix / {recipe.schema_version}</div>
        <h1>{recipe.title}</h1>
        <div className="header-meta">
          <span><strong>Yield</strong> {recipe.servings.display}</span>
          <span className="meta-divider" />
          <span><strong>Read</strong> left to right</span>
        </div>
      </header>

      <section className="matrix-panel">
        <div className="matrix-caption">
          <div>
            <div className="section-kicker">Inputs → process → result</div>
            <h2>Build the salad</h2>
          </div>
          <div className="matrix-key"><span className="key-line" /> Ingredient rows merge into each operation</div>
        </div>
        <RecipeMatrix recipe={recipe} />
      </section>

      <Notes recipe={recipe} />
      {recipe.validation.needs_review && <div className="review-warning">Review needed: {recipe.validation.issues.join(' ')}</div>}
      <footer><span>Generated from structured recipe data</span><span>Kitchen / 01</span></footer>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
