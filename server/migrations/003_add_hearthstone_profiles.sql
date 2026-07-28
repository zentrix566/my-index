CREATE TABLE IF NOT EXISTS hearthstone_profiles (
  user_id                INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pinned_achievement_id  TEXT,
  preferences_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
