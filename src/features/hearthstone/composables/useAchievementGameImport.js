import { ref } from 'vue'
import rawIdMap from '../data/achievement-id-map.json'
import { saveAchievementProgress } from '../api/progress.js'

// 站内成就 slug → 游戏内成就数字 ID（按阶段顺序），由 scripts/build-achievement-id-map.mjs 生成
const ID_MAP = rawIdMap.map

// 采集器导出的 status：3=COMPLETE、4=REWARD_GRANTED 视为已完成；isComplete 字段兜底
function isGameItemDone(item) {
  if (!item) return false
  if (item.isComplete === true) return true
  return item.status != null && item.status >= 3
}

// 与 useAchievementProgress.isStageCompleted 同口径地判断「站内已有进度」里某阶段是否完成，
// 用于导入预览统计（新增了多少），以及合并时避免回退已有勾选。
function isStageDoneInEntry(entry, achievement, stageIdx) {
  if (!entry) return false
  const stage = achievement.stages?.[stageIdx]
  if (!stage) return false
  if (entry.stages?.[String(stageIdx)]) return true
  if (achievement.trackClasses || achievement.trackItems || achievement.type === '累计') {
    return entry.count != null && entry.count >= stage.quota
  }
  return false
}

/**
 * 把采集器导出的 achievements.json 翻译成站内进度增量。
 * 返回 null 表示文件不是采集器导出格式。
 */
function translateGameExport(payload, achievementsBySlug, currentProgress) {
  const items = Array.isArray(payload?.items) ? payload.items : null
  if (!items?.length || typeof items[0]?.id !== 'number') return null

  const itemsById = new Map()
  let sourceCompleted = 0
  for (const item of items) {
    itemsById.set(item.id, item)
    if (isGameItemDone(item)) sourceCompleted += 1
  }

  const entries = {}
  let matched = 0
  let stageHits = 0
  let countUpdates = 0
  let newlyCompleted = 0

  for (const [slug, hsIds] of Object.entries(ID_MAP)) {
    const achievement = achievementsBySlug.get(slug)
    if (!achievement?.stages?.length) continue

    const stages = {}
    let maxProgress = 0
    let touched = false
    const stageCount = Math.min(hsIds.length, achievement.stages.length)
    for (let i = 0; i < stageCount; i++) {
      const item = itemsById.get(hsIds[i])
      if (!item) continue
      touched = true
      if (isGameItemDone(item)) stages[String(i)] = true
      if (typeof item.progress === 'number' && item.progress > maxProgress) {
        maxProgress = item.progress
      }
    }
    if (!touched) continue
    matched += 1

    const entry = { stages }
    const usesCount =
      achievement.trackClasses || achievement.trackItems || achievement.type === '累计'
    if (usesCount && maxProgress > 0) entry.count = maxProgress

    const existing = currentProgress?.[slug]
    let hasNew = false
    for (let i = 0; i < achievement.stages.length; i++) {
      const doneAfter = Boolean(stages[String(i)]) ||
        (entry.count != null && entry.count >= achievement.stages[i].quota)
      const doneBefore = isStageDoneInEntry(existing, achievement, i)
      if (doneAfter && !doneBefore) {
        stageHits += 1
        hasNew = true
      }
    }
    if (entry.count != null && (existing?.count ?? 0) < entry.count) {
      countUpdates += 1
      hasNew = true
    }
    if (achievement.stages.every((_, i) =>
      isStageDoneInEntry(existing, achievement, i) ||
      Boolean(stages[String(i)]) ||
      (entry.count != null && entry.count >= achievement.stages[i].quota)
    ) && !achievement.stages.every((_, i) => isStageDoneInEntry(existing, achievement, i))) {
      newlyCompleted += 1
    }
    if (hasNew || !existing) entries[slug] = entry
  }

  const mappedIds = new Set(Object.values(ID_MAP).flat())
  let unmatchedItems = 0
  for (const item of items) {
    if (!mappedIds.has(item.id)) unmatchedItems += 1
  }

  return {
    entries,
    stats: {
      sourceItems: items.length,
      sourceCompleted,
      matched,
      stageHits,
      countUpdates,
      newlyCompleted,
      unmatchedItems
    }
  }
}

/**
 * 导入采集器（hs-cosmetics-collector）导出的成就进度文件：
 * 预览换算结果 → 确认后与现有进度合并（只推进、不回退）→ 全量保存到服务器。
 */
export function useAchievementGameImport({
  achievements,
  progress,
  applyLocalProgress,
  user,
  showToast
}) {
  const fileInput = ref(null)
  const importPreview = ref(null)
  const importing = ref(false)

  function triggerImport() {
    if (!user.value) {
      showToast('error', '请先登录后再导入游戏内进度')
      return
    }
    fileInput.value?.click()
  }

  async function onImportFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const parsed = JSON.parse(await file.text())
      const achievementsBySlug = new Map(
        achievements.value.map((achievement) => [achievement.id, achievement])
      )
      const translated = translateGameExport(parsed, achievementsBySlug, progress.value)
      if (!translated) {
        throw new Error(
          '不是采集器导出的成就文件（需要包含 items 数组，且元素带数字 id 字段）。如需恢复网站备份请用「导入 JSON 备份」'
        )
      }
      importPreview.value = translated
      if (!translated.stats.matched) {
        showToast('error', '文件内没有能匹配到网站成就库的记录')
      }
    } catch (error) {
      showToast('error', `读取成就文件失败：${error.message || error}`)
    } finally {
      event.target.value = ''
    }
  }

  function cancelImport() {
    importPreview.value = null
  }

  async function confirmImport() {
    if (!importPreview.value) return
    importing.value = true
    try {
      const current = progress.value || {}
      const merged = { ...current }
      const delta = {}
      for (const [slug, entry] of Object.entries(importPreview.value.entries)) {
        const existing = current[slug] || {}
        const stages = { ...(existing.stages || {}), ...(entry.stages || {}) }
        // count 必须是合法整数：服务端校验 typeof prog.count === 'number' && 安全整数 && >=0。
        // 非「累计/按职业/按物品」类成就（一次性、普通）由 stages 驱动完成，转换器不会写入 count，
        // 但服务端要求每条进度都带 count，故此处兜底为「已有值优先、否则 0」，避免缺字段被拒。
        const baseCount = Number.isFinite(existing.count) ? Math.trunc(existing.count) : 0
        const next = { ...existing, stages }
        next.count = entry.count != null ? Math.max(baseCount, Math.trunc(entry.count)) : baseCount
        merged[slug] = next
        delta[slug] = next
      }
      await saveAchievementProgress(merged)
      applyLocalProgress(delta)
      const { stageHits, newlyCompleted } = importPreview.value.stats
      showToast(
        'success',
        `游戏内成就导入成功：新增 ${stageHits} 个完成阶段` +
          (newlyCompleted ? `，其中 ${newlyCompleted} 个成就全部完成` : '')
      )
      importPreview.value = null
    } catch (error) {
      showToast('error', `成就进度导入失败：${error.message || error}`)
    } finally {
      importing.value = false
    }
  }

  return {
    fileInput,
    importPreview,
    importing,
    triggerImport,
    onImportFile,
    cancelImport,
    confirmImport
  }
}
