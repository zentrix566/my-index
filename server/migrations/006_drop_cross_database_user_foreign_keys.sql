-- 账号与业务数据库拆分后，业务表只保留 user_id，不再跨库引用 users 表。
-- 清理拆分前旧表遗留的外键，否则仅存在于新认证库的账号无法保存业务数据。
DO $$
DECLARE foreign_key_name TEXT;
BEGIN
  FOR foreign_key_name IN
    SELECT constraint_def.conname
    FROM pg_constraint AS constraint_def
    JOIN pg_class AS referenced_table ON referenced_table.oid = constraint_def.confrelid
    JOIN pg_namespace AS referenced_namespace ON referenced_namespace.oid = referenced_table.relnamespace
    WHERE constraint_def.conrelid = 'achievement_progress'::regclass
      AND constraint_def.contype = 'f'
      AND referenced_table.relname = 'users'
      AND referenced_namespace.nspname = current_schema()
  LOOP
    EXECUTE format('ALTER TABLE achievement_progress DROP CONSTRAINT %I', foreign_key_name);
  END LOOP;

  FOR foreign_key_name IN
    SELECT constraint_def.conname
    FROM pg_constraint AS constraint_def
    JOIN pg_class AS referenced_table ON referenced_table.oid = constraint_def.confrelid
    JOIN pg_namespace AS referenced_namespace ON referenced_namespace.oid = referenced_table.relnamespace
    WHERE constraint_def.conrelid = 'hearthstone_profiles'::regclass
      AND constraint_def.contype = 'f'
      AND referenced_table.relname = 'users'
      AND referenced_namespace.nspname = current_schema()
  LOOP
    EXECUTE format('ALTER TABLE hearthstone_profiles DROP CONSTRAINT %I', foreign_key_name);
  END LOOP;
END $$;
