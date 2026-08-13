import assert from 'node:assert/strict'
import test from 'node:test'

import { sortCalendarTasks } from '../src/features/todo/constants.js'

test('日历任务按已完成、待办、其余状态排序', () => {
  const tasks = [
    { id: 1, status: 'waiting' },
    { id: 2, status: 'pending' },
    { id: 3, status: 'cancelled' },
    { id: 4, status: 'done' },
    { id: 5, status: 'deferred' },
    { id: 6, status: 'in_progress' }
  ]

  const sorted = sortCalendarTasks(tasks)

  assert.deepEqual(sorted.map((task) => task.status), [
    'done',
    'pending',
    'in_progress',
    'deferred',
    'waiting',
    'cancelled'
  ])
  assert.deepEqual(tasks.map((task) => task.id), [1, 2, 3, 4, 5, 6])
})

test('日历中相同状态保持接口原有顺序', () => {
  const sorted = sortCalendarTasks([
    { id: 8, status: 'pending' },
    { id: 3, status: 'pending' },
    { id: 5, status: 'done' }
  ])

  assert.deepEqual(sorted.map((task) => task.id), [5, 8, 3])
})
