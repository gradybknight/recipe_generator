import { exampleRecipes } from '../data/exampleRecipes'

export function ExampleRecipePicker({ onSelect }: { onSelect: (path: string) => void }) {
  return (
    <label className="example-picker">
      <span>Or choose an example</span>
      <select defaultValue="" onChange={(event) => onSelect(event.target.value)}>
        <option value="" disabled>Select a bundled recipe…</option>
        {exampleRecipes.map(({ path, recipe }) => <option value={path} key={path}>{recipe.title}</option>)}
      </select>
    </label>
  )
}
