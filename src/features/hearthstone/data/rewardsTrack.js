// 炉石传说奖励轨道（通行证）经验曲线
//
// 数据来源：暴雪官方奖励轨道（Barrens 及后续版本统一沿用同一套曲线形状）。
// 官方明确公布：等级 131–400 每级固定需要 1500 XP，累计至 400 级总经验 = 602,200。
//
// 本文件据此构建完整逐等级曲线：
//   - 等级 1–100：官方详细逐等级“升级所需经验”表（等级 100 累计 = 155,200）
//   - 等级 101–130：按 1325 → 1475 等差生成（30 级合计 = 42,000）
//   - 等级 131–400：每级 1500（270 级合计 = 405,000）
//   三者相加：155,200 + 42,000 + 405,000 = 602,200，与官方锚点完全一致。
//
// 命名约定：
//   xpToNext[level]      = 从 (level-1) 升到 level 所需的经验（xpToNext[1] = 0）
//   cumulativeXp[level]  = 升到 level（含）所需的总累计经验（cumulativeXp[1] = 0）
//   升到 400 级总经验 = cumulativeXp[400] = 602,200

// 等级 1..100 的“升级所需经验”（索引 0 对应等级 1，值为 0）
const XP_TO_LEVEL_1_100 = [
  0, 100, 100, 150, 150, 225, 225, 300, 300, 325,
  325, 350, 350, 375, 375, 400, 400, 425, 425, 450,
  450, 550, 600, 650, 675, 675, 875, 875, 1000, 1100,
  1200, 1200, 1250, 1250, 1300, 1300, 1350, 1350, 1400, 1400,
  1450, 1450, 1500, 1500, 1550, 1550, 1600, 1600, 1650, 1650,
  1700, 1700, 1750, 1750, 1800, 1800, 1850, 1850, 1900, 1900,
  1950, 1950, 2000, 2000, 2050, 2050, 2125, 2125, 2250, 2250,
  2375, 2375, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500,
  2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500,
  2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500
]

export const MAX_LEVEL = 400

// 当前赛季时间（所有人一致，结束日期固定、不可编辑）
export const SEASON_START = '2026-07-08'
export const SEASON_END = '2026-11-05'

// 升级到每一级所需的经验
export const xpToNext = (() => {
  const arr = new Array(MAX_LEVEL + 1) // 仅用索引 1..MAX_LEVEL
  for (let i = 0; i < 100; i++) arr[i + 1] = XP_TO_LEVEL_1_100[i]

  // 等级 101..130：1325 → 1475 等差，合计 42000
  const ramp = []
  let rampSum = 0
  for (let i = 0; i < 30; i++) {
    const v = Math.round(1325 + (1475 - 1325) * (i / 29))
    ramp.push(v)
    rampSum += v
  }
  ramp[29] += 42000 - rampSum // 修正四舍五入误差，确保恰好 42000
  for (let i = 0; i < 30; i++) arr[101 + i] = ramp[i]

  // 等级 131..400：每级 1500
  for (let lv = 131; lv <= MAX_LEVEL; lv++) arr[lv] = 1500

  return arr
})()

// 升到每一级（含）所需的累计经验
export const cumulativeXp = (() => {
  const arr = new Array(MAX_LEVEL + 1)
  arr[1] = 0
  for (let lv = 2; lv <= MAX_LEVEL; lv++) arr[lv] = arr[lv - 1] + xpToNext[lv]
  return arr
})()

// 满级（400 级）总经验，恒为 602,200
export const TOTAL_XP_MAX_LEVEL = cumulativeXp[MAX_LEVEL]

export function cumulativeXpForLevel(level) {
  const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))
  return cumulativeXp[lv]
}

// 给定累计经验，返回可达到的最高等级
export function levelForXp(totalXp) {
  const xp = Math.max(0, totalXp)
  if (xp >= cumulativeXp[MAX_LEVEL]) return MAX_LEVEL
  let lv = 1
  while (lv < MAX_LEVEL && cumulativeXp[lv + 1] <= xp) lv++
  return lv
}

// 当前等级 + 本级已累计经验 → 全轨道累计经验
export function xpForProgress(currentLevel, partialXp = 0) {
  return cumulativeXpForLevel(currentLevel) + Math.max(0, partialXp)
}

// 战令加成档位（官方机制：购买通行证即 +10%，20 级升至 +15%，70 级升至 +20%）
export const BOOST_TIERS = [
  { level: 1, boost: 0.1, label: '通行证 +10%' },
  { level: 20, boost: 0.15, label: '通行证 +15%' },
  { level: 70, boost: 0.2, label: '通行证 +20%' }
]

// 各模式对战经验模型（战令计算器 · 手动模式）
// 每分钟经验为官方固定值，不可调整；仅“每日时长”与“胜率”可调。
// 每小时经验 = 60 ×（胜率 × 胜每分钟经验 +（1 − 胜率）× 负每分钟经验）
export const PLAY_MODES = [
  { key: 'ladder', name: '天梯（标准 / 狂野）', winPerMin: 7.5, lossPerMin: 5.4 },
  { key: 'arena', name: '竞技场', winPerMin: 5.6, lossPerMin: 4.0 },
  { key: 'battlegrounds', name: '酒馆战棋', winPerMin: 5.6, lossPerMin: 4.0 }
]
