ALTER TABLE idea_notes ADD COLUMN IF NOT EXISTS recorded_at TEXT;

UPDATE idea_notes
SET recorded_at = updated_at
WHERE category = 'dream' AND recorded_at IS NULL;
