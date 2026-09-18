ALTER TABLE todos ADD COLUMN IF NOT EXISTS original_due_date TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS last_rescheduled_at TEXT;

UPDATE todos
SET original_due_date = due_date
WHERE original_due_date IS NULL AND due_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS todo_reschedules (
  id SERIAL PRIMARY KEY,
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_todo_reschedules_task
  ON todo_reschedules(user_id, todo_id, created_at);
CREATE INDEX IF NOT EXISTS idx_todo_reschedules_from
  ON todo_reschedules(user_id, from_date);
