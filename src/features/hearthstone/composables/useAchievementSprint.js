import { computed, reactive } from 'vue'
import { getClassName } from '../utils/achievements.js'

/**
 * 构建待完成清单的分类、排序和折叠状态。
 */
export function useAchievementSprint({
  achievements,
  query,
  getProgressInfo,
  getMetric
}) {
  const sectionCollapsed = reactive({
    recommendations: true,
    oneTime: true,
    count: true,
    points: true
  })

  const groups = computed(() => {
    const grouped = {
      oneTime: [],
      count: [],
      points: []
    }
    const searchText = query.value.trim().toLowerCase()

    for (const achievement of achievements.value) {
      if (!matchesSearch(achievement, searchText)) continue
      const progressInfo = getProgressInfo(achievement)
      // 有搜索词时不过滤已完成，与「按版本/按职业」等视图的搜索逻辑保持一致（搜全部成就）
      if (!searchText && progressInfo.completed) continue

      if (achievement.type !== '累计') {
        grouped.oneTime.push(achievement)
      } else if (getMetric(achievement) === 'points') {
        grouped.points.push(achievement)
      } else {
        grouped.count.push(achievement)
      }
    }

    return {
      oneTime: sortByRemaining(grouped.oneTime, getProgressInfo),
      count: sortByRemaining(grouped.count, getProgressInfo),
      points: sortByRemaining(grouped.points, getProgressInfo)
    }
  })

  const all = computed(() => [
    ...groups.value.oneTime,
    ...groups.value.count,
    ...groups.value.points
  ])

  const oneTimeRemaining = computed(() =>
    groups.value.oneTime.reduce(
      (total, achievement) =>
        total + (getProgressInfo(achievement).remainingCount || 0),
      0
    )
  )

  function toggleSection(key) {
    sectionCollapsed[key] = !sectionCollapsed[key]
  }

  return {
    groups,
    all,
    oneTimeRemaining,
    sectionCollapsed,
    toggleSection
  }
}

function matchesSearch(achievement, searchText) {
  if (!searchText) return true
  const targets = [
    achievement.name,
    getClassName(achievement),
    ...(achievement.relatedCards || []),
    ...(achievement.stages || []).map((stage) => stage.description)
  ]
  return targets
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(searchText))
}

function sortByRemaining(achievements, getProgressInfo) {
  return [...achievements].sort((left, right) => {
    const leftProgress = getProgressInfo(left)
    const rightProgress = getProgressInfo(right)
    if (leftProgress.remainingCount !== rightProgress.remainingCount) {
      return leftProgress.remainingCount - rightProgress.remainingCount
    }
    return rightProgress.percent - leftProgress.percent
  })
}
