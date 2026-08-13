-- 炉石外观收藏明细：每个用户的每项皮肤、幸运币或卡背各占一行。
CREATE TABLE IF NOT EXISTS hearthstone_cosmetic_collection (
  user_id        INT NOT NULL,
  cosmetic_type  TEXT NOT NULL CHECK (cosmetic_type IN ('heroSkins', 'coins', 'cardBacks')),
  cosmetic_id    TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cosmetic_type, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS idx_hearthstone_cosmetics_user_type
  ON hearthstone_cosmetic_collection(user_id, cosmetic_type);

-- 将旧 preferences_json.collection 一次性迁移到明细表。
INSERT INTO hearthstone_cosmetic_collection(user_id, cosmetic_type, cosmetic_id)
SELECT profile.user_id, source.cosmetic_type, source.cosmetic_id
FROM hearthstone_profiles AS profile
CROSS JOIN LATERAL (
  SELECT 'heroSkins' AS cosmetic_type, jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(profile.preferences_json->'collection'->'heroSkins') = 'array'
      THEN profile.preferences_json->'collection'->'heroSkins' ELSE '[]'::jsonb END
  ) AS cosmetic_id
  UNION ALL
  SELECT 'coins', jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(profile.preferences_json->'collection'->'coins') = 'array'
      THEN profile.preferences_json->'collection'->'coins' ELSE '[]'::jsonb END
  )
  UNION ALL
  SELECT 'cardBacks', jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(profile.preferences_json->'collection'->'cardBacks') = 'array'
      THEN profile.preferences_json->'collection'->'cardBacks' ELSE '[]'::jsonb END
  )
) AS source
ON CONFLICT DO NOTHING;

UPDATE hearthstone_profiles
SET preferences_json = preferences_json - 'collection'
WHERE preferences_json ? 'collection';
