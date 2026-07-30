import { computed, watch } from 'vue'
import {
  addedExpansions,
  expansions,
  originalExpansions
} from '../data/expansions.js'
import { matchesClass } from '../utils/achievements.js'
import {
  getAchievementCardCrop,
  getAchievementCardFull
} from '../utils/achievementCardImages.js'

/**
 * 组装成就目录、版本作用域和置顶映射。
 */
export function useAchievementCatalog({
  profile,
  hardcore,
  viewMode,
  myGroupBy,
  currentExpansionId,
  currentClass
}) {
  const addedExpansionIdSet = new Set(
    addedExpansions.map((expansion) => expansion.id)
  )

  const allAchievements = computed(() =>
    expansions.flatMap((expansion) =>
      expansion.achievements.map((achievement) =>
        attachCatalogMetadata(achievement, expansion)
      )
    )
  )

  const achievementById = computed(
    () =>
      new Map(
        allAchievements.value.map((achievement) => [
          achievement.id,
          achievement
        ])
      )
  )

  const pinnedAchievements = computed(() =>
    profile.value.pinnedAchievementIds
      .map((id) => achievementById.value.get(id))
      .filter(Boolean)
  )

  const coreAchievements = computed(() =>
    allAchievements.value.filter(
      (achievement) =>
        !addedExpansionIdSet.has(achievement._expansionId)
    )
  )

  const scopeAchievements = computed(() =>
    hardcore.value && viewMode.value === 'my'
      ? allAchievements.value
      : coreAchievements.value
  )

  const currentExpansion = computed(() =>
    expansions.find(
      (expansion) => expansion.id === currentExpansionId.value
    )
  )

  const currentExpansionAchievements = computed(() => {
    const expansion = currentExpansion.value
    if (!expansion) return []
    return expansion.achievements.map((achievement) =>
      attachCatalogMetadata(achievement, expansion)
    )
  })

  const currentClassAchievements = computed(() => {
    const source =
      hardcore.value &&
      (viewMode.value === 'my' || viewMode.value === 'class')
        ? allAchievements.value
        : coreAchievements.value
    return source.filter((achievement) =>
      matchesClass(achievement, currentClass.value)
    )
  })

  const showMoreVersions = computed(
    () =>
      viewMode.value === 'expansion' ||
      (viewMode.value === 'my' &&
        myGroupBy.value === 'expansion' &&
        hardcore.value)
  )

  watch(hardcore, (enabled) => {
    if (
      !enabled &&
      addedExpansionIdSet.has(currentExpansionId.value)
    ) {
      currentExpansionId.value = originalExpansions[0].id
    }
  })

  return {
    addedExpansionIdSet,
    allAchievements,
    coreAchievements,
    pinnedAchievements,
    scopeAchievements,
    currentExpansion,
    currentExpansionAchievements,
    currentClassAchievements,
    showMoreVersions
  }
}

function attachCatalogMetadata(achievement, expansion) {
  return {
    ...achievement,
    cards: (achievement.relatedCards || []).map((name) => ({
      name,
      image: getAchievementCardFull(name),
      imageFallback: getAchievementCardCrop(name)
    })),
    _expansionId: expansion.id,
    _expansionName: expansion.name
  }
}
