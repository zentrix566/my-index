import { ref } from 'vue'
import {
  buildExportBackup,
  downloadExportExcel,
  downloadExportJson
} from '../utils/achievementExport.js'
import { saveAchievementProgress } from '../api/progress.js'

/**
 * 管理成就进度的 JSON/Excel 导出与 JSON 恢复。
 */
export function useAchievementBackup({
  achievements,
  passBonus,
  user,
  progress,
  applyLocalProgress,
  showToast
}) {
  const exporting = ref(false)
  const fileInput = ref(null)

  function getExportBackup() {
    return buildExportBackup(achievements.value, passBonus.value, {
      user: user.value?.username || '未登录',
      scope: '完整成就库',
      progress: progress.value || {}
    })
  }

  function exportJson() {
    downloadExportJson(getExportBackup())
  }

  async function exportExcel() {
    exporting.value = true
    try {
      await downloadExportExcel(getExportBackup())
    } catch (error) {
      showToast('error', `导出 Excel 失败：${error.message || error}`)
    } finally {
      exporting.value = false
    }
  }

  function triggerImport() {
    if (!user.value) {
      showToast('error', '请先登录后再导入进度')
      return
    }
    fileInput.value?.click()
  }

  async function onImportFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const parsed = JSON.parse(await file.text())
      const importedProgress =
        parsed.progress && typeof parsed.progress === 'object'
          ? parsed.progress
          : parsed
      if (!importedProgress || typeof importedProgress !== 'object') {
        throw new Error('文件格式不正确')
      }
      await saveAchievementProgress(importedProgress)
      applyLocalProgress(importedProgress)
      showToast('success', '进度导入成功')
    } catch (error) {
      showToast('error', `导入失败：${error.message || error}`)
    } finally {
      event.target.value = ''
    }
  }

  return {
    exporting,
    fileInput,
    exportJson,
    exportExcel,
    triggerImport,
    onImportFile
  }
}
