import type { Recipe } from '../types'

export function Notes({ recipe }: { recipe: Recipe }) {
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
