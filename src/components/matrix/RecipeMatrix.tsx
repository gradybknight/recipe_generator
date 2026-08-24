import { useMemo } from 'react'
import type { Ingredient, Recipe } from '../../types'
import { buildView } from '../../lib/buildView'
import { IngredientCell } from './IngredientCell'
import { SummaryCell } from './SummaryCell'
import { OperationCell } from './OperationCell'
import { MobileMatrix } from './MobileMatrix'

interface RecipeMatrixProps {
  recipe: Recipe
  completedThrough: number
  onComplete: (order: number) => void
  onUndo: () => void
}

export function RecipeMatrix({ recipe, completedThrough, onComplete, onUndo }: RecipeMatrixProps) {
  const { ingredients, rows, layouts } = useMemo(() => buildView(recipe, completedThrough), [recipe, completedThrough])
  const hasCompleted = completedThrough > 0
  const columnCount = layouts.length + (hasCompleted ? 1 : 0) + 1
  const operationOffset = hasCompleted ? 1 : 0
  return (
    <>
      <div className="matrix-scroll matrix-desktop">
        <div className="recipe-matrix" style={{ '--matrix-columns': columnCount, '--ingredient-rows': rows.length } as React.CSSProperties}>
        <div className="matrix-head ingredient-head">Ingredients</div>
        {hasCompleted && <button type="button" className="matrix-head completed-head" onClick={onUndo} title={`Undo step ${completedThrough}`}><span>✓</span> 01–{String(completedThrough).padStart(2, '0')} <small>undo {String(completedThrough).padStart(2, '0')}</small></button>}
        {layouts.map((layout, index) => (
          <div className="matrix-head operation-head" key={layout.step.id} style={{ gridColumn: index + 2 + operationOffset }}>
            {String(layout.step.order).padStart(2, '0')}
          </div>
        ))}
        {rows.map((row, index) => row.type === 'summary'
          ? <div className="matrix-ingredient summary-row" key={`summary-${index}`}><SummaryCell row={row} /></div>
          : <IngredientCell item={row.item} isStepStart={index > 0 && rows[index - 1].type === 'ingredient' && row.item.first_use_step !== (rows[index - 1] as { type: 'ingredient'; item: Ingredient }).item.first_use_step} key={row.item.id} />
        )}
        {hasCompleted && <div className="completed-cell" style={{ gridColumn: 2, gridRow: `2 / span ${rows.length}` }}>
          <SummaryCell row={{ label: `Completed through step ${completedThrough}`, items: ingredients.filter((item) => (item.first_use_step ?? 0) <= completedThrough && Math.max(...(recipe.steps.filter((step) => step.inputs.some((token) => token.type === 'ingredient' && token.id === item.id)).map((step) => step.order)), 0) <= completedThrough) }} />
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
