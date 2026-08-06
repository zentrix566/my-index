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

/**
 * 官方全部版本清单 —— 44 个（按官方接口返回顺序记录，以后参考）
 * ------------------------------------------------------------------
 * 来源：GET https://webapi.blizzard.cn/hs-cards-api-server/api/web/cards/constructed/set
 *       （狂野卡牌分类的 subcategories 完整列表，含 44 个版本；标准分类是其子集）
 * 说明：
 *   - 记录全部 44 个官方版本（含无成就数据的），供其他功能（如卡牌检索/图库）参考；
 *     成就视图只用其中「有成就数据」的 27 个版本（见下方 expansions 数组）。
 *   - 顺序 = 官方接口返回顺序（序号低在前）。注意：**此顺序不是发布时间倒序**
 *     （例：深暗领域第 1、紫罗兰监狱第 10、翡翠梦境排在活动之后），
 *     仅作「官方版本清单」参考，不要用它推导发布时间。
 *   - 成就浏览视图（按职业浏览/我的成就）的版本顺序按**发布时间新→旧**排列
 *     （= expansions 数组顺序：紫罗兰监狱 → 大地的裂变 → 穿越时间流 → …），
 *     与官方接口顺序无关，见 useAchievementFilters.js。
 * 后续若官方接口调整版本，只需更新此数组。
 */
export const EXPANSION_OFFICIAL_ORDER = [
  { cardSetId: 1935, nameEn: 'the-great-dark-beyond',      setName: '深暗领域' },
  { cardSetId: 1905, nameEn: 'perils-in-paradise',         setName: '胜地历险记' },
  { cardSetId: 1897, nameEn: 'whizbangs-workshop',         setName: '威兹班的工坊' },
  { cardSetId: 1892, nameEn: 'showdown-in-the-badlands',   setName: '决战荒芜之地' },
  { cardSetId: 1858, nameEn: 'titans',                     setName: '泰坦诸神' },
  { cardSetId: 1809, nameEn: 'festival-of-legends',        setName: '传奇音乐节' },
  { cardSetId: 1941, nameEn: 'event',                      setName: '活动' },
  { cardSetId: 1946, nameEn: 'into-the-emerald-dream',     setName: '漫游翡翠梦境' },
  { cardSetId: 1957, nameEn: 'across-the-timeways',        setName: '穿越时间流' },
  { cardSetId: 1980, nameEn: 'cataclysm',                  setName: '大地的裂变' },
  { cardSetId: 1988, nameEn: 'escape-from-violet-hold',    setName: '逃离紫罗兰监狱' },
  { cardSetId: 1952, nameEn: 'the-lost-city-of-ungoro',    setName: '安戈洛龟途' },
  { cardSetId: 1898, nameEn: 'caverns-of-time',            setName: '时光之穴' },
  { cardSetId: 1776, nameEn: 'march-of-the-lich-king',     setName: '巫妖王的进军' },
  { cardSetId: 1869, nameEn: 'path-of-arthas',             setName: '阿尔萨斯之路' },
  { cardSetId: 1691, nameEn: 'murder-at-castle-nathria',   setName: '纳斯利亚堡的悬案' },
  { cardSetId: 1658, nameEn: 'voyage-to-the-sunken-city',  setName: '探寻沉没之城' },
  { cardSetId: 1626, nameEn: 'fractured-in-alterac-valley', setName: '奥特兰克的决裂' },
  { cardSetId: 1578, nameEn: 'united-in-stormwind',        setName: '暴风城下的集结' },
  { cardSetId: 1525, nameEn: 'forged-in-the-barrens',      setName: '贫瘠之地的锤炼' },
  { cardSetId: 1466, nameEn: 'madness-at-the-darkmoon-faire', setName: '疯狂的暗月马戏团' },
  { cardSetId: 1443, nameEn: 'scholomance-academy',        setName: '通灵学园' },
  { cardSetId: 1414, nameEn: 'ashes-of-outland',           setName: '外域的灰烬' },
  { cardSetId: 1463, nameEn: 'demonhunter-initiate',       setName: '恶魔猎手新兵' },
  { cardSetId: 1403, nameEn: 'galakronds-awakening',       setName: '迦拉克隆的觉醒' },
  { cardSetId: 1347, nameEn: 'descent-of-dragons',         setName: '巨龙降临' },
  { cardSetId: 1158, nameEn: 'saviors-of-uldum',           setName: '奥丹姆奇兵' },
  { cardSetId: 1130, nameEn: 'rise-of-shadows',            setName: '暗影崛起' },
  { cardSetId: 1129, nameEn: 'rastakhans-rumble',          setName: '拉斯塔哈的大乱斗' },
  { cardSetId: 1127, nameEn: 'the-boomsday-project',       setName: '砰砰计划' },
  { cardSetId: 1125, nameEn: 'the-witchwood',              setName: '女巫森林' },
  { cardSetId: 1004, nameEn: 'kobolds-and-catacombs',      setName: '狗头人与地下城' },
  { cardSetId: 1001, nameEn: 'knights-of-the-frozen-throne', setName: '冰封王座的骑士' },
  { cardSetId: 27,   nameEn: 'journey-to-ungoro',          setName: '勇闯安戈洛' },
  { cardSetId: 25,   nameEn: 'mean-streets-of-gadgetzan',  setName: '龙争虎斗加基森' },
  { cardSetId: 23,   nameEn: 'one-night-in-karazhan',      setName: '卡拉赞之夜' },
  { cardSetId: 21,   nameEn: 'whispers-of-the-old-gods',   setName: '上古之神的低语' },
  { cardSetId: 20,   nameEn: 'league-of-explorers',        setName: '探险者协会' },
  { cardSetId: 15,   nameEn: 'the-grand-tournament',       setName: '冠军的试炼' },
  { cardSetId: 14,   nameEn: 'blackrock-mountain',         setName: '黑石山的火焰' },
  { cardSetId: 13,   nameEn: 'goblins-vs-gnomes',          setName: '地精大战侏儒' },
  { cardSetId: 12,   nameEn: 'naxxramas',                  setName: '纳克萨玛斯的诅咒' },
  { cardSetId: 1637, nameEn: 'core',                       setName: '核心' },
  { cardSetId: 1635, nameEn: 'legacy',                     setName: '怀旧' }
]
