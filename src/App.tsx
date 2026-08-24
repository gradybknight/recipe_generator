import { useState, type ChangeEvent } from 'react'
import type { Recipe } from './types'
import { validateRecipe } from './lib/validateRecipe'
import { useDarkMode } from './hooks/useDarkMode'
import { MatrixView } from './components/MatrixView'
import { Notes } from './components/Notes'
import { EmptyRecipe } from './components/EmptyRecipe'
import { RecipeHeader } from './components/RecipeHeader'
import { exampleRecipes } from './data/exampleRecipes'
import { MatrixTour } from './components/MatrixTour'
import { TraditionalView } from './components/TraditionalView'
import { TimelineView } from './components/TimelineView'

export default function App() {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [completedThrough, setCompletedThrough] = useState(0)
  const [loadedFile, setLoadedFile] = useState('')
  const [importError, setImportError] = useState('')
  const [darkMode, toggleDarkMode] = useDarkMode()
  const [activeView, setActiveView] = useState<'matrix' | 'traditional' | 'timeline'>('matrix')
  const [showTour, setShowTour] = useState(false)
  const [showRecipeChooser, setShowRecipeChooser] = useState(false)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    try {
      const candidate = JSON.parse(await file.text())
      const errors = validateRecipe(candidate)
      if (errors.length) throw new Error(errors.join('; '))
      setRecipe(candidate as Recipe)
      setCompletedThrough(0)
      setLoadedFile(file.name)
      setImportError('')
      setShowRecipeChooser(false)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not read that recipe JSON file.')
    }
  }

  const handleExample = (path: string) => {
    const selected = exampleRecipes.find((item) => item.path === path)
    if (!selected) return
    setRecipe(selected.recipe)
    setCompletedThrough(0)
    setLoadedFile(selected.path.replace(/^(\.\.\/)+/, ''))
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
        {!recipe && (
          <header className="recipe-header">
            <div className="eyebrow"><span className="eyebrow-mark" /> Recipe matrix</div>
            <div className="empty-header-tools"><button type="button" className="theme-toggle" onClick={toggleDarkMode}>{darkMode ? 'Light mode' : 'Dark mode'}</button></div>
          </header>
        )}
        {recipe && (
          <RecipeHeader
            recipe={recipe}
            loadedFile={loadedFile}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            activeView={activeView}
            onChangeView={setActiveView}
            onToggleRecipeChooser={() => setShowRecipeChooser((open) => !open)}
            onFile={handleFile}
            onExample={handleExample}
            onHome={handleHome}
            onOpenTour={() => setShowTour(true)}
          />
        )}
      </div>

      {!recipe && <EmptyRecipe onFile={handleFile} onExample={handleExample} error={importError} />}
      {recipe && activeView === 'matrix' && <MatrixView recipe={recipe} completedThrough={completedThrough} onComplete={setCompletedThrough} onUndo={() => setCompletedThrough((step) => Math.max(0, step - 1))} />}
      {recipe && activeView === 'traditional' && <TraditionalView recipe={recipe} />}
      {recipe && activeView === 'timeline' && <TimelineView recipe={recipe} />}

      {recipe && <Notes recipe={recipe} />}
      {recipe?.validation.needs_review && <div className="review-warning">Review needed: {recipe.validation.issues.join(' ')}</div>}
      <footer><span>Generated from structured recipe data</span><span>Kitchen / 01</span></footer>
      {showTour && <MatrixTour onClose={() => setShowTour(false)} />}
    </main>
  )
}
