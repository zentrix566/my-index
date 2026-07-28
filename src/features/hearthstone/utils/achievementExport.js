// 成就进度导出 / 导入相关的纯函数工具（与组件解耦，便于复用与单测）
// 这些函数只依赖传入的成就对象与已导入的判定 helper，不触碰组件的响应式状态，也不发起网络请求。
import { useAchievementProgress } from '../composables/useAchievementProgress.js'
import { getClassName } from './achievements.js'

// 判定 helper 来自进度 composable 的全局单例（progressData 模块级共享）：
// 此处取一次即可，组件与工具共用同一份进度状态，不会重复拉取。
const {
  progress,
  isAchievementCompleted,
  getCount,
  getUnit,
  isStageCompleted,
  getAchievementXp
} = useAchievementProgress()

const EXPORT_COLUMNS = [
  '版本',
  '职业',
  '成就名称',
  '成就详情',
  '目前进度',
  '类型',
  '难度',
  '经验值',
  '成就值',
  '最后更新'
]

function formatExportTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

function exportFileStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes())
  ].join('')
}

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
      '成就详情': (ach.stages || [])
        .map((s, i) => `阶段 ${i + 1}：${s.description || ''}`)
        .join('\n'),
      '目前进度': completed ? '已完成' : nextTodoText(ach),
      '类型': ach.type === '累计' ? `累计·${getUnit(ach) === '点' ? '点数' : '次数'}` : ach.type,
      '难度': ach.difficulty,
      '经验值': Math.round(getAchievementXp(ach) * (1 + passBonus)),
      '成就值': (ach.stages || []).reduce((s, st) => s + (st.points || 0), 0),
      '最后更新': formatExportTime(progress.value[ach.id]?.updatedAt)
    })
  }
  return rows
}

/** 构建 Excel 与 JSON 共用的成就备份内容。 */
export function buildExportBackup(allAchievements, passBonus, options = {}) {
  const rows = buildExportRows(allAchievements, passBonus)
  const completed = rows.filter((row) => row['目前进度'] === '已完成').length
  const backup = {
    meta: {
      app: '炉石传说成就查看器',
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      user: options.user || '',
      scope: options.scope || '全部成就',
      passBonus: Number(passBonus) || 0,
      total: rows.length,
      completed,
      remaining: rows.length - completed
    },
    rows,
    progress: options.progress || {}
  }
  if (options.profile) backup.profile = options.profile
  return backup
}

/** 创建带摘要页、筛选和多行目标说明的 Excel 工作簿。 */
export function createExportWorkbook(XLSX, backup) {
  const workbook = XLSX.utils.book_new()
  const summary = [
    ['炉石传说成就进度备份'],
    ['导出时间', formatExportTime(backup.meta.exportedAt)],
    ['账号', backup.meta.user || '未登录'],
    ['导出范围', backup.meta.scope],
    ['成就总数', backup.meta.total],
    ['已完成', backup.meta.completed],
    ['未完成', backup.meta.remaining],
    ['通行证经验加成', `${Math.round((backup.meta.passBonus || 0) * 100)}%`],
    [],
    ['说明', '“成就进度”工作表每行一个成就；多阶段目标在同一单元格内分行展示。']
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summary)
  summarySheet['!cols'] = [{ wch: 18 }, { wch: 62 }]
  summarySheet['!merges'] = [XLSX.utils.decode_range('A1:B1')]

  const progressSheet = XLSX.utils.json_to_sheet(backup.rows, {
    header: EXPORT_COLUMNS
  })
  progressSheet['!cols'] = [
    { wch: 18 },
    { wch: 11 },
    { wch: 30 },
    { wch: 72 },
    { wch: 46 },
    { wch: 12 },
    { wch: 9 },
    { wch: 11 },
    { wch: 11 },
    { wch: 20 }
  ]
  progressSheet['!autofilter'] = {
    ref: `A1:J${Math.max(1, backup.rows.length + 1)}`
  }
  progressSheet['!freeze'] = { xSplit: 0, ySplit: 1 }
  progressSheet['!rows'] = [
    { hpt: 24 },
    ...backup.rows.map((row) => ({
      hpt: Math.min(96, 22 + (String(row['成就详情'] || '').split('\n').length - 1) * 18)
    }))
  ]
  const range = XLSX.utils.decode_range(progressSheet['!ref'])
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let column = range.s.c; column <= range.e.c; column++) {
      const address = XLSX.utils.encode_cell({ r: row, c: column })
      const cell = progressSheet[address]
      if (!cell) continue
      cell.s = {
        alignment: {
          vertical: 'top',
          wrapText: row > 0 && (column === 3 || column === 4)
        },
        font: row === 0 ? { bold: true } : undefined
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, summarySheet, '导出说明')
  XLSX.utils.book_append_sheet(workbook, progressSheet, '成就进度')
  return workbook
}

/** 下载与 Excel 行内容一致、并保留可恢复 progress 的 JSON 备份。 */
export function downloadExportJson(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json;charset=utf-8'
  })
  downloadBlob(blob, `hearthstone-achievements-${exportFileStamp()}.json`)
}

/** 下载格式化后的 Excel 备份。 */
export async function downloadExportExcel(backup) {
  const XLSX = await import('xlsx')
  const workbook = createExportWorkbook(XLSX, backup)
  const output = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true
  })
  const blob = new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  downloadBlob(blob, `hearthstone-achievements-${exportFileStamp()}.xlsx`)
}
