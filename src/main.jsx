import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const exampleRecipes = Object.entries(import.meta.glob('../example_recipes/*.json', { eager: true, import: 'default' }))
  .map(([path, recipe]) => ({ path, recipe }))
  .sort((a, b) => a.recipe.title.localeCompare(b.recipe.title))

const colors = {
  'component-salad': 'sage',
  'component-dressing': 'gold',
  'component-guacamole': 'sage',
  'component-optional': 'gold',
}

function validateRecipe(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return ['Recipe JSON must contain one object']
  const errors = []
  const required = ['schema_version', 'title', 'servings', 'components', 'ingredients', 'steps', 'notes', 'validation']
  required.forEach((field) => {
    if (!(field in candidate)) errors.push(`Missing required field: ${field}`)
  })
  if (errors.length) return errors
  if (!Array.isArray(candidate.components) || !Array.isArray(candidate.ingredients) || !Array.isArray(candidate.steps)) {
    return ['components, ingredients, and steps must be arrays']
  }
  const componentIds = new Set(candidate.components.map((item) => item.id))
  const ingredientIds = new Set(candidate.ingredients.map((item) => item.id))
  const stepIds = new Set(candidate.steps.map((item) => item.id))
  const allIds = new Set([...componentIds, ...ingredientIds, ...stepIds])
  candidate.ingredients.forEach((item) => {
    if (!componentIds.has(item.component_id)) errors.push(`${item.id} references an unknown component`)
    if (!Number.isInteger(item.row_order)) errors.push(`${item.id} needs an integer row_order`)
    if (item.first_use_step !== null && !Number.isInteger(item.first_use_step)) errors.push(`${item.id} needs an integer or null first_use_step`)
  })
  candidate.steps.forEach((step) => {
    ;[...(step.inputs || []), ...(step.outputs || [])].forEach((token) => {
      if (!allIds.has(token.id)) errors.push(`${step.id} references an unknown ID: ${token.id}`)
    })
  })
  if (new Set(candidate.ingredients.map((item) => item.row_order)).size !== candidate.ingredients.length) errors.push('ingredient row_order values must be unique')
  return errors
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
    const start = indexes.length ? Math.min(...indexes) : 0
    const end = indexes.length ? Math.max(...indexes) : Math.max(0, rows.length - 1)
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

function formatCriticalDetail(detail) {
  if (!detail) return null
  const temperaturePattern = /(\d+(?:[–-]\d+)?\s*°?\s*[FC])/gi
  const parts = []
  let lastIndex = 0
  let match
  while ((match = temperaturePattern.exec(detail))) {
    if (match.index > lastIndex) parts.push(detail.slice(lastIndex, match.index))
    parts.push(<strong className="critical-temperature" key={`${match.index}-${match[0]}`}>{match[0]}</strong>)
    lastIndex = match.index + match[0].length
  }
  if (!parts.length) return detail
  if (lastIndex < detail.length) parts.push(detail.slice(lastIndex))
  return parts
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
      {step.card_detail && <small>{formatCriticalDetail(step.card_detail)}</small>}
    </div>
  )
}

function MobileMatrix({ recipe, ingredients, layouts, completedThrough, onComplete, onUndo }) {
  const componentItems = Object.fromEntries(recipe.components.map((component) => [component.id, ingredients.filter((item) => item.component_id === component.id)]))
  const inputsFor = (step) => {
    const seen = new Set()
    return step.inputs.flatMap((token) => {
      const items = token.type === 'ingredient'
        ? [ingredients.find((item) => item.id === token.id)]
        : (componentItems[token.id] || []).filter((item) => item.first_use_step !== null && item.first_use_step < step.order)
      return items.filter((item) => item && !seen.has(item.id) && seen.add(item.id))
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
              {items.map((item) => <div key={item.id}><span>{item.quantity.display}</span>{item.name}{item.prep && <em>, {item.prep}</em>}</div>)}
            </div>}
            <button type="button" className="mobile-complete-button" onClick={() => onComplete(layout.step.order)}>Mark complete</button>
          </article>
        })}
      </div>
    </div>
  )
}

function RecipeMatrix({ recipe, completedThrough, onComplete, onUndo }) {
  const { ingredients, rows, layouts } = useMemo(() => buildView(recipe, completedThrough), [recipe, completedThrough])
  const hasCompleted = completedThrough > 0
  const columnCount = layouts.length + (hasCompleted ? 1 : 0) + 1
  const operationOffset = hasCompleted ? 1 : 0
  return (
    <>
      <div className="matrix-scroll matrix-desktop">
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
      <MobileMatrix recipe={recipe} ingredients={ingredients} layouts={layouts} completedThrough={completedThrough} onComplete={onComplete} onUndo={onUndo} />
    </>
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

function ExampleRecipePicker({ examples, onSelect }) {
  return (
    <label className="example-picker">
      <span>Or choose an example</span>
      <select defaultValue="" onChange={(event) => onSelect(event.target.value)}>
        <option value="" disabled>Select a bundled recipe…</option>
        {examples.map(({ path, recipe }) => <option value={path} key={path}>{recipe.title}</option>)}
      </select>
    </label>
  )
}

function RecipeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.75h7.2L18 8.1v12.15H6.5z" /><path d="M13.5 3.75V8.5H18M12.25 12v5.25M9.625 14.625h5.25" /></svg>
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5" /><path d="M12 2.75v2M12 19.25v2M21.25 12h-2M4.75 12h-2M18.54 5.46l-1.42 1.42M6.88 17.12l-1.42 1.42M18.54 18.54l-1.42-1.42M6.88 6.88 5.46 5.46" /></svg>
}

function MoonIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 15.85A7.75 7.75 0 0 1 8.15 4.5 8 8 0 1 0 19.5 15.85Z" /></svg>
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 11.25 7.5-6 7.5 6v8.25a1 1 0 0 1-1 1h-4v-5.25h-5v5.25h-4a1 1 0 0 1-1-1z" /></svg>
}

function EmptyRecipe({ onFile, onExample, examples, error }) {
  return (
    <section className="empty-panel">
      <div className="empty-recipes-panel">
        <div className="section-kicker">Bundled recipes</div>
        <h2>Choose a recipe</h2>
        <p>Start with one of the included examples.</p>
        <div className="example-list">
          {examples.map(({ path, recipe }) => (
            <button type="button" className="example-list-item" onClick={() => onExample(path)} key={path}>
              <span>{recipe.title}</span>
              <b>↗</b>
            </button>
          ))}
        </div>
      </div>
      <div className="upload-target">
        <div className="target-mark" aria-hidden="true"><span /></div>
        <div className="section-kicker">Recipe card renderer</div>
        <h2>Upload a recipe JSON</h2>
        <p>Choose a structured recipe artifact generated by <code>recipe-card-structurer</code> to render its process matrix.</p>
        <label className="target-picker">
          <input type="file" accept="application/json,.json" onChange={onFile} />
          <span>Choose JSON file</span>
        </label>
        {error && <div className="import-error" role="alert">{error}</div>}
      </div>
    </section>
  )
}

const tourSteps = [
  {
    kicker: '01 / Ingredients',
    title: 'Start with the ingredient column',
    text: 'Every row is an ingredient, grouped by the component it belongs to. Quantities stay visible on the left as you work across the recipe.',
    visual: <div className="tour-visual tour-ingredients"><span>2 cups</span><strong>chickpeas</strong><span>1 tbsp</span><strong>olive oil</strong><span>½ tsp</span><strong>cumin</strong></div>,
  },
  {
    kicker: '02 / Process',
    title: 'Read the recipe from left to right',
    text: 'Each numbered card is an operation. Its position shows which ingredients it uses, and the card label keeps the next action easy to spot.',
    visual: <div className="tour-visual tour-process"><span className="tour-ingredient-line" /><div><small>01</small><strong>Season</strong></div><i>→</i><div><small>02</small><strong>Roast</strong></div></div>,
  },
  {
    kicker: '03 / Progress',
    title: 'Click an operation when it is done',
    text: 'Completed ingredients fold into a checked summary, keeping the active work in view. Use the completed column to undo a step or show everything again.',
    visual: <div className="tour-visual tour-progress"><div className="tour-completed">✓ <strong>Prepared ingredients</strong></div><div className="tour-active"><small>03</small><strong>Finish</strong><button type="button" tabIndex="-1">complete</button></div></div>,
  },
]

function MatrixTour({ onClose }) {
  const [step, setStep] = useState(0)
  const current = tourSteps[step]

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight' && step < tourSteps.length - 1) setStep((currentStep) => currentStep + 1)
      if (event.key === 'ArrowLeft' && step > 0) setStep((currentStep) => currentStep - 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, step])

  return (
    <div className="tour-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <button type="button" className="tour-close" onClick={onClose} aria-label="Close tour">×</button>
        <div className="section-kicker">{current.kicker}</div>
        <h2 id="tour-title">{current.title}</h2>
        <p>{current.text}</p>
        {current.visual}
        <div className="tour-footer">
          <div className="tour-dots" aria-label={`Tour step ${step + 1} of ${tourSteps.length}`}>
            {tourSteps.map((item, index) => <span className={index === step ? 'active' : ''} key={item.kicker} />)}
          </div>
          <div className="tour-actions">
            {step > 0 && <button type="button" className="tour-secondary" onClick={() => setStep((currentStep) => currentStep - 1)}>Back</button>}
            <button type="button" className="tour-primary" onClick={() => step === tourSteps.length - 1 ? onClose() : setStep((currentStep) => currentStep + 1)}>
              {step === tourSteps.length - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function TraditionalRecipe({ recipe }) {
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

function App() {
  const [recipe, setRecipe] = useState(null)
  const [completedThrough, setCompletedThrough] = useState(0)
  const [loadedFile, setLoadedFile] = useState('')
  const [importError, setImportError] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [activeView, setActiveView] = useState('matrix')
  const [showTour, setShowTour] = useState(false)
  const [showRecipeChooser, setShowRecipeChooser] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  const handleFile = async (event) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    try {
      const candidate = JSON.parse(await file.text())
      const errors = validateRecipe(candidate)
      if (errors.length) throw new Error(errors.join('; '))
      setRecipe(candidate)
      setCompletedThrough(0)
      setLoadedFile(file.name)
      setImportError('')
      setShowRecipeChooser(false)
    } catch (error) {
      setImportError(error.message || 'Could not read that recipe JSON file.')
    }
  }

  const handleExample = (path) => {
    const selected = exampleRecipes.find((item) => item.path === path)
    if (!selected) return
    setRecipe(selected.recipe)
    setCompletedThrough(0)
    setLoadedFile(selected.path.replace('../', ''))
    setImportError('')
    setShowRecipeChooser(false)
  }

  const handleHome = () => {
    setRecipe(null)
    setCompletedThrough(0)
    setLoadedFile('')
    setImportError('')
    setActiveView('matrix')
    setShowRecipeChooser(false)
    setShowTour(false)
  }

  return (
    <main className={`app-shell ${recipe ? 'recipe-loaded' : ''}`}>
      <div className="top-rule" />
      <div className={`recipe-chrome ${recipe ? 'has-recipe' : ''} ${showRecipeChooser ? 'show-recipe-chooser' : ''}`}>
        <header className="recipe-header">
          {!recipe && <div className="eyebrow"><span className="eyebrow-mark" /> Recipe matrix</div>}
        {recipe && <h1>{recipe.title}</h1>}
          {recipe && <div className="header-meta">
            <span><strong>Yield</strong> {recipe.servings.display}</span>
            <span className="meta-divider" />
            <span><strong>Read</strong> left to right</span>
          </div>}
          {recipe && <div className="recipe-tools">
            <label className="file-picker">
              <input type="file" accept="application/json,.json" onChange={handleFile} />
              <span>Load recipe JSON</span>
            </label>
            <ExampleRecipePicker examples={exampleRecipes} onSelect={handleExample} />
            <span className="loaded-file">{loadedFile}</span>
          </div>}
          {recipe && <div className="header-actions">
            <button type="button" className="header-icon-button" onClick={() => setShowRecipeChooser((open) => !open)} aria-label="Choose a new recipe" title="Choose a new recipe"><RecipeIcon /></button>
            <button type="button" className="header-icon-button" onClick={() => setDarkMode((enabled) => !enabled)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>{darkMode ? <SunIcon /> : <MoonIcon />}</button>
            <button type="button" className="header-icon-button" onClick={handleHome} aria-label="Return home" title="Return home"><HomeIcon /></button>
          </div>}
          {recipe && activeView === 'matrix' && <button type="button" className="tour-launch" onClick={() => setShowTour(true)}>How this works</button>}
          {!recipe && <div className="empty-header-tools"><button type="button" className="theme-toggle" onClick={() => setDarkMode((enabled) => !enabled)}>{darkMode ? 'Light mode' : 'Dark mode'}</button></div>}
        </header>

        {recipe && <nav className="view-tabs" aria-label="Recipe views">
          <button type="button" className={activeView === 'matrix' ? 'active' : ''} aria-selected={activeView === 'matrix'} onClick={() => setActiveView('matrix')}>Matrix view</button>
          <button type="button" className={activeView === 'traditional' ? 'active' : ''} aria-selected={activeView === 'traditional'} onClick={() => setActiveView('traditional')}>Traditional recipe</button>
        </nav>}
      </div>

      {!recipe && <EmptyRecipe onFile={handleFile} onExample={handleExample} examples={exampleRecipes} error={importError} />}
      {recipe && activeView === 'matrix' && <section className="matrix-panel">
        <div className="matrix-caption">
          <div>
            <div className="section-kicker">Inputs → process → result</div>
          </div>
          <div className="matrix-key"><span className="key-line" /> Ingredient rows merge into each operation</div>
        </div>
        {completedThrough > 0 && <div className="progress-strip"><span>Progress saved through step {completedThrough}</span><span className="progress-actions"><button type="button" onClick={() => setCompletedThrough((step) => Math.max(0, step - 1))}>Undo step {completedThrough}</button><button type="button" onClick={() => setCompletedThrough(0)}>Show all</button></span></div>}
        <RecipeMatrix recipe={recipe} completedThrough={completedThrough} onComplete={setCompletedThrough} onUndo={() => setCompletedThrough((step) => Math.max(0, step - 1))} />
      </section>}
      {recipe && activeView === 'traditional' && <TraditionalRecipe recipe={recipe} />}

      {recipe && <Notes recipe={recipe} />}
      {recipe?.validation.needs_review && <div className="review-warning">Review needed: {recipe.validation.issues.join(' ')}</div>}
      <footer><span>Generated from structured recipe data</span><span>Kitchen / 01</span></footer>
      {showTour && <MatrixTour onClose={() => setShowTour(false)} />}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
