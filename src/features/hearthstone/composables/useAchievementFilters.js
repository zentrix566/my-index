import { computed } from 'vue'
import { expansions } from '../data/expansions.js'
import {
  getAchievementSearchTargets,
  getClassOrder,
  groupByClass,
  matchesClass
} from '../utils/achievements.js'

/**
 * 管理成就搜索、筛选、职业分组和版本分组。
 */
export function useAchievementFilters({
  allAchievements,
  currentExpansionAchievements,
  currentClassAchievements,
  myAchievements,
  viewMode,
  query,
  selectedClass,
  selectedDifficulty,
  selectedMetric,
  selectedStatus,
  currentExpansionId,
  getMetric,
  isAchievementCompleted,
  getProgressInfo
}) {
  const displayAchievements = computed(() => {
    if (query.value.trim()) return allAchievements.value
    if (viewMode.value === 'my') return myAchievements.value
    if (viewMode.value === 'class') return currentClassAchievements.value
    return currentExpansionAchievements.value
  })

  const availableExpansionClasses = computed(() =>
    getAvailableClasses(
      currentExpansionAchievements.value,
      currentExpansionId.value
    )
  )
  const availableMyClasses = computed(() =>
    getAvailableClasses(myAchievements.value, currentExpansionId.value)
  )
  const availableClasses = computed(() => {
    if (viewMode.value === 'class') return []
    return viewMode.value === 'my'
      ? availableMyClasses.value
      : availableExpansionClasses.value
  })

  const filteredAchievements = computed(() =>
    displayAchievements.value.filter((achievement) =>
      matchesFilters(achievement, {
        query: query.value,
        selectedClass: selectedClass.value,
        selectedDifficulty: selectedDifficulty.value,
        selectedMetric: selectedMetric.value,
        selectedStatus: selectedStatus.value,
        viewMode: viewMode.value,
        getMetric,
        isAchievementCompleted
      })
    )
  )

  const filteredByClass = computed(() =>
    groupByClass(filteredAchievements.value, { coreUmbrella: true })
  )
  const myFilteredByClass = computed(() =>
    sortGroupsByCompletion(
      groupByClass(filteredAchievements.value, { coreUmbrella: true }),
      isAchievementCompleted
    )
  )
  const filteredByExpansion = computed(() =>
    groupByExpansion(filteredAchievements.value)
  )
  const myFilteredByExpansion = computed(() =>
    sortGroupsByCompletion(
      groupByExpansion(filteredAchievements.value),
      isAchievementCompleted
    )
  )
  // 版本发布时间索引（expansions 数组 = 新→旧，索引小 = 新）
  const expansionTimeIndex = new Map(
    expansions.map((expansion, i) => [expansion.id, i])
  )
  // 按版本发布时间新→旧平铺（取消版本分组后，跨版本总览同一职业的所有成就）。
  // 浏览模式（按职业浏览）：版本内保持数据原顺序。
  const classFlatAchievements = computed(() =>
    [...filteredAchievements.value].sort(
      (a, b) =>
        (expansionTimeIndex.get(a._expansionId) ?? 999) -
        (expansionTimeIndex.get(b._expansionId) ?? 999)
    )
  )
  // 我的成就-按职业：与待完成清单一致，按 一次性 / 累计-次数 / 累计-点数 分组，
  // 组内未完成在前（剩余从低到高、完成度从高到低），已完成统一排在组尾。
  // 数据源 = 当前职业筛选后的成就（filteredAchievements）。
  const myClassGroups = computed(() => {
    const grouped = { oneTime: [], count: [], points: [] }
    for (const achievement of filteredAchievements.value) {
      if (achievement.type !== '累计') grouped.oneTime.push(achievement)
      else if (getMetric(achievement) === 'points') grouped.points.push(achievement)
      else grouped.count.push(achievement)
    }
    const sortGroup = (list) =>
      [...list].sort((left, right) => {
        const leftProgress = getProgressInfo(left)
        const rightProgress = getProgressInfo(right)
        if (leftProgress.completed !== rightProgress.completed) {
          return leftProgress.completed ? 1 : -1
        }
        if (leftProgress.remainingCount !== rightProgress.remainingCount) {
          return leftProgress.remainingCount - rightProgress.remainingCount
        }
        return rightProgress.percent - leftProgress.percent
      })
    return {
      oneTime: sortGroup(grouped.oneTime),
      count: sortGroup(grouped.count),
      points: sortGroup(grouped.points)
    }
  })
  // 平铺视图（全选范围等场景用）：按分组顺序依次展开
  const myClassFlatAchievements = computed(() => [
    ...myClassGroups.value.oneTime,
    ...myClassGroups.value.count,
    ...myClassGroups.value.points
  ])

  return {
    availableClasses,
    filteredAchievements,
    filteredByClass,
    myFilteredByClass,
    filteredByExpansion,
    myFilteredByExpansion,
    classFlatAchievements,
    myClassGroups,
    myClassFlatAchievements
  }
}

function getAvailableClasses(achievements, expansionId) {
  const classes = new Set()
  for (const achievement of achievements) {
    classes.add(achievement.heroClass || '中立')
    for (const heroClass of achievement.classes || []) {
      classes.add(heroClass)
    }
    for (const heroClass of achievement.dualClasses || []) {
      classes.add(heroClass)
    }
  }
  return getClassOrder(expansionId).filter((heroClass) =>
    classes.has(heroClass)
  )
}

function matchesFilters(
  achievement,
  {
    query,
    selectedClass,
    selectedDifficulty,
    selectedMetric,
    selectedStatus,
    viewMode,
    getMetric,
    isAchievementCompleted
  }
) {
  const searchText = query.trim().toLowerCase()
  if (selectedClass !== 'all' && !matchesClass(achievement, selectedClass)) {
    return false
  }
  if (
    selectedDifficulty !== 'all' &&
    achievement.difficulty !== selectedDifficulty
  ) {
    return false
  }
  if (!matchesMetric(achievement, selectedMetric, getMetric)) return false
  if (!searchText && viewMode === 'my' && selectedStatus !== 'all') {
    const completed = isAchievementCompleted(achievement)
    if (selectedStatus === '已完成' && !completed) return false
    if (selectedStatus === '未完成' && completed) return false
  }
  return !searchText || matchesSearch(achievement, searchText)
}

function matchesMetric(achievement, selectedMetric, getMetric) {
  if (selectedMetric === 'all') return true
  if (selectedMetric === '一次性') return achievement.type === '一次性'
  return (
    achievement.type === '累计' &&
    getMetric(achievement) === selectedMetric
  )
}

function matchesSearch(achievement, searchText) {
  return getAchievementSearchTargets(achievement)
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(searchText))
}

function groupByExpansion(achievements) {
  const groups = {}
  for (const expansion of expansions) {
    const matches = achievements.filter(
      (achievement) => achievement._expansionId === expansion.id
    )
    if (matches.length) groups[expansion.id] = matches
  }
  return groups
}

function sortGroupsByCompletion(groups, isAchievementCompleted) {
  const sortedGroups = {}
  for (const [key, achievements] of Object.entries(groups)) {
    sortedGroups[key] = [...achievements].sort(
      (left, right) =>
        Number(isAchievementCompleted(left)) -
        Number(isAchievementCompleted(right))
    )
  }
  return sortedGroups
}
