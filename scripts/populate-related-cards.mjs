// 全站关联卡牌批量补全
// 遍历 src/features/hearthstone/data/achievements/*.json，
// 凡是 relatedCards 为空的成就，从「成就描述 + 各阶段描述」里提取卡名，
// 匹配 deck-card-images.json（OSS 图清单）的卡名 key，能匹配上的自动补上。
// 用法：
//   node scripts/populate-related-cards.mjs --dry   # 只打印，不写入
//   node scripts/populate-related-cards.mjs          # 写入文件
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../src/features/hearthstone/data/achievements')
const manifestPath = path.resolve(__dirname, '../src/features/hearthstone/data/deck-card-images.json')

const DRY_RUN = process.argv.includes('--dry')
const MIN_LEN = 3

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
// 仅用长度 >= MIN_LEN 的卡名做子串匹配，降低短词（如「庇护」「渡鸦」）误命中
const cardNames = Object.keys(manifest).filter((n) => n.length >= MIN_LEN)

const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'))
let totalUpdated = 0
const log = []

for (const file of files) {
  const fp = path.join(dataDir, file)
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'))
  let changed = false
  for (const ach of data.achievements || []) {
    if (Array.isArray(ach.relatedCards) && ach.relatedCards.length === 0) {
      const text = [ach.description, ...(ach.stages || []).map((s) => s.description || '')].join(' ')
      const matches = cardNames.filter((name) => text.includes(name))
      // 去掉被更长卡名包含的较短卡名（如「死亡之翼」被「疯狂巨龙死亡之翼」包含）
      const uniq = [...new Set(matches)].filter((n) => !matches.some((m) => m !== n && m.includes(n)))
      if (uniq.length) {
        ach.relatedCards = uniq
        changed = true
        totalUpdated++
        log.push(`${file} :: ${ach.name} => [${uniq.join(', ')}]`)
      }
    }
  }
  if (changed && !DRY_RUN) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8')
  }
}

console.log(log.join('\n'))
console.log(`\n总计更新 ${totalUpdated} 条成就的关联卡牌${DRY_RUN ? '（DRY RUN，未写入）' : ''}`)
