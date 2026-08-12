/** 把服务端任务对象转换成可重新创建的请求载荷。 */
export function taskToCreatePayload(task) {
  return {
    title: task.title,
    note: task.note || '',
    dueDate: task.dueDate || '',
    priority: task.priority || 'medium',
    status: task.status || 'pending',
    listId: task.listId || null,
    completedAt: task.completedAt || null
  }
}

