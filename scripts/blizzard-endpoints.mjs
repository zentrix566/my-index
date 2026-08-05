/**
 * 炉石传说外部接口 —— 单一查阅源
 * ------------------------------------------------------------------
 * 所有抓取/核对卡牌数据用到的**外部地址**都集中放这里，避免散落在各脚本里。
 * 查阅地址、改基址、加新端点，只动这一个文件即可。
 *
 * 含两类：
 *   A. Blizzard 国服官方 API（基础域名 https://webapi.blizzard.cn/hs-cards-api-server/api/web，
 *      可用环境变量 HS_API_BASE 覆盖，方便切测试环境）
 *   B. 第三方权威卡牌数据库 HearthstoneJSON（dbfId / id 对照真源，用户指定的「卡牌 id 地址」）
 *
 * 本仓库由官方接口生成的数据文件（cards-db.json 等）的出处，见配套模块 blizzard-data-sources.mjs
 */

const API_BASE = process.env.HS_API_BASE || 'https://webapi.blizzard.cn/hs-cards-api-server/api/web'

export const BLIZZARD_API_BASE = API_BASE

// 1) 版本（set）列表：标准/狂野两大类下的所有子版本
//    GET  https://webapi.blizzard.cn/hs-cards-api-server/api/web/cards/constructed/set
//    返回：{ list: [ { name, name_en, subcategories: [{ id, name, name_en }] } ] }
//    注：标准/狂野两分类里大量子版本重复（按 id 去重）；经典(id=3) 不在其中，靠 SET_NAME_OVERRIDES 兜底
export const SETS_URL = `${API_BASE}/cards/constructed/set`

// 2) 卡牌列表（按版本分页拉取）
//    POST https://webapi.blizzard.cn/hs-cards-api-server/api/web/cards/constructed
//    body: { page, page_size, class, mana_cost, sort, set, text_filter,
//            attack, faction, health, keyword, minion_type, rarity, spell_school, type }
//    返回：{ data: { list: [ { id, name, slug, class_id, card_set_id, rarity_id,
//                              mana_cost, attack, health, text, flavor_text,
//                              image, crop_image, set_priority, collectible, ... } ] } }
export const CARDS_URL = `${API_BASE}/cards/constructed`

// 3) 单张卡牌详情（Blizzard 国服，按卡牌 id / dbfId 查）—— 精确路径待确认
//    TODO: 官方精确路径仍未核实；下方为猜测占位，勿直接使用。
//    已知候选（未核实）：GET ${API_BASE}/cards/constructed/{id}
export const cardByIdUrl = (id) => `${API_BASE}/cards/constructed/${id}` // TODO: 确认官方精确路径

// ──────────────────────────────────────────────────────────────
// 4) 第三方权威卡牌数据库：HearthstoneJSON（用户指定的「卡牌 id 地址」）
//    这就是带 dbfId / id 的卡牌总库，是一个**实时地址**而非固定本地文件。
//    返回 JSON 数组，每张卡含 dbfId(number, 官方数据库 id) 与 id(string, 如 "AT_001")，
//    以及 name/text/cost/attack/health/rarity/set/cardClass 等；URL 路径里的 locale 决定本地化语言。
//      - latest  ：始终指向最新补丁（移动指针，会随版本变化）
//      - 固定版本：把 latest 换成补丁号，如 /v1/123456/zhCN/cards.collectible.json
export const HEARTHSTONE_JSON_BASE = 'https://api.hearthstonejson.com/v1'
export const collectibleCardsUrl = (locale = 'zhCN', version = 'latest') =>
  `${HEARTHSTONE_JSON_BASE}/${version}/${locale}/cards.collectible.json`
// 便捷别名：默认「最新中文可收藏卡」
export const CARDS_COLLECTIBLE_ZHCN_LATEST = collectibleCardsUrl('zhCN', 'latest')

export default {
  BLIZZARD_API_BASE,
  SETS_URL,
  CARDS_URL,
  cardByIdUrl,
  HEARTHSTONE_JSON_BASE,
  collectibleCardsUrl,
  CARDS_COLLECTIBLE_ZHCN_LATEST
}

// 这些官方端点「生成的数据文件」从哪来、怎么重生，见配套模块 blizzard-data-sources.mjs
// （cards-db.json / deck-card-images.json / achievement-card-images.json / version-name-map.js）。
