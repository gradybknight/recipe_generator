import { describe, expect, it } from 'vitest'
import { scheduleTimelineTasks } from './scheduleTimelineTasks'
import type { TimelineTask } from '../types'

const task = (overrides: Partial<TimelineTask> & { id: string }): TimelineTask => ({
  label: 'Task',
  lane: 'Lane',
  source_step_ids: [],
  duration_min: null,
  duration_max: null,
  duration_source: 'source',
  inferred: false,
  depends_on: [],
  ...overrides,
})

describe('scheduleTimelineTasks', () => {
  it('starts an independent task at 0 and ends it at its duration', () => {
    const [scheduled] = scheduleTimelineTasks({ tasks: [task({ id: 'a', duration_max: 10 })] })
    expect(scheduled).toMatchObject({ start: 0, end: 10 })
  })

  it('defaults chart_duration to 5 minutes when duration_max is null', () => {
    const [scheduled] = scheduleTimelineTasks({ tasks: [task({ id: 'a' })] })
    expect(scheduled).toMatchObject({ start: 0, end: 5 })
  })

  it('honors an explicit start when a task has no dependencies', () => {
    const [scheduled] = scheduleTimelineTasks({ tasks: [task({ id: 'a', start: 12, duration_max: 5 })] })
    expect(scheduled).toMatchObject({ start: 12, end: 17 })
  })

  it('schedules a finish-to-start dependency after its prerequisite ends', () => {
    const tasks = [
      task({ id: 'a', duration_max: 10 }),
      task({ id: 'b', duration_max: 5, depends_on: [{ task_id: 'a', relationship: 'finish-to-start' }] }),
    ]
    const scheduled = scheduleTimelineTasks({ tasks })
    const b = scheduled.find((item) => item.id === 'b')
    expect(b).toMatchObject({ start: 10, end: 15 })
  })

  it('schedules a start-to-start dependency at the same start as its prerequisite', () => {
    const tasks = [
      task({ id: 'a', duration_max: 10 }),
      task({ id: 'b', duration_max: 5, depends_on: [{ task_id: 'a', relationship: 'start-to-start' }] }),
    ]
    const scheduled = scheduleTimelineTasks({ tasks })
    const b = scheduled.find((item) => item.id === 'b')
    expect(b).toMatchObject({ start: 0, end: 5 })
  })

  it('schedules a finish-to-finish dependency to end when its prerequisite ends', () => {
    const tasks = [
      task({ id: 'a', duration_max: 10 }),
      task({ id: 'b', duration_max: 4, depends_on: [{ task_id: 'a', relationship: 'finish-to-finish' }] }),
    ]
    const scheduled = scheduleTimelineTasks({ tasks })
    const b = scheduled.find((item) => item.id === 'b')
    // b should end exactly when a ends (10), so it starts at 10 - 4 = 6.
    expect(b).toMatchObject({ start: 6, end: 10 })
  })

  it('chains multiple dependencies in order', () => {
    const tasks = [
      task({ id: 'a', duration_max: 5 }),
      task({ id: 'b', duration_max: 5, depends_on: [{ task_id: 'a', relationship: 'finish-to-start' }] }),
      task({ id: 'c', duration_max: 5, depends_on: [{ task_id: 'b', relationship: 'finish-to-start' }] }),
    ]
    const scheduled = scheduleTimelineTasks({ tasks })
    expect(scheduled.map((item) => [item.id, item.start, item.end])).toEqual([
      ['a', 0, 5],
      ['b', 5, 10],
      ['c', 10, 15],
    ])
  })

  it('falls back unresolved (e.g. circular) dependencies to start at 0 instead of hanging', () => {
    const tasks = [
      task({ id: 'a', duration_max: 5, depends_on: [{ task_id: 'b', relationship: 'finish-to-start' }] }),
      task({ id: 'b', duration_max: 5, depends_on: [{ task_id: 'a', relationship: 'finish-to-start' }] }),
    ]
    const scheduled = scheduleTimelineTasks({ tasks })
    expect(scheduled).toEqual([
      expect.objectContaining({ id: 'a', start: 0, end: 5 }),
      expect.objectContaining({ id: 'b', start: 0, end: 5 }),
    ])
  })

  it('takes the max of multiple dependency constraints', () => {
    const tasks = [
      task({ id: 'a', duration_max: 3 }),
      task({ id: 'b', duration_max: 20 }),
      task({
        id: 'c',
        duration_max: 5,
        depends_on: [
          { task_id: 'a', relationship: 'finish-to-start' },
          { task_id: 'b', relationship: 'finish-to-start' },
        ],
      }),
    ]
    const scheduled = scheduleTimelineTasks({ tasks })
    const c = scheduled.find((item) => item.id === 'c')
    expect(c).toMatchObject({ start: 20, end: 25 })
  })
})
