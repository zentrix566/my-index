-- 001_init.sql
-- 用户表：存储登录账号（密码仅存 bcrypt 哈希）
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email         TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  has_password  BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_password BOOLEAN NOT NULL DEFAULT true;

-- 密码重置令牌（存 token 的 SHA-256，原始 token 仅出现在邮件链接）
-- email 唯一性在应用层保证（兼容 SQLite 加约束的方言差异），故此处不设 UNIQUE
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emailverify_user ON email_verification_tokens(user_id);

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
