import { computed } from 'vue'
import { expansions } from '../data/expansions.js'
import {
  getClassName,
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
  isAchievementCompleted
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
  const myClassExpansionOrder = computed(() =>
    expansions
      .filter((expansion) => myFilteredByExpansion.value[expansion.id])
      .sort((left, right) => {
        const leftRemaining = countRemaining(
          myFilteredByExpansion.value[left.id],
          isAchievementCompleted
        )
        const rightRemaining = countRemaining(
          myFilteredByExpansion.value[right.id],
          isAchievementCompleted
        )
        if (leftRemaining !== rightRemaining) {
          return leftRemaining - rightRemaining
        }
        return left.name.localeCompare(right.name, 'zh')
      })
  )

  return {
    availableClasses,
    filteredAchievements,
    filteredByClass,
    myFilteredByClass,
    filteredByExpansion,
    myFilteredByExpansion,
    myClassExpansionOrder
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

function countRemaining(achievements, isAchievementCompleted) {
  return achievements.filter(
    (achievement) => !isAchievementCompleted(achievement)
  ).length
}
