import assert from 'node:assert/strict'
import test from 'node:test'

test('Excel 与 JSON 备份共用可读的多行成就明细', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response('{}', { status: 200 })
    const { useAchievementProgress } = await import(
      '../src/features/hearthstone/composables/useAchievementProgress.js'
    )
    const { buildExportBackup, createExportWorkbook } = await import(
      '../src/features/hearthstone/utils/achievementExport.js'
    )
    const progress = useAchievementProgress()
    progress.applyLocalProgress({
      demo: { stages: { 0: true, 1: true }, count: 7 }
    })

    const achievements = [{
      id: 'demo',
      name: '无差别骑士',
      heroClass: '圣骑士',
      type: '一次性',
      difficulty: '难',
      _expansionName: '紫罗兰监狱',
      stages: [
        { description: '一次消灭4个敌方随从。', xpReward: 300, points: 10 },
        { description: '一次消灭7个敌方随从。', xpReward: 400, points: 20 }
      ]
    }]
    const backup = buildExportBackup(achievements, 0, {
      user: 'owner',
      progress: progress.progress.value
    })

    assert.equal(backup.rows.length, 1)
    assert.equal(
      backup.rows[0]['成就详情'],
      '阶段 1：一次消灭4个敌方随从。\n阶段 2：一次消灭7个敌方随从。'
    )
    assert.equal(backup.rows[0]['目前进度'], '已完成')
    assert.ok(backup.rows[0]['最后更新'])

    const XLSX = await import('xlsx')
    const workbook = createExportWorkbook(XLSX, backup)
    assert.deepEqual(workbook.SheetNames, ['导出说明', '成就进度'])
    assert.equal(workbook.Sheets['成就进度']['D2'].v, backup.rows[0]['成就详情'])
  } finally {
    globalThis.fetch = originalFetch
  }
})
