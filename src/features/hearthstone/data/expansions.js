/**
 * 炉石传说扩展包/版本数据索引
 * 版本列表按发布时间从新到旧排列
 */
import violetHold from './achievements/violet-hold.json'
import cataclysm from './achievements/cataclysm.json'
import cavernsOfTime from './achievements/caverns-of-time.json'
import ungoro from './achievements/ungoro.json'
import emeraldDream from './achievements/emerald-dream.json'
import deepdark from './achievements/deepdark.json'
import perilsInParadise from './achievements/perils-in-paradise.json'
import whizbang from './achievements/whizbang.json'
import titan from './achievements/titan.json'
import badlands from './achievements/badlands.json'
import legendFestival from './achievements/legend-festival.json'
import core2023 from './achievements/core-2023.json'
import nathria from './achievements/nathria.json'
import sunkenCity from './achievements/sunken-city.json'
import core2022 from './achievements/core-2022.json'
import alterac from './achievements/alterac.json'
import stormwind from './achievements/stormwind.json'
import barrens from './achievements/barrens.json'
import core2021 from './achievements/core-2021.json'
import darkmoon from './achievements/darkmoon.json'
import scholomance from './achievements/scholomance.json'
import outland from './achievements/outland.json'
import dragons from './achievements/dragons.json'
import uldum from './achievements/uldum.json'
import riseOfShadows from './achievements/rise-of-shadows.json'
import lichKing from './achievements/lich-king.json'
import zonghe from './achievements/zonghe.json'
import CORE_EXPANSION_IDS from './core-expansion-ids.js'

// 版本列表（按发布时间从新到旧排列）
export const expansions = [
  violetHold,        // 紫罗兰监狱
  cataclysm,         // 大地的裂变
  cavernsOfTime,     // 穿越时间流
  ungoro,            // 安戈洛龟途
  emeraldDream,      // 翡翠梦境
  deepdark,          // 深暗领域
  perilsInParadise,  // 胜地历险记
  whizbang,          // 威兹班
  titan,             // 泰坦诸神
  badlands,          // 荒芜之地
  legendFestival,    // 传奇音乐节
  core2023,          // 核心（狮鹫年）
  nathria,           // 纳斯利亚堡
  sunkenCity,        // 沉没之城
  core2022,          // 核心（多头蛇年）
  alterac,           // 奥特兰克
  stormwind,         // 暴风城
  barrens,           // 贫瘠之地
  core2021,          // 核心（独狼年）
  darkmoon,          // 暗月马戏团
  scholomance,       // 通灵学园
  outland,           // 外域的灰烬
  dragons,           // 巨龙降临
  uldum,             // 奥丹姆奇兵
  riseOfShadows,     // 暗影崛起
  lichKing,          // 巫妖王
  zonghe             // 游戏-综合
]

/**
 * 原有版本（wiki 本地化任务之前就已存在）：继续留在主标签栏，不收进下拉。
 * 其余（含泰坦诸神及本次 17 个新本地化版本）为「之后新增」，收进「更多版本」下拉，
 * 与原有版本分开展示，避免主标签栏平铺 27 个混在一起。
 */
const originalExpansionIds = new Set(CORE_EXPANSION_IDS)
export const originalExpansions = expansions.filter((exp) => originalExpansionIds.has(exp.id))

/**
 * 「更多版本」下拉展示顺序（用户指定，非单纯发布时间倒序）。
 * 与 expansions 数组本身的顺序解耦：expansions 仍保持发布时间从新到旧（供其它视图使用），
 * 仅「更多版本」下拉按此顺序呈现，首行即 泰坦诸神 + 传奇音乐节。
 */
export const ADDED_EXPANSION_ORDER = [
  'titan', // 泰坦诸神
  'legend-festival', // 传奇音乐节
  'lich-king', // 巫妖王
  'nathria', // 纳斯利亚堡
  'sunken-city', // 沉没之城
  'alterac', // 奥特兰克
  'stormwind', // 暴风城
  'barrens', // 贫瘠之地
  'darkmoon', // 暗月马戏团
  'scholomance', // 通灵学园
  'outland', // 外域的灰烬
  'dragons', // 巨龙降临
  'uldum', // 奥丹姆奇兵
  'rise-of-shadows', // 暗影崛起
  'core-2021', // 核心（独狼年）
  'core-2022', // 核心（多头蛇年）
  'core-2023', // 核心（狮鹫年）
  'zonghe' // 游戏-综合
]
const addedOrderMap = new Map(ADDED_EXPANSION_ORDER.map((id, i) => [id, i]))
export const addedExpansions = expansions
  .filter((exp) => !originalExpansionIds.has(exp.id))
  .sort((a, b) => (addedOrderMap.get(a.id) ?? 999) - (addedOrderMap.get(b.id) ?? 999))

/**
 * 按ID获取版本数据
 */
export const getExpansionById = (id) => expansions.find((exp) => exp.id === id)
