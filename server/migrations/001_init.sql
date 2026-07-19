-- 001_init.sql
-- 用户表：存储登录账号（密码仅存 bcrypt 哈希）
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 进度表：每人每成就一行，复用现有进度结构 { stages, count }
CREATE TABLE IF NOT EXISTS progress (
  user_id        INTEGER NOT NULL,
  achievement_id TEXT NOT NULL,
  stages_json    TEXT NOT NULL DEFAULT '{}',
  count          INTEGER NOT NULL DEFAULT 0,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);

-- 迁移记录：支撑表结构演进
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
