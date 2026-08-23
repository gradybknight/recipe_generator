import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import recipe from './recipe.json'
import './styles.css'

const colors = {
  'component-salad': 'sage',
  'component-dressing': 'gold',
  'component-guacamole': 'sage',
  'component-optional': 'gold',
}

function buildView(recipe, completedThrough) {
  const ingredients = [...recipe.ingredients].sort((a, b) => a.row_order - b.row_order)
  const componentNames = Object.fromEntries(recipe.components.map((component) => [component.id, component.name]))
  const summaryLabel = (items) => {
    const names = [...new Set(items.map((item) => componentNames[item.component_id] || 'Prepared component'))]
    return `${names.join(' + ')} — prepared`
  }
  const directUses = Object.fromEntries(ingredients.map((item) => [item.id, recipe.steps
    .filter((step) => step.inputs.some((token) => token.type === 'ingredient' && token.id === item.id))
    .map((step) => step.order)]))

  const rows = []
  let collapsedItems = []
  const flushCollapsed = () => {
    if (!collapsedItems.length) return
    rows.push({ type: 'summary', items: collapsedItems, label: summaryLabel(collapsedItems) })
    collapsedItems = []
  }
  ingredients.forEach((item) => {
    const lastDirectUse = Math.max(...(directUses[item.id].length ? directUses[item.id] : [0]))
    const canCollapse = completedThrough > 0 && item.first_use_step !== null && item.first_use_step <= completedThrough && lastDirectUse <= completedThrough
    if (canCollapse) collapsedItems.push(item)
    else {
      flushCollapsed()
      rows.push({ type: 'ingredient', item })
    }
  })
  flushCollapsed()

  const rowIndex = new Map()
  rows.forEach((row, index) => {
    if (row.type === 'summary') row.items.forEach((item) => rowIndex.set(item.id, index))
    else rowIndex.set(row.item.id, index)
  })
  const componentItems = Object.fromEntries(recipe.components.map((component) => [component.id, ingredients.filter((item) => item.component_id === component.id)]))
  const boundsFor = (token, step) => {
    const items = token.type === 'ingredient'
      ? [ingredients.find((item) => item.id === token.id)]
      : (componentItems[token.id] || []).filter((item) => item.first_use_step !== null && item.first_use_step < step.order)
    return items.filter(Boolean).map((item) => rowIndex.get(item.id)).filter((index) => index !== undefined)
  }
  const layouts = recipe.steps.filter((step) => step.order > completedThrough).map((step) => {
    const indexes = step.inputs.flatMap((token) => boundsFor(token, step))
    const start = Math.min(...indexes)
    const end = Math.max(...indexes)
    return { step, start, end, span: end - start + 1 }
  })
  return { ingredients, rows, layouts }
}

function IngredientCell({ item, isStepStart }) {
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

function SummaryCell({ row }) {
  return (
    <div className="matrix-summary">
      <span className="summary-check">✓</span>
      <strong>{row.label || 'Prepared ingredients'}</strong>
      <small>{row.items.length} ingredients completed</small>
    </div>
  )
}

function OperationCell({ layout, column, onComplete }) {
  const { step, start, span } = layout
  return (
    <div
      className={`operation-cell ${column % 2 === 0 ? 'warm' : ''}`}
      style={{ gridColumn: column + 2, gridRow: `${start + 2} / span ${span}` }}
      title={step.text}
    >
      <span className="operation-number">{String(step.order).padStart(2, '0')}</span>
      <button type="button" onClick={() => onComplete(step.order)}><strong>{step.card_label}</strong></button>
      <small>{step.text}</small>
    </div>
  )
}

function RecipeMatrix({ recipe, completedThrough, onComplete, onUndo }) {
  const { ingredients, rows, layouts } = useMemo(() => buildView(recipe, completedThrough), [recipe, completedThrough])
  const hasCompleted = completedThrough > 0
  const columnCount = layouts.length + (hasCompleted ? 1 : 0) + 1
  const operationOffset = hasCompleted ? 1 : 0
  return (
    <div className="matrix-scroll">
      <div className="recipe-matrix" style={{ '--matrix-columns': columnCount, '--ingredient-rows': rows.length }}>
        <div className="matrix-head ingredient-head">Ingredients</div>
        {hasCompleted && <button type="button" className="matrix-head completed-head" onClick={onUndo} title={`Undo step ${completedThrough}`}><span>✓</span> 01–{String(completedThrough).padStart(2, '0')} <small>undo {String(completedThrough).padStart(2, '0')}</small></button>}
        {layouts.map((layout, index) => (
          <div className="matrix-head operation-head" key={layout.step.id} style={{ gridColumn: index + 2 + operationOffset }}>
            {String(layout.step.order).padStart(2, '0')}
          </div>
        ))}
        {rows.map((row, index) => row.type === 'summary'
          ? <div className="matrix-ingredient summary-row" key={`summary-${index}`}><SummaryCell row={row} /></div>
          : <IngredientCell item={row.item} isStepStart={index > 0 && rows[index - 1].type === 'ingredient' && row.item.first_use_step !== rows[index - 1].item.first_use_step} key={row.item.id} />
        )}
        {hasCompleted && <div className="completed-cell" style={{ gridColumn: 2, gridRow: `2 / span ${rows.length}` }}>
          <SummaryCell row={{ label: `Completed through step ${completedThrough}`, items: ingredients.filter((item) => item.first_use_step <= completedThrough && Math.max(...(recipe.steps.filter((step) => step.inputs.some((token) => token.type === 'ingredient' && token.id === item.id)).map((step) => step.order)), 0) <= completedThrough) }} />
          <button type="button" className="restore-button" onClick={onUndo}>undo step</button>
        </div>}
        {layouts.map((layout, index) => (
          <OperationCell layout={layout} column={index + operationOffset} onComplete={onComplete} key={layout.step.id} />
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
  const [completedThrough, setCompletedThrough] = useState(0)
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
        {completedThrough > 0 && <div className="progress-strip"><span>Progress saved through step {completedThrough}</span><span className="progress-actions"><button type="button" onClick={() => setCompletedThrough((step) => Math.max(0, step - 1))}>Undo step {completedThrough}</button><button type="button" onClick={() => setCompletedThrough(0)}>Show all</button></span></div>}
        <RecipeMatrix recipe={recipe} completedThrough={completedThrough} onComplete={setCompletedThrough} onUndo={() => setCompletedThrough((step) => Math.max(0, step - 1))} />
      </section>

      <Notes recipe={recipe} />
      {recipe.validation.needs_review && <div className="review-warning">Review needed: {recipe.validation.issues.join(' ')}</div>}
      <footer><span>Generated from structured recipe data</span><span>Kitchen / 01</span></footer>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
