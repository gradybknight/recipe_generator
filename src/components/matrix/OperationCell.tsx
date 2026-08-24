import type { StepLayout } from '../../lib/buildView'
import { formatCriticalDetail } from '../../lib/formatCriticalDetail'

export function OperationCell({ layout, column, onComplete }: { layout: StepLayout; column: number; onComplete: (order: number) => void }) {
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
