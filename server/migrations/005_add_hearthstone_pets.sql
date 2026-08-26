ALTER TABLE hearthstone_cosmetic_collection
  DROP CONSTRAINT IF EXISTS hearthstone_cosmetic_collection_cosmetic_type_check;

ALTER TABLE hearthstone_cosmetic_collection
  ADD CONSTRAINT hearthstone_cosmetic_collection_cosmetic_type_check
  CHECK (cosmetic_type IN ('heroSkins', 'coins', 'cardBacks', 'pets'));
