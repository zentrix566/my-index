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

export function useAchievementProgress() {
  return {
    progress: progressData,
    loaded,
    isStageCompleted,
    isAchievementCompleted,
    getStats,
    getCount
  }
}
