-- 002_add_progress_meta.sql
-- 进度表补充成就名称与版本，便于直接查库排查问题（无需反查定义文件）
-- 注意：SQLite 不支持单条 ALTER 加多列，需分开写

ALTER TABLE achievement_progress ADD COLUMN achievement_name TEXT;
ALTER TABLE achievement_progress ADD COLUMN version TEXT;
