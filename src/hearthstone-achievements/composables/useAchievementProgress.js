/**
 * 成就进度 composable
 * - 默认从服务器加载「当前用户」进度到 progressData（后端按登录态返回）
 * - 支持传入自定义进度源（如未登录时的「示例进度」），所有计算函数随之切换
 */
import { ref, computed } from 'vue'

// 全局单例：当前登录用户的进度
const progressData = ref({})
const loaded = ref(false)
const loading = ref(false)
const error = ref(null)
let loadPromise = null
let progressGeneration = 0

// 从服务器加载（按登录态返回对应用户进度；匿名为空）
async function loadFromServer({ force = false } = {}) {
  if (loading.value) return loadPromise
  if (loaded.value && !force) return

  loading.value = true
  error.value = null
  const generation = progressGeneration
  loadPromise = (async () => {
    try {
      const resp = await fetch('/api/achievements/progress')
      if (!resp.ok) throw new Error(`Request failed with status ${resp.status}`)

      const data = await resp.json()
      if (generation !== progressGeneration) return
      progressData.value = data && typeof data === 'object' ? data : {}
      const n = Object.keys(progressData.value).length
      console.log(`[progress] 已加载成就进度 ${n} 条`, progressData.value)
    } catch (cause) {
      if (generation !== progressGeneration) return
      error.value = cause instanceof Error ? cause.message : '加载成就进度失败'
      console.warn('加载成就进度失败:', cause)
    } finally {
      if (generation === progressGeneration) {
        loaded.value = true
        loading.value = false
        loadPromise = null
      }
    }
  })()

  return loadPromise
}

const reload = () => loadFromServer({ force: true })

// 退出登录时立即清空内存中的用户进度，并阻止较早的请求回写旧用户数据。
const clear = () => {
  progressGeneration++
  progressData.value = {}
  loaded.value = true
  loading.value = false
  error.value = null
  loadPromise = null
}

// 初始化加载
loadFromServer()

export function useAchievementProgress(progressRef) {
  // 允许外部传入进度源（如示例进度）；默认用内部加载的用户进度
  const progress = progressRef || progressData

  /**
   * 判断某阶段是否已完成
   */
  function isStageCompleted(achievement, stageIdx) {
    const ach = progress.value[achievement.id]
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
    const ach = progress.value[achievement.id]
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
    let totalXp = 0
    let earnedXp = 0

    for (const ach of achievements) {
      if (!ach.stages) continue
      const achCompleted = isAchievementCompleted(ach)
      for (let i = 0; i < ach.stages.length; i++) {
        const stage = ach.stages[i]
        total++
        totalPoints += stage.points
        totalXp += stage.xpReward || 0
        if (isStageCompleted(ach, i)) {
          earnedPoints += stage.points
          earnedXp += stage.xpReward || 0
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
      totalXp,
      earnedXp,
      percentage: total > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    }
  }

  /**
   * 获取单条成就的基础经验值（所有阶段 xpReward 之和）
   */
  function getAchievementXp(achievement) {
    if (!achievement.stages) return 0
    return achievement.stages.reduce((sum, s) => sum + (s.xpReward || 0), 0)
  }

  // "快完成"判定阈值
  const ALMOST_DONE_MAX_REMAINING = 15
  const ALMOST_DONE_SINGLE_PERCENT = 80

  /**
   * 获取成就的进度信息（用于"快完成"视图）
   */
  function getProgressInfo(achievement) {
    if (!achievement.stages || achievement.stages.length === 0) {
      return { completed: false, percent: 0, hasCount: false, remainingCount: 0, remainingText: '', doneStages: 0, totalStages: 0 }
    }
    const completed = isAchievementCompleted(achievement)
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

    // 一次性
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
   * 判断成就是否"快完成"
   */
  function isAlmostDone(achievement) {
    const info = getProgressInfo(achievement)
    if (info.completed) return false
    if (info.hasCount) {
      if (info.totalStages === 1) {
        return info.percent >= ALMOST_DONE_SINGLE_PERCENT
      }
      return info.doneStages >= 1 && info.remainingCount > 0 && info.remainingCount <= ALMOST_DONE_MAX_REMAINING
    }
    return info.remainingCount === 1 && info.doneStages >= 1
  }

  return {
    progress,
    loaded,
    loading,
    error,
    reload,
    clear,
    isStageCompleted,
    isAchievementCompleted,
    getStats,
    getAchievementXp,
    getCount,
    getProgressInfo,
    isAlmostDone
  }
}
