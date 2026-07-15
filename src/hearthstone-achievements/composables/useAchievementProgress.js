/**
 * 成就进度读取 composable（只读）
 * 从服务器读取成就进度数据并展示
 */
import { ref } from 'vue'

// 全局单例进度数据
const progressData = ref({})
const loaded = ref(false)

// 从服务器加载
async function loadFromServer() {
  if (loaded.value) return
  try {
    const resp = await fetch('/api/achievements/progress')
    if (resp.ok) {
      const data = await resp.json()
      progressData.value = data && typeof data === 'object' ? data : {}
    }
  } catch (e) {
    console.warn('加载成就进度失败:', e)
  }
  loaded.value = true
}

// 初始化加载
loadFromServer()

/**
 * 判断某阶段是否已完成
 */
function isStageCompleted(achievement, stageIdx) {
  const ach = progressData.value[achievement.id]
  if (!ach) return false
  // 手动勾选
  if (ach.stages?.[String(stageIdx)]) return true
  // 如果设定了 count，按 quota 判断
  if (ach.count != null && achievement.stages?.[stageIdx]) {
    return ach.count >= achievement.stages[stageIdx].quota
  }
  return false
}

/**
 * 获取累计成就的当前 count 值
 */
function getCount(achievement) {
  const ach = progressData.value[achievement.id]
  if (!ach || ach.count == null) return null
  return ach.count
}

/**
 * 判断整个成就是否完成（所有阶段完成）
 */
function isAchievementCompleted(achievement) {
  if (!achievement.stages || achievement.stages.length === 0) return false
  return achievement.stages.every((_, idx) => isStageCompleted(achievement, idx))
}

/**
 * 获取成就集合的统计信息
 */
function getStats(achievements) {
  let total = 0
  let completed = 0
  let totalPoints = 0
  let earnedPoints = 0

  for (const ach of achievements) {
    if (!ach.stages) continue
    const achCompleted = isAchievementCompleted(ach)
    for (let i = 0; i < ach.stages.length; i++) {
      const stage = ach.stages[i]
      total++
      totalPoints += stage.points
      if (isStageCompleted(ach, i)) {
        earnedPoints += stage.points
        if (i === ach.stages.length - 1 && achCompleted) {
          completed++
        }
      }
    }
  }

  return {
    total,
    completed,
    totalPoints,
    earnedPoints,
    percentage: total > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
  }
}

// "快完成"判定阈值：累计型成就还差 <= 此次数达成下一阶段即视为快完成
const ALMOST_DONE_MAX_REMAINING = 15
// 单阶段累计型成就，完成度达到此百分比即视为快完成
const ALMOST_DONE_SINGLE_PERCENT = 80

/**
 * 获取成就的进度信息（用于"快完成"视图）
 * @returns {{
 *   completed: boolean, percent: number, hasCount: boolean,
 *   remainingCount: number, remainingText: string, doneStages: number, totalStages: number
 * }}
 *   - percent: 整体完成度百分比（0-100）
 *   - hasCount: 是否为累计型（以 achievement.type === '累计' 判定）
 *   - remainingCount: 数值化"还差多少"（累计型=下一阶段差额，一次性=剩余阶段数），用于排序
 *   - remainingText: 人类可读的剩余提示
 *   - doneStages / totalStages: 已完成阶段数 / 总阶段数
 */
function getProgressInfo(achievement) {
  if (!achievement.stages || achievement.stages.length === 0) {
    return { completed: false, percent: 0, hasCount: false, remainingCount: 0, remainingText: '', doneStages: 0, totalStages: 0 }
  }
  const completed = isAchievementCompleted(achievement)
  // 以成就定义里的 type 为准，而非进度数据里有没有 count
  // （未启动的累计型在进度文件里没有 count 字段，若按 count 判断会被误判成一次性）
  const isCumulative = achievement.type === '累计'

  if (isCumulative) {
    const count = getCount(achievement) ?? 0
    const total = achievement.stages.length
    let doneStages = 0
    let nextRemaining = null
    for (let i = 0; i < total; i++) {
      const quota = achievement.stages[i].quota
      if (count >= quota) {
        doneStages++
      } else if (nextRemaining == null) {
        nextRemaining = quota - count
      }
    }
    const lastQuota = achievement.stages[total - 1].quota
    const percent = lastQuota ? Math.min((count / lastQuota) * 100, 100) : 0
    if (completed) {
      return { completed: true, percent: 100, hasCount: true, remainingCount: 0, remainingText: '已完成', doneStages: total, totalStages: total }
    }
    return {
      completed: false,
      percent: Math.round(percent),
      hasCount: true,
      remainingCount: nextRemaining ?? 0,
      remainingText: nextRemaining != null ? `还差 ${nextRemaining} 次` : '',
      doneStages,
      totalStages: total
    }
  }

  // 一次性（靠 stages 勾选）
  const total = achievement.stages.length
  let doneStages = 0
  for (let i = 0; i < total; i++) {
    if (isStageCompleted(achievement, i)) doneStages++
  }
  const remaining = total - doneStages
  const percent = Math.round((doneStages / total) * 100)
  if (completed) {
    return { completed: true, percent: 100, hasCount: false, remainingCount: 0, remainingText: '已完成', doneStages: total, totalStages: total }
  }
  return {
    completed: false,
    percent,
    hasCount: false,
    remainingCount: remaining,
    remainingText: `还差 ${remaining} 阶段`,
    doneStages,
    totalStages: total
  }
}

/**
 * 判断成就是否"快完成"（排除"才刚启动"的成就）：
 * - 多阶段累计型：已推进过（完成过至少 1 阶段）且下一阶段还差次数 <= ALMOST_DONE_MAX_REMAINING
 * - 单阶段累计型：完成度 >= ALMOST_DONE_SINGLE_PERCENT
 * - 一次性多阶段：仅剩最后 1 个阶段
 */
function isAlmostDone(achievement) {
  const info = getProgressInfo(achievement)
  if (info.completed) return false
  if (info.hasCount) {
    // 累计型
    if (info.totalStages === 1) {
      return info.percent >= ALMOST_DONE_SINGLE_PERCENT
    }
    return info.doneStages >= 1 && info.remainingCount > 0 && info.remainingCount <= ALMOST_DONE_MAX_REMAINING
  }
  // 一次性：仅剩最后 1 阶段，且至少已完成过 1 阶段（排除 0% 的单阶段成就）
  return info.remainingCount === 1 && info.doneStages >= 1
}

export function useAchievementProgress() {
  return {
    progress: progressData,
    loaded,
    isStageCompleted,
    isAchievementCompleted,
    getStats,
    getCount,
    getProgressInfo,
    isAlmostDone
  }
}
