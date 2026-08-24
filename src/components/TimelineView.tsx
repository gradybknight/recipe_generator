import { useEffect, useState } from 'react'
import type { Recipe } from '../types'
import { scheduleTimelineTasks, type ScheduledTimelineTask } from '../lib/scheduleTimelineTasks'

export function TimelineView({ recipe }: { recipe: Recipe }) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const timeline = recipe.timeline

  useEffect(() => {
    const closeExpandedTask = (event: Event) => {
      if (!(event.target as HTMLElement).closest('.timeline-task')) setExpandedTaskId(null)
    }
    document.addEventListener('pointerdown', closeExpandedTask)
    return () => document.removeEventListener('pointerdown', closeExpandedTask)
  }, [])

  if (!timeline) {
    return (
      <section className="timeline-panel timeline-empty">
        <div className="section-kicker">Parallel prep</div>
        <h2>Timeline unavailable</h2>
        <p>This recipe does not yet include timing and parallel-prep guidance. Matrix and Traditional views are still available.</p>
      </section>
    )
  }

  const scheduledTasks = scheduleTimelineTasks(timeline)
  const lanes = [...new Set(scheduledTasks.map((task) => task.lane))]
  const endTime = Math.max(...scheduledTasks.map((task) => task.end), 1)
  const timelineColumns = Math.ceil(endTime / 5)
  const scaleMarks = Array.from({ length: timelineColumns + 1 }, (_, index) => index * 5).filter((minute) => minute <= endTime)
  const durationLabel = (task: ScheduledTimelineTask) => task.duration_min === null || task.duration_min === undefined
    ? 'timing unspecified'
    : task.duration_min === task.duration_max
    ? `${task.duration_min} min`
    : `${task.duration_min}–${task.duration_max} min`

  return (
    <section className="timeline-panel">
      <div className="timeline-caption">
        <div>
          <div className="section-kicker">Parallel prep</div>
          <h2>Timeline</h2>
          <p>{timeline.summary}</p>
        </div>
        <div className="timeline-legend"><span className="legend-swatch" /> Suggested prep</div>
      </div>
      <div className="timeline-chart" style={{ '--timeline-columns': timelineColumns } as React.CSSProperties}>
        <div className="timeline-scale">
          {scaleMarks.map((minute) => <span style={{ gridColumn: Math.floor(minute / 5) + 1 }} key={minute}>{minute}m</span>)}
        </div>
        <div className="timeline-lanes">
          {lanes.map((lane, laneIndex) => (
            <div className="timeline-lane" key={lane}>
              <div className="timeline-lane-label">{lane}</div>
              <div className="timeline-track">
                {scheduledTasks.filter((task) => task.lane === lane).map((task) => (
                  <article
                    className={`timeline-task ${task.inferred ? 'inferred' : ''} ${expandedTaskId === task.id ? 'expanded' : ''} ${laneIndex === lanes.length - 1 ? 'tooltip-above' : ''}`}
                    style={{ gridColumn: `${Math.ceil(task.start / 5) + 1} / span ${Math.max(1, Math.ceil(task.chart_duration / 5))}` }}
                    role="button"
                    tabIndex={0}
                    aria-label={task.label}
                    aria-expanded={expandedTaskId === task.id}
                    onClick={(event) => {
                      event.stopPropagation()
                      setExpandedTaskId((currentId) => currentId === task.id ? null : task.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setExpandedTaskId((currentId) => currentId === task.id ? null : task.id)
                      }
                    }}
                    key={task.id}
                  >
                    <strong>{task.label}</strong>
                    <small>{durationLabel(task)}{task.inferred ? ' · suggested' : ''}</small>
                    <span className="timeline-task-tooltip">{task.label}</span>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {timeline.notes?.map((note) => <p className="timeline-note" key={note}>{note}</p>)}
    </section>
  )
}
