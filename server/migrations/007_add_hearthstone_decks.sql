-- 007: 新增炉石卡组分享表 hs_decks（2026-11）。
-- 本文件仅作为生产库人工执行的归档记录，可重复运行；
-- 服务启动时 ensureBusinessSchema（server/db/business-db.js）会幂等执行同一份定义，无需手动执行。
-- cards_json 保存上传时的卡牌快照（dbfId/名称/费用/稀有度），dbfId 退役后卡组仍可完整渲染。
-- achievement_id 是可选的站内成就 slug，关联后出现在该成就的「玩家分享」区。
-- user_id 为普通整数列，不引用认证库 users 表（跨库无法建外键）。

CREATE TABLE IF NOT EXISTS hs_decks (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  deck_code      TEXT NOT NULL,
  cards_json     JSONB NOT NULL,
  hero_class     TEXT NOT NULL DEFAULT '未知',
  game_format    INT NOT NULL DEFAULT 2,
  card_count     INT NOT NULL DEFAULT 0,
  achievement_id TEXT,
  visibility     TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'hidden')),
  author_name    TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hs_decks_user ON hs_decks(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_hs_decks_public ON hs_decks(visibility, updated_at DESC);

-- 先补列再建索引：旧结构的表 CREATE TABLE IF NOT EXISTS 会跳过，索引直接建会报 no such column
ALTER TABLE hs_decks ADD COLUMN IF NOT EXISTS achievement_id TEXT;
CREATE INDEX IF NOT EXISTS idx_hs_decks_achievement ON hs_decks(achievement_id);
