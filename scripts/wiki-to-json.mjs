// 将 WebFetch 提取的文本转为炉石成就 JSON（仿照现有 achievements/*.json 格式）
// 用法: node scripts/wiki-to-json.mjs <infile> <outfile> <neutral:0|1> <versionId> <versionName> [wikiUrl] [mode]
//   mode=compact (默认): 严格格式 ### 小节 + 名称|描述|点数|关联
//   mode=raw:            wiki 渲染原始格式（## 小节 + 每行字段 + "X点成就点数" 锚定），用于综合页等
import fs from 'node:fs'

const [infile, outfile, neutralFlag, versionId, versionName, wikiUrl, mode] = process.argv.slice(2)
const neutral = neutralFlag === '1'
const text = fs.readFileSync(infile, 'utf8')

function makeCtx() {
  const groups = new Map()
  const order = []
  const ctx = {
    section: null,
    groups,
    order,
    addAch(name, desc, points, related) {
      if (!name) return
      const heroClass = neutral ? '中立' : ctx.section || '中立'
      const key = (neutral ? 'ALL' : ctx.section) + '||' + name
      if (!groups.has(key)) {
        groups.set(key, { heroClass, name, stages: [], related: new Set() })
        order.push(key)
      }
      const g = groups.get(key)
      const quota = parseInt((desc.match(/\d+/) || [0])[0], 10) || 0
      g.stages.push({ description: desc, xpReward: points, points, quota })
      if (related && !neutral) {
        related.split(/[、,，]/).map((s) => s.trim()).filter(Boolean).forEach((n) => g.related.add(n))
      }
    }
  }
  return ctx
}

function finalize(groups, order) {
  let idx = 0
  const achievements = []
  for (const key of order) {
    const g = groups.get(key)
    idx++
    const type = g.stages.length > 1 ? '累计' : '一次性'
    achievements.push({
      id: `${versionId}-${String(idx).padStart(3, '0')}`,
      name: g.name,
      heroClass: g.heroClass,
      type,
      difficulty: '中等',
      relatedCards: [...g.related],
      recommendedDecks: [],
      stages: g.stages
    })
  }
  const json = {
    id: versionId,
    name: versionName,
    description: `${versionName}成就数据（来自 ifindhs wiki）`,
    updatedAt: '2026-07-20',
    cardImageDir: versionId,
    referenceLinks: wikiUrl ? [{ name: `${versionName} wiki`, url: wikiUrl }] : [],
    achievements
  }
  fs.writeFileSync(outfile, JSON.stringify(json, null, 2))
  console.log(`生成 ${achievements.length} 条成就 -> ${outfile}`)
}

if (mode === 'raw') {
  const ctx = makeCtx()
  const lineInfos = lines(text).map((l) => {
    const t = l.trim()
    const sec = t.match(/^##\s+(.+)$/)
    if (sec) return { type: 'section', name: sec[1].trim() }
    if (/点成就点数/.test(t)) {
      const m = t.match(/(\d+)点成就点数/)
      return { type: 'points', points: m ? +m[1] : 0 }
    }
    if (!t) return { type: 'blank' }
    if (t.includes('名称描述完成奖励关联折叠备注')) return { type: 'header' }
    return { type: 'text', text: t }
  })
  let lastTexts = []
  for (const info of lineInfos) {
    if (info.type === 'section') {
      if (!info.name.includes('目录')) {
        ctx.section = info.name
        lastTexts = []
      }
      continue
    }
    if (info.type === 'header' || info.type === 'blank') continue
    if (info.type === 'text') {
      lastTexts.push(info.text)
      if (lastTexts.length > 2) lastTexts.shift()
      continue
    }
    if (info.type === 'points') {
      if (lastTexts.length >= 2) {
        ctx.addAch(lastTexts[lastTexts.length - 2], lastTexts[lastTexts.length - 1], info.points, '')
        lastTexts = []
      }
    }
  }
  finalize(ctx.groups, ctx.order)
} else {
  const ctx = makeCtx()
  for (const raw of lines(text)) {
    const line = raw.trim()
    if (!line) continue
    const secMatch = line.match(/^#{2,3}\s+(.+)$/)
    if (secMatch) {
      const s = secMatch[1].trim()
      if (!s.includes('目录')) ctx.section = s
      continue
    }
    if (line.includes('|')) {
      const parts = line.split('|').map((s) => s.trim())
      if (parts.length < 3) continue
      const [name, desc, pointsStr, related] = parts
      const points = parseInt((pointsStr || '').replace(/[^\d]/g, ''), 10) || 0
      ctx.addAch(name, desc, points, related || '')
    }
  }
  finalize(ctx.groups, ctx.order)
}

function lines(t) {
  return t.split('\n')
}
