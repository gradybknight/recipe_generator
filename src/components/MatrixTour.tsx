import { useEffect, useState, type ReactNode } from 'react'

interface TourStep {
  kicker: string
  title: string
  text: string
  visual: ReactNode
}

const tourSteps: TourStep[] = [
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
    visual: <div className="tour-visual tour-progress"><div className="tour-completed">✓ <strong>Prepared ingredients</strong></div><div className="tour-active"><small>03</small><strong>Finish</strong><button type="button" tabIndex={-1}>complete</button></div></div>,
  },
]

export function MatrixTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const current = tourSteps[step]

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
