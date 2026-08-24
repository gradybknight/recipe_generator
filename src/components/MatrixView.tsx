import type { Recipe } from '../types'
import { RecipeMatrix } from './matrix/RecipeMatrix'

interface MatrixViewProps {
  recipe: Recipe
  completedThrough: number
  onComplete: (order: number) => void
  onUndo: () => void
}

export function MatrixView({ recipe, completedThrough, onComplete, onUndo }: MatrixViewProps) {
  return (
    <section className="matrix-panel">
      <div className="matrix-caption">
        <div>
          <div className="section-kicker">Inputs → process → result</div>
        </div>
        <div className="matrix-key"><span className="key-line" /> Ingredient rows merge into each operation</div>
      </div>
      {completedThrough > 0 && <div className="progress-strip"><span>Progress saved through step {completedThrough}</span><span className="progress-actions"><button type="button" onClick={onUndo}>Undo step {completedThrough}</button><button type="button" onClick={() => onComplete(0)}>Show all</button></span></div>}
      <RecipeMatrix recipe={recipe} completedThrough={completedThrough} onComplete={onComplete} onUndo={onUndo} />
    </section>
  )
}
