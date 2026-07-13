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
import badlands from './achievements/badlands.json'

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
  badlands           // 荒芜之地
]

/**
 * 按ID获取版本数据
 */
export const getExpansionById = (id) => expansions.find((exp) => exp.id === id)
