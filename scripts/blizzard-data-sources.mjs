/**
 * 炉石数据资产来源清单 —— 单一查阅源（配套 scripts/blizzard-endpoints.mjs）
 * ------------------------------------------------------------------
 * blizzard-endpoints.mjs 管「官方 / 外部 API 端点」；本文件管「本仓库内的
 * 数据文件」——每个 .json 从哪来、谁生成的、怎么重新生成、线上用没用。
 *
 * 以后要搞清楚某个数据文件（cards-db.json / hearthstonejson-zhCN-cards.json /
 * deck-card-images.json / …）的出处或重生方式，看这里即可，不必再翻各 fetch 脚本。
 *
 * 数据根目录：src/features/hearthstone/data/
 * 查阅工具：scripts/hsjson-query.mjs（按 dbfId/名称/set/职业/类型/稀有度查卡）
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const DATA_DIR = join(REPO_ROOT, 'src/features/hearthstone/data')

/**
 * @typedef {Object} DataSource
 * @property {string}  file            仓库内相对路径
 * @property {string}  description      这份数据是什么
 * @property {string}  generator        生成它的脚本
 * @property {string}  sourceEndpoint   它依赖的官方接口（见 blizzard-endpoints.mjs）
 * @property {string}  regenerate       重新生成的一条命令
 * @property {boolean} runtimeUsed      前端运行时是否已直接 import 使用
 * @property {number}  entryCount       大致条目数（写于生成时，仅供参考）
 */

/** @type {Record<string, DataSource>} */
export const DATA_SOURCES = {
  // —— 用户特别关注的「卡牌总库」——
  cardsDb: {
    file: 'src/features/hearthstone/data/cards-db.json',
    description:
      '按 id（dbfId）索引的完整卡牌库，每卡 21 字段（标识/分类/数值/文本/图片路径）。' +
      '是「未来卡片检索功能」的数据源，也是本仓库卡牌数据的真源（真源派生出下面两份 name 索引）。',
    generator: 'scripts/fetch-hs-cards.mjs（遍历全部 set 后写入）',
    sourceEndpoint:
      'POST /cards/constructed（分页 + 按 set 遍历；见 blizzard-endpoints.mjs 的 CARDS_URL）',
    regenerate: 'node scripts/fetch-hs-cards.mjs',
    runtimeUsed: false, // 前端 UI 暂未直接 import；upload-hs-cards-to-oss.mjs 读取用于上传；verify 脚本用于核对
    entryCount: 6331
  },

  deckCardImages: {
    file: 'src/features/hearthstone/data/deck-card-images.json',
    description:
      '按卡名索引 { crop, full, rarityId }，卡组 / 成就 UI 查卡图用（运行时消费）。',
    generator: 'scripts/fetch-hs-cards.mjs（与 cards-db 同一次运行派生，同名取 set_priority 最高者）',
    sourceEndpoint: 'POST /cards/constructed',
    regenerate: 'node scripts/fetch-hs-cards.mjs',
    runtimeUsed: true,
    entryCount: 5959
  },

  achievementCardImages: {
    file: 'src/features/hearthstone/data/achievement-card-images.json',
    description:
      '按卡名索引 { crop, full }（刻意不含 rarityId），仅含成就关联卡。',
    generator: 'scripts/fetch-hs-cards.mjs（collectRelatedNames 限定关联卡名范围）',
    sourceEndpoint: 'POST /cards/constructed',
    regenerate: 'node scripts/fetch-hs-cards.mjs',
    runtimeUsed: true,
    entryCount: 835
  },

  versionNameMap: {
    file: 'src/features/hearthstone/data/version-name-map.js',
    description:
      '版本名五列对齐映射（cardSetId / setName / nameEn / achievementId / achievementName）。' +
      '纯参考数据，尚未接入运行时 UI。',
    generator:
      '基于官方 GET /cards/constructed/set + cards-db.json 生成（原型脚本 __gen_version_map2.mjs 已清理）',
    sourceEndpoint: 'GET /cards/constructed/set',
    regenerate: '需重跑生成脚本（建议固化为正式脚本后再生成）',
    runtimeUsed: false,
    entryCount: 45
  },

  // —— 用户指定的「主体卡牌数据源」（已落地本仓库）——
  //    优先级高于 cards-db.json：标准字段 + 可靠 dbfId + 跨版本，是以后查卡牌的主要入口。
  hearthstoneJson: {
    file: 'src/features/hearthstone/data/hearthstonejson-zhCN-cards.json',
    description:
      '【主体卡牌数据源】第三方权威卡牌库 HearthstoneJSON 的 zhCN 可收藏卡，已落地本仓库。' +
      'JSON 数组，每张卡含 dbfId(number, 官方数据库 id) 与 id(string, 如 "AT_001")，' +
      '以及 name/text/cost/attack/health/rarity/set/cardClass/type/flavor 等；' +
      'name 等文本按 zhCN 本地化。查卡入口：scripts/hsjson-query.mjs。',
    generator: 'scripts/fetch-hsjson-cards.mjs（从 HearthstoneJSON 下载落地）',
    sourceEndpoint:
      'GET https://api.hearthstonejson.com/v1/{version}/{locale}/cards.collectible.json（version=latest 或补丁号，locale=zhCN）',
    regenerate: 'node scripts/fetch-hsjson-cards.mjs（建议 --version 锁定补丁号以保证可复现）',
    runtimeUsed: true, // 作为主体卡牌查找源；前端暂未 import，仅命令行/脚本查阅
    entryCount: 8115
  }
}

/** 返回所有数据资产清单（数组形式，便于遍历/打印）。 */
export function listDataSources() {
  return Object.entries(DATA_SOURCES).map(([key, v]) => ({ key, ...v }))
}

/** 取单个数据资产元信息（按对象键，如 'cardsDb'）。 */
export function getDataSource(key) {
  return DATA_SOURCES[key]
}

export default { DATA_SOURCES, listDataSources, getDataSource }
