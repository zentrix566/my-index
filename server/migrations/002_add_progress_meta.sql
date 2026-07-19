-- 002_add_progress_meta.sql
-- 进度表补充成就名称、版本与职业，便于直接查库排查问题（无需反查定义文件）

ALTER TABLE achievement_progress ADD COLUMN IF NOT EXISTS achievement_name TEXT;
ALTER TABLE achievement_progress ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE achievement_progress ADD COLUMN IF NOT EXISTS hero_class TEXT;
