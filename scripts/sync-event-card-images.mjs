#!/usr/bin/env node
/**
 * 小批量同步「活动新增卡 / 单卡换图」到 OSS，并写回 cards-db.json / deck-card-images.json。
 *
 * 设计：只处理脚本里列出的几张卡，不动全量卡库（fetch-hs-cards.mjs 若只跑单 set 会覆盖 cards-db.json，
 * 故这里走「读取现有清单 + 增量合并」的安全路径）。
 *   - 活动新卡：图片来自 Blizzard 国服 API 的事件集（/tmp/event_cards.json 由调用方预先拉取）。
 *   - 单卡换图（邪恶的虚鳞纳迦）：直接用本地 wild 目录里已更新的图，重传到 OSS 覆盖旧对象。
 *
 * 用法：
 *   node scripts/sync-event-card-images.mjs                 # 真传 + 写 JSON
 *   OSS_DRY_RUN=1 node scripts/sync-event-card-images.mjs   # 只下载/转换/校验，不传 OSS、不写 JSON
 *
 * 环境变量（复用上传脚本约定，从 .env 读取）：
 *   OSS_BUCKET / OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET
 *   EVENT_JSON   事件集卡牌 JSON 路径（默认 /tmp/event_cards.json）
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

// 轻量 .env 加载（不覆盖已存在环境变量）
try {
  const envPath = join(repoRoot, '.env')
  if (existsSync(envPath)) {
    const text = readFileSync(envPath, 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
} catch { /* ignore */ }

const DRY_RUN = process.env.OSS_DRY_RUN === '1'
const DATA_DIR = join(repoRoot, 'src/features/hearthstone/data')
const DECK_IMG = join(DATA_DIR, 'deck-card-images.json')
const CARDS_DB = join(DATA_DIR, 'cards-db.json')
const WILD = 'E:/github/my-heartstone/hearthstone_cards/wild'
const EVENT_JSON = process.env.EVENT_JSON || '/tmp/event_cards.json'
const TMP = join(repoRoot, '.tmp-event-sync')
const PY = 'D:/software/Python/python.exe'

const ossMod = await import('ali-oss')
const oss = ossMod.default || ossMod
const client = new oss({
  region: `oss-${process.env.OSS_REGION || 'cn-beijing'}`,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
})

mkdirSync(TMP, { recursive: true })

/** PNG -> JPG（用系统 Python 的 Pillow，保持与现有 活动 crop 一致的 JPEG 格式） */
function pngToJpg(pngPath, jpgPath) {
  const code = [
    "import sys",
    "from PIL import Image",
    "p = sys.argv[1]; j = sys.argv[2]",
    "Image.open(p).convert('RGB').save(j, 'JPEG', quality=92)"
  ].join('\n')
  execFileSync(PY, ['-c', code, pngPath, jpgPath])
}

async function download(url, dest) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(`download ${url} -> ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  if (!buf.length) throw new Error('empty body: ' + url)
  writeFileSync(dest, buf)
  return buf
}

// 待处理卡牌清单
const evil = {
  name: '邪恶的虚鳞纳迦', id: 126663, setName: '逃离紫罗兰监狱', setFolder: '逃离紫罗兰监狱',
  source: 'local',
  fullLocal: join(WILD, 'full', '邪恶的虚鳞纳迦_126663.png'),
  cropLocal: join(WILD, 'crop', '邪恶的虚鳞纳迦_126663.png')
}

function buildEventCards() {
  const j = JSON.parse(readFileSync(EVENT_JSON, 'utf8'))
  const list = j?.data?.list || j?.list || (Array.isArray(j) ? j : [])
  const names = ['蛙生', '灵魂献祭', '绝境贿赂']
  return names.map((name) => {
    const c = list.find((x) => x.name === name)
    if (!c) throw new Error(`事件集 JSON 未找到卡牌：${name}`)
    return {
      name, id: c.id, setName: '活动', setFolder: '活动',
      source: 'url', fullUrl: c.image, cropUrl: c.crop_image, api: c
    }
  })
}

async function processCard(card) {
  const fullSrc = join(TMP, `${card.name}_${card.id}_full.png`)
  const cropSrc = join(TMP, `${card.name}_${card.id}_crop.png`)
  const cropJpg = join(TMP, `${card.name}_${card.id}_crop.jpg`)

  if (card.source === 'local') {
    copyFileSync(card.fullLocal, fullSrc)
    copyFileSync(card.cropLocal, cropSrc)
  } else {
    await download(card.fullUrl, fullSrc)
    await download(card.cropUrl, cropSrc)
  }
  pngToJpg(cropSrc, cropJpg)

  const fullKey = `hearthstone-cards/${card.setFolder}/full/${card.name}_${card.id}.png`
  const cropKey = `hearthstone-cards/${card.setFolder}/crop/${card.name}_${card.id}.jpg`
  const ossFull = `/hearthstone-cards/${card.setFolder}/full/${card.name}_${card.id}.png`
  const ossCrop = `/hearthstone-cards/${card.setFolder}/crop/${card.name}_${card.id}.jpg`

  if (DRY_RUN) {
    console.log(`[DRY-RUN] 将上传 ${card.name}: ${fullKey} + ${cropKey}`)
  } else {
    await client.put(fullKey, fullSrc, { headers: { 'x-oss-object-acl': 'public-read', 'Content-Type': 'image/png' } })
    await client.put(cropKey, cropJpg, { headers: { 'x-oss-object-acl': 'public-read', 'Content-Type': 'image/jpeg' } })
    console.log(`  已上传 ${card.name} (id ${card.id})`)
  }
  return { card, ossFull, ossCrop }
}

function applyManifests(results) {
  const di = JSON.parse(readFileSync(DECK_IMG, 'utf8'))
  const db = JSON.parse(readFileSync(CARDS_DB, 'utf8'))

  for (const r of results) {
    const { card, ossFull, ossCrop } = r
    if (card.source === 'local') {
      // 邪恶：保留原 rarityId，仅刷新 OSS 路径
      di[card.name] = { ...(di[card.name] || {}), crop: ossCrop, full: ossFull }
    } else {
      const c = card.api
      di[card.name] = { crop: ossCrop, full: ossFull, rarityId: c.rarity_id }
      db[String(c.id)] = {
        id: c.id, name: c.name, slug: c.slug || String(c.id),
        classId: c.class_id, multiClassIds: c.multi_class_ids || [],
        minionTypeId: c.minion_type_id, cardTypeId: c.card_type_id,
        cardSetId: c.card_set_id, setName: '活动', rarityId: c.rarity_id,
        manaCost: c.mana_cost, attack: c.attack, health: c.health,
        text: c.text || '', flavorText: c.flavor_text || '',
        image: c.image, cropImage: c.crop_image,
        ossFull, ossCrop, collectible: c.collectible, setPriority: c.set_priority ?? 0
      }
    }
  }

  if (DRY_RUN) {
    console.log(`[DRY-RUN] 将写入 deck-card-images.json（${Object.keys(di).length} 条）、cards-db.json（${Object.keys(db).length} 条）`)
  } else {
    writeFileSync(DECK_IMG, JSON.stringify(di, null, 2) + '\n')
    writeFileSync(CARDS_DB, JSON.stringify(db))
    console.log(`已写回 deck-card-images.json（${Object.keys(di).length} 条）+ cards-db.json（${Object.keys(db).length} 条）`)
  }
}

const cards = [evil, ...buildEventCards()]
console.log(`处理 ${cards.length} 张卡${DRY_RUN ? '（DRY-RUN）' : ''}...`)
const results = []
for (const card of cards) {
  console.log(`→ ${card.name} (id ${card.id}, ${card.setFolder})`)
  results.push(await processCard(card))
}
applyManifests(results)
console.log('完成。')
