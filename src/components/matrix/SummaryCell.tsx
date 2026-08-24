import type { Ingredient } from '../../types'

export interface SummaryRowData {
  label?: string
  items: Ingredient[]
}

export function SummaryCell({ row }: { row: SummaryRowData }) {
  return (
    <div className="matrix-summary">
      <span className="summary-check">✓</span>
      <strong>{row.label || 'Prepared ingredients'}</strong>
      <small>{row.items.length} ingredients completed</small>
    </div>
  )
}
