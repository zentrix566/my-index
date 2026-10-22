import { ref } from 'vue'
import rawIdMap from '../data/achievement-id-map.json'
import { translateGameExport } from '../utils/achievementImportTranslate.js'
import { saveAchievementProgress } from '../api/progress.js'

// 站内成就 slug → 游戏内成就数字 ID（按阶段顺序），由 scripts/build-achievement-id-map.mjs 生成
const ID_MAP = rawIdMap.map

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
  const allowLowerProgress = ref(false)

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
      const translated = translateGameExport(parsed, {
        idMap: ID_MAP,
        achievementsBySlug,
        currentProgress: progress.value
      })
      if (!translated) {
        throw new Error(
          '不是采集器导出的成就文件（需要包含 items 数组，且元素带数字 id 字段）。如需恢复网站备份请用「导入 JSON 备份」'
        )
      }
      // 未上线/暂无 ID 映射的版本提示（名称兜底匹配可部分覆盖，见预览统计）
      translated.stats.excludedVersions = rawIdMap.meta?.excludedVersions || []
      importPreview.value = translated
      allowLowerProgress.value = false
      if (!translated.stats.matched) {
        showToast(
          'error',
          translated.stats.legacyExport
            ? '文件内没有能匹配到网站成就库的记录：该文件来自 v1.4.1 之前的旧版采集器（不含成就名称），请更新采集器后重新采集导出'
            : '文件内没有能匹配到网站成就库的记录'
        )
      }
    } catch (error) {
      showToast('error', `读取成就文件失败：${error.message || error}`)
    } finally {
      event.target.value = ''
    }
  }

  function cancelImport() {
    importPreview.value = null
    allowLowerProgress.value = false
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
        next.count = entry.count != null
          ? (allowLowerProgress.value ? Math.trunc(entry.count) : Math.max(baseCount, Math.trunc(entry.count)))
          : baseCount
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
      allowLowerProgress.value = false
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
    allowLowerProgress,
    triggerImport,
    onImportFile,
    cancelImport,
    confirmImport
  }
}
