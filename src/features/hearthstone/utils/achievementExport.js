// 成就进度导出 / 导入相关的纯函数工具（与组件解耦，便于复用与单测）
// 这些函数只依赖传入的成就对象与已导入的判定 helper，不触碰组件的响应式状态，也不发起网络请求。
import { useAchievementProgress } from '../composables/useAchievementProgress.js'
import { getClassName } from './achievements.js'

// 判定 helper 来自进度 composable 的全局单例（progressData 模块级共享）：
// 此处取一次即可，组件与工具共用同一份进度状态，不会重复拉取。
const {
  isAchievementCompleted,
  getCount,
  getUnit,
  isStageCompleted,
  getAchievementXp
} = useAchievementProgress()

// 触发浏览器下载一个 Blob（兼容动态创建 a 标签 + revoke）
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 生成「下一步要做的事」文字描述（用于导出的可读性进度）
export function nextTodoText(ach) {
  if (isAchievementCompleted(ach)) return '已完成'
  const stages = ach.stages || []
  if (ach.type === '累计') {
    const count = getCount(ach) ?? 0
    const next = stages.find((s) => count < (s.quota || 0))
    const quota = next ? next.quota : (stages[stages.length - 1]?.quota || 0)
    const remain = Math.max(0, quota - count)
    const desc = (next && next.description) || '累计目标'
    const unit = getUnit(ach)
    return remain > 0 ? `累计 ${count}/${quota}：${desc}（剩余 ${remain} ${unit}）` : '待完成'
  }
  for (let i = 0; i < stages.length; i++) {
    if (!isStageCompleted(ach, i)) {
      const desc = stages[i].description || `阶段${i + 1}`
      return `下一步：阶段${i + 1} ${desc}`.replace(/\s+$/, '')
    }
  }
  return '待完成'
}

// 构建导出用的「每行一个成就」表格数据（面向游戏爱好者精简版）
// 入参：allAchievements（扁平全部成就数组）、passBonus（数值，非 ref）
export function buildExportRows(allAchievements, passBonus) {
  const rows = []
  for (const ach of allAchievements) {
    const completed = isAchievementCompleted(ach)
    rows.push({
      '版本': ach._expansionName,
      '职业': getClassName(ach),
      '成就名称': ach.name,
      '成就详情': (ach.stages || []).map((s, i) => `阶段${i + 1}：${s.description || ''}`).join(' | '),
      '目前进度': completed ? '已完成' : nextTodoText(ach),
      '类型': ach.type === '累计' ? `累计·${getUnit(ach) === '点' ? '点数' : '次数'}` : ach.type,
      '难度': ach.difficulty,
      '经验值': Math.round(getAchievementXp(ach) * (1 + passBonus)),
      '成就值': (ach.stages || []).reduce((s, st) => s + (st.points || 0), 0)
    })
  }
  return rows
}
