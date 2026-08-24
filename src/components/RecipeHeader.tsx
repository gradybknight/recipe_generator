import type { ChangeEvent } from 'react'
import type { Recipe } from '../types'
import { HomeIcon, MoonIcon, RecipeIcon, SunIcon } from './icons'
import { ExampleRecipePicker } from './ExampleRecipePicker'

interface RecipeHeaderProps {
  recipe: Recipe
  loadedFile: string
  darkMode: boolean
  onToggleDarkMode: () => void
  activeView: 'matrix' | 'traditional' | 'timeline'
  onChangeView: (view: 'matrix' | 'traditional' | 'timeline') => void
  onToggleRecipeChooser: () => void
  onFile: (event: ChangeEvent<HTMLInputElement>) => void
  onExample: (path: string) => void
  onHome: () => void
  onOpenTour: () => void
}

export function RecipeHeader({
  recipe,
  loadedFile,
  darkMode,
  onToggleDarkMode,
  activeView,
  onChangeView,
  onToggleRecipeChooser,
  onFile,
  onExample,
  onHome,
  onOpenTour,
}: RecipeHeaderProps) {
  return (
    <>
      <header className="recipe-header">
        <h1>{recipe.title}</h1>
        <div className="header-meta">
          <span><strong>Yield</strong> {recipe.servings.display}</span>
          <span className="meta-divider" />
          <span><strong>Read</strong> left to right</span>
        </div>
        <div className="recipe-tools">
          <label className="file-picker">
            <input type="file" accept="application/json,.json" onChange={onFile} />
            <span>Load recipe JSON</span>
          </label>
          <ExampleRecipePicker onSelect={onExample} />
          <span className="loaded-file">{loadedFile}</span>
        </div>
        <div className="header-actions">
          <button type="button" className="header-icon-button" onClick={onToggleRecipeChooser} aria-label="Choose a new recipe" title="Choose a new recipe"><RecipeIcon /></button>
          <button type="button" className="header-icon-button" onClick={onToggleDarkMode} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>{darkMode ? <SunIcon /> : <MoonIcon />}</button>
          <button type="button" className="header-icon-button" onClick={onHome} aria-label="Return home" title="Return home"><HomeIcon /></button>
        </div>
        {activeView === 'matrix' && <button type="button" className="tour-launch" onClick={onOpenTour}>How this works</button>}
      </header>

      <nav className="view-tabs" aria-label="Recipe views">
        <button type="button" className={activeView === 'matrix' ? 'active' : ''} aria-selected={activeView === 'matrix'} onClick={() => onChangeView('matrix')}>Matrix view</button>
        <button type="button" className={activeView === 'traditional' ? 'active' : ''} aria-selected={activeView === 'traditional'} onClick={() => onChangeView('traditional')}>Traditional recipe</button>
        <button type="button" className={activeView === 'timeline' ? 'active' : ''} aria-selected={activeView === 'timeline'} onClick={() => onChangeView('timeline')}>Timeline</button>
      </nav>
    </>
  )
}
