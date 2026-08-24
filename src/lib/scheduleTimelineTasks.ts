import type { Timeline, TimelineTask } from '../types'

export interface ScheduledTimelineTask extends TimelineTask {
  chart_duration: number
  start: number
  end: number
}

export function scheduleTimelineTasks(timeline: Pick<Timeline, 'tasks'>): ScheduledTimelineTask[] {
  const tasks = timeline.tasks.map((task) => ({ ...task, chart_duration: task.duration_max ?? 5 }))
  const scheduled = new Map<string, { start: number; end: number }>()
  const pending = new Set(tasks.map((task) => task.id))
  const taskById = new Map(tasks.map((task) => [task.id, task]))

  for (let pass = 0; pass < tasks.length + 1 && pending.size; pass += 1) {
    tasks.forEach((task) => {
      if (!pending.has(task.id)) return
      const dependencies = task.depends_on || []
      if (dependencies.some((dependency) => !scheduled.has(dependency.task_id))) return
      let start = typeof task.start === 'number' ? task.start : 0
      dependencies.forEach((dependency) => {
        const prerequisite = scheduled.get(dependency.task_id)!
        if (dependency.relationship === 'start-to-start') start = Math.max(start, prerequisite.start)
        if (dependency.relationship === 'finish-to-start') start = Math.max(start, prerequisite.end)
        if (dependency.relationship === 'finish-to-finish') start = Math.max(start, prerequisite.end - task.chart_duration)
      })
      scheduled.set(task.id, { start, end: start + task.chart_duration })
      pending.delete(task.id)
    })
  }

  pending.forEach((taskId) => {
    const task = taskById.get(taskId)!
    scheduled.set(taskId, { start: 0, end: task.chart_duration })
  })
  return tasks.map((task) => ({ ...task, ...scheduled.get(task.id)! }))
}
