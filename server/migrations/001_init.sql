-- 001_init.sql
-- 用户表：存储登录账号（密码仅存 bcrypt 哈希）
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 进度表：每人每成就一行，复用现有进度结构 { stages, count }
CREATE TABLE IF NOT EXISTS achievement_progress (
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  stages_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  count          INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ,
  achievement_name TEXT,
  version         TEXT,
  hero_class      TEXT,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON achievement_progress(user_id);

-- 迁移记录：支撑表结构演进
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
