/**
 * 炉石数据资产来源清单。
 *
 * 卡组代码中的数字标识统一使用 dbfId，运行时只读取 dbfid-cardnames.json。
 * 图片清单按卡名索引，仅负责 OSS 图片定位，不属于另一套卡牌 ID 数据库。
 */
export const DATA_SOURCES = {
  deckCardIndex: {
    file: 'src/features/hearthstone/data/dbfid-cardnames.json',
    description:
      '卡组解析唯一 dbfId 索引，仅保留卡名、费用、稀有度和英雄职业，覆盖可收藏卡、衍生卡、英雄与历史卡牌。',
    generator: 'scripts/fetch-hsjson-cards.mjs',
    sourceEndpoint:
      'GET https://api.hearthstonejson.com/v1/{version}/{locale}/cards.json',
    regenerate: 'npm run refresh:hearthstone-cards',
    runtimeUsed: true
  },
  cardsDb: {
    file: 'src/features/hearthstone/data/cards-db.json',
    description:
      '暴雪国服构筑卡接口快照，供图片上传和未来卡片检索使用，不参与卡组代码解析。',
    generator: 'scripts/fetch-hs-cards.mjs',
    sourceEndpoint: 'POST /cards/constructed',
    regenerate: 'node scripts/fetch-hs-cards.mjs',
    runtimeUsed: false
  },
  deckCardImages: {
    file: 'src/features/hearthstone/data/deck-card-images.json',
    description: '按卡名索引的 OSS 图片路径，供卡组和成就界面显示图片。',
    generator: 'scripts/fetch-hs-cards.mjs',
    sourceEndpoint: 'POST /cards/constructed',
    regenerate: 'node scripts/fetch-hs-cards.mjs',
    runtimeUsed: true
  },
  achievementCardImages: {
    file: 'src/features/hearthstone/data/achievement-card-images.json',
    description: '仅包含成就关联卡的精简 OSS 图片索引。',
    generator: 'scripts/fetch-hs-cards.mjs',
    sourceEndpoint: 'POST /cards/constructed',
    regenerate: 'node scripts/fetch-hs-cards.mjs',
    runtimeUsed: true
  },
  versionNameMap: {
    file: 'src/features/hearthstone/data/version-name-map.js',
    description: '版本名称与版本 ID 的参考映射，不参与卡组代码解析。',
    generator: '版本映射生成脚本',
    sourceEndpoint: 'GET /cards/constructed/set',
    regenerate: '重新运行版本映射生成脚本',
    runtimeUsed: false
  }
}

/** 返回全部数据资产及其键名。 */
export function listDataSources() {
  return Object.entries(DATA_SOURCES).map(([key, value]) => ({ key, ...value }))
}

/** 按键名返回单个数据资产。 */
export function getDataSource(key) {
  return DATA_SOURCES[key]
}

export default { DATA_SOURCES, listDataSources, getDataSource }
