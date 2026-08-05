#!/usr/bin/env node
/**
 * 从 Blizzard 国服官方 API 拉取全部炉石卡牌，按 <版本>/<卡名>_<dbfId>.png 命名下载整卡图+缩略图，
 * 并生成：
 *   - cards-db.json           按 id 索引的完整卡牌库（未来「卡片检索」功能的数据源）
 *   - deck-card-images.json   按卡名索引（name -> {crop,full,rarityId}），卡组/成就 UI 零改动复用
 *   - achievement-card-images.json  按卡名索引（name -> {crop,full}），与上面同源派生
 *
 * 设计要点：
 *   - 图片命名带 dbfId（即 API 返回的 id 字段），与现有 deck-card-images.json 的命名惯例一致，迁移零成本。
 *   - 重名卡（如 3 张「蹩脚海盗」）因 id 不同天然互不冲突，数据库里每张印刷版独立成条。
 *   - 成就页按「卡名」查图时，取该名下 set_priority 最高者作为默认展示版（与游戏/NetEase 展示优先级一致）。
 *   - 两份 name 索引清单与旧文件做「合并」：新数据覆盖同名项，旧文件里新库没有的卡名（多为非收藏卡）予以保留，避免回退成「暂无图」。
 *   - 跨检查所有成就 JSON 的 relatedCards，报告未匹配到卡牌的卡名，便于补齐。
 *
 * 接口端点（基址 / set 列表 / 卡牌列表 / 单卡详情）统一见 scripts/blizzard-endpoints.mjs（单一查阅源）。
 *
 * 用法（在本机有外网的环境执行，沙箱无网）：
 *   node scripts/fetch-hs-cards.mjs                 # 真实拉取 + 下载 + 生成清单
 *   HS_DRY_RUN=1 node scripts/fetch-hs-cards.mjs    # 只拉元数据、不下载图片（快速验证接口/字段）
 *   HS_OFFLINE=1 HS_FIXTURE=scripts/__fx.json node scripts/fetch-hs-cards.mjs   # 离线自测：读 fixture，不联网、不下载
 *
 * 可覆盖的环境变量：
 *   HS_API_BASE      接口基址（默认上面那个）
 *   HS_LOCAL_ROOT    本地图库根目录（默认 E:/github/我的炉石2/hs-cards-id，与旧 hs-cards 分开放置）
 *   HS_DATA_OUT      输出清单目录（默认 src/features/hearthstone/data，离线自测建议指到临时目录）
 *   HS_DL_CONCURRENCY 图片下载并发（默认 8）
 *   HS_PAGE_CONCURRENCY 列表翻页并发（默认 4）
 *   HS_SET           只处理单个 set（如 standard），用于小范围验证；不设为全量
 */
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { readFileSync, existsSync, readdirSync, createWriteStream } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

// 轻量 .env 加载（不覆盖已存在的 shell 环境变量）
try {
  const envPath = resolve(repoRoot, '.env')
  if (existsSync(envPath)) {
    const text = readFileSync(envPath, 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
} catch { /* ignore */ }

import { BLIZZARD_API_BASE as API_BASE, SETS_URL, CARDS_URL } from './blizzard-endpoints.mjs'
const LOCAL_ROOT = process.env.HS_LOCAL_ROOT || 'E:/github/我的炉石2/hs-cards-id'
const DATA_DIR = resolve(process.env.HS_DATA_OUT || join(repoRoot, 'src/features/hearthstone/data'))
const PAGE_SIZE = 200
const DL_CONCURRENCY = Number(process.env.HS_DL_CONCURRENCY) || 8
const PAGE_CONCURRENCY = Number(process.env.HS_PAGE_CONCURRENCY) || 4
// 官方「构造模式」版本列表未包含、但卡牌实际携带的 cardSetId：映射成中文版本名，
// 避免兜底成 `set-<id>` 无名目录（如经典 Classic 的 cardSetId=3）。key 为字符串。
const SET_NAME_OVERRIDES = { '3': '经典' }
const DRY_RUN = process.env.HS_DRY_RUN === '1'
const OFFLINE = process.env.HS_OFFLINE === '1'
const FIXTURE = process.env.HS_FIXTURE || ''
const ONLY_SET = process.env.HS_SET || ''

const UA = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }

// 下载进度日志：同时写控制台与文件，便于断点续传时查看进度
const LOG_PATH = process.env.HS_LOG || join(dirname(LOCAL_ROOT), 'fetch-hs-cards.log')
const logStream = createWriteStream(LOG_PATH, { flags: 'a' })
const ts = () => new Date().toISOString()
function log(...a) { const s = `[${ts()}] ${a.join(' ')}`; process.stdout.write(s + '\n'); try { logStream.write(s + '\n') } catch { /* ignore */ } }
function warn(...a) { const s = `[${ts()}] [warn] ${a.join(' ')}`; process.stderr.write(s + '\n'); try { logStream.write(s + '\n') } catch { /* ignore */ } }

/** 文件名非法字符（Windows）：替换成下划线。卡名含 id 后缀，即使卡名部分撞车也唯一。 */
function safeName(n) { return String(n).replace(/[\\/:*?"<>|]/g, '_') }

async function apiGet(url) {
  const r = await fetch(url, { headers: UA })
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`)
  return r.json()
}
async function apiPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { ...UA, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`POST ${url} -> ${r.status}`)
  return r.json()
}

/** 按真实字节魔数（辅以 Content-Type）判定图片扩展名，避免把 JPEG 存成 .png 导致反代 nosniff 裂图 */
function detectExt(buf, contentType) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png'
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg'
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp'
  if (buf.slice(0, 3).toString() === 'GIF') return 'gif'
  if (contentType) {
    if (/png/.test(contentType)) return 'png'
    if (/jpe?g/.test(contentType)) return 'jpg'
    if (/webp/.test(contentType)) return 'webp'
    if (/gif/.test(contentType)) return 'gif'
  }
  return 'png'
}

const KNOWN_EXTS = ['png', 'jpg', 'webp', 'gif']

async function download(t) {
  if (DRY_RUN || OFFLINE) return
  const { url, card, kind } = t
  const base = card._base, v = card._setName
  // resume：该 base 任意已知扩展名已存在且非空则跳过（避免重复下载，也兼容历史 .png 误标文件）
  for (const e of KNOWN_EXTS) {
    try { const s = await stat(join(LOCAL_ROOT, v, kind, `${base}.${e}`)); if (s.size > 0) return } catch { /* not exist */ }
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctrl.signal })
    if (!r.ok) throw new Error(`download ${url} -> ${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length === 0) throw new Error('empty body')
    const ext = detectExt(buf, r.headers.get('content-type'))
    const dest = join(LOCAL_ROOT, v, kind, `${base}.${ext}`)
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, buf)
    if (kind === 'full') { card.localFull = dest; card.ossFull = `/hearthstone-cards/${v}/full/${base}.${ext}` }
    else { card.localCrop = dest; card.ossCrop = `/hearthstone-cards/${v}/crop/${base}.${ext}` }
  } finally { clearTimeout(timer) }
}

/** 并发池：限制同时进行的异步任务数 */
async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length)
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const cur = idx++
      results[cur] = await fn(items[cur], cur)
    }
  }
  const n = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}

function extractCard(c) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug || String(c.id),
    classId: c.class_id,
    multiClassIds: c.multi_class_ids || [],
    minionTypeId: c.minion_type_id,
    cardTypeId: c.card_type_id,
    cardSetId: c.card_set_id,
    rarityId: c.rarity_id,
    manaCost: c.mana_cost,
    attack: c.attack,
    health: c.health,
    text: c.text || '',
    flavorText: c.flavor_text || '',
    image: c.image || '',
    cropImage: c.crop_image || '',
    setPriority: c.set_priority ?? 0,
    collectible: c.collectible
  }
}

/**
 * /cards/constructed/set 返回的是「类别」（标准卡牌/狂野卡牌），
 * 每个类别下 subcategories 才是真实版本（逃离紫罗兰监狱/核心/…）。
 * 这里把 subcategory 摊平为 51 个真实版本：
 *   - name    : 中文版本名，用作本地目录名 + OSS 路径段 + 卡名默认展示版归属
 *   - value   : name_en，作为 POST /cards/constructed 的 set 值
 *   - id      : card_set_id，用于把单卡反查回版本
 *   - category: 所属类别 name_en（standard/wild），供 HS_SET=standard 这类按类别筛选
 */
async function getSets() {
  const res = await apiGet(SETS_URL)
  const cats = res?.data?.list ?? []
  const sets = []
  const seen = new Set()
  const catNames = new Set()
  for (const c of cats) {
    catNames.add(c.name_en)
    for (const sub of (c.subcategories || [])) {
      // 同一 card_set_id 同时出现在 standard 与 wild 类别下，按 id 去重，避免重复拉取/下载
      if (seen.has(sub.id)) continue
      seen.add(sub.id)
      sets.push({ id: sub.id, name: sub.name, value: sub.name_en, category: c.name_en })
    }
  }
  return { sets, catNames }
}

async function fetchCardsForSet(set) {
  const baseBody = {
    page: 1, page_size: PAGE_SIZE, class: 'all', mana_cost: [], sort: 'manaCost:asc',
    set: set.value, text_filter: '', attack: -1, faction: '', health: -1,
    keyword: '', minion_type: '', rarity: '', spell_school: '', type: ''
  }
  const first = await apiPost(CARDS_URL, baseBody)
  const d0 = first?.data ?? first
  const list0 = d0?.list ?? (Array.isArray(d0) ? d0 : [])
  const total = d0?.total ?? list0.length
  const all = [...list0]
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages > 1) {
    const tasks = []
    for (let p = 2; p <= pages; p++) tasks.push(p)
    const pageResults = await mapPool(tasks, PAGE_CONCURRENCY, async (p) => {
      const r = await apiPost(CARDS_URL, { ...baseBody, page: p })
      const d = r?.data ?? r
      return d?.list ?? (Array.isArray(d) ? d : [])
    })
    for (const lst of pageResults) all.push(...lst)
  }
  return all
}

function mergeManifest(path, neu) {
  let old = {}
  try { old = JSON.parse(readFileSync(path, 'utf8')) } catch { /* 无旧文件则纯新建 */ }
  return { ...old, ...neu }
}

/** 收集所有成就 JSON 的 relatedCards 卡名集合（用于仅给成就清单生成对应条目） */
function collectRelatedNames() {
  const dir = join(DATA_DIR, 'achievements')
  let files = []
  try { files = readdirSync(dir).filter((f) => f.endsWith('.json')) } catch { return new Set() }
  const names = new Set()
  for (const f of files) {
    try {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      const achs = Array.isArray(j) ? j : (j.achievements || [])
      for (const a of achs) for (const c of (a.relatedCards || [])) names.add(c)
    } catch { /* 忽略单个文件解析错误 */ }
  }
  return names
}

/** 跨检查：返回成就 relatedCards 中未匹配到卡牌的卡名（用于提示补齐） */
function checkRelatedCards(byNameMap) {
  const related = collectRelatedNames()
  return [...related].filter((n) => !byNameMap.has(n))
}

async function main() {
  const t0 = Date.now()
  log(`=== 启动 fetch-hs-cards === API=${API_BASE} LOCAL_ROOT=${LOCAL_ROOT} LOG=${LOG_PATH} DRY_RUN=${DRY_RUN} OFFLINE=${OFFLINE} ONLY_SET=${ONLY_SET || '全部'}`)
  let sets, rawCards
  if (OFFLINE) {
    if (!FIXTURE || !existsSync(FIXTURE)) { console.error('离线模式需要 HS_FIXTURE 指向一个 /constructed 响应 fixture'); process.exit(1) }
    const fx = JSON.parse(readFileSync(FIXTURE, 'utf8'))
    const d = fx?.data ?? fx
    rawCards = d?.list ?? (Array.isArray(d) ? d : [])
    const ids = [...new Set(rawCards.map((c) => c.card_set_id))]
    sets = ids.map((id) => ({ id, name: `set-${id}`, value: String(id) }))
    log(`[OFFLINE] fixture=${FIXTURE}, 卡片 ${rawCards.length} 张, 合成 sets=${sets.map((s) => s.name).join('/')}`)
  } else {
    const sc = await getSets()
    sets = sc.sets
    const catNames = sc.catNames
    log(`版本总数：${sets.length}（类别 ${catNames.size} 个）`)
    rawCards = []
    let targetSets
    if (ONLY_SET) {
      // HS_SET 既支持类别名（standard/wild，展开其下全部子版本），也支持单个版本 name/name_en/id
      if (catNames.has(ONLY_SET)) targetSets = sets.filter((s) => s.category === ONLY_SET)
      else targetSets = sets.filter((s) => s.value === ONLY_SET || s.name === ONLY_SET || String(s.id) === ONLY_SET)
      if (!targetSets.length) { warn(`HS_SET=${ONLY_SET} 未匹配到任何版本，将退出`); process.exit(1) }
      log(`筛选 HS_SET=${ONLY_SET} -> 处理 ${targetSets.length} 个版本`)
    } else {
      targetSets = sets
    }
    for (const s of targetSets) {
      try {
        const cards = await fetchCardsForSet(s)
        rawCards.push(...cards)
        log(`  版本 ${s.name}: ${cards.length} 张`)
      } catch (e) { warn(`  版本 ${s.name} 拉取失败：${e.message}`) }
    }
  }

  const cardsMap = new Map()
  const setById = new Map(sets.map((s) => [s.id, s.name]))

  // 收集卡片元数据 + 下载图片（离线/试跑跳过下载）
  const dlTasks = []
  for (const rc of rawCards) {
    const c = extractCard(rc)
    if (!c.id || !c.name) continue
    const setName = setById.get(c.cardSetId) || SET_NAME_OVERRIDES[String(c.cardSetId)] || `set-${c.cardSetId}`
    c.setName = setName
    const base = `${safeName(c.name)}_${c.id}`
    c._base = base
    c._setName = String(setName)
    // 先用常见默认扩展名占位（full= png，crop= jpg），真实格式由 download() 下载后据字节修正
    c.localFull = join(LOCAL_ROOT, String(setName), 'full', `${base}.png`)
    c.localCrop = join(LOCAL_ROOT, String(setName), 'crop', `${base}.jpg`)
    c.ossFull = `/hearthstone-cards/${setName}/full/${base}.png`
    c.ossCrop = `/hearthstone-cards/${setName}/crop/${base}.jpg`
    if (!OFFLINE && !DRY_RUN) {
      if (c.image) dlTasks.push({ url: c.image, card: c, kind: 'full', label: `${c.name}_${c.id}` })
      if (c.cropImage) dlTasks.push({ url: c.cropImage, card: c, kind: 'crop', label: `${c.name}_${c.id}(crop)` })
    }
    cardsMap.set(String(c.id), c)
  }

  if (dlTasks.length) {
    log(`下载图片 ${dlTasks.length} 张（并发 ${DL_CONCURRENCY}）... 日志：${LOG_PATH}`)
    let ok = 0, fail = 0
    await mapPool(dlTasks, DL_CONCURRENCY, async (t) => {
      try { await download(t); ok++ }
      catch (e) { fail++; if (fail <= 30) warn(`图失败 ${t.label}: ${e.message}`) }
      const done = ok + fail
      if (done % 200 === 0) log(`  进度 ${done}/${dlTasks.length}（成功 ${ok}，失败 ${fail}）`)
    })
    log(`图片下载完成：成功 ${ok}，失败 ${fail}`)
  } else {
    log(DRY_RUN ? '[DRY-RUN] 仅元数据分析，未下载图片' : '[OFFLINE] 未下载图片')
  }

  // 按名索引：同名取 set_priority 最高者（并列取 id 最大）作默认展示版
  const byName = new Map()
  for (const c of cardsMap.values()) {
    const prev = byName.get(c.name)
    if (!prev || c.setPriority > prev.setPriority || (c.setPriority === prev.setPriority && c.id > prev.id)) byName.set(c.name, c)
  }

  // 写 cards-db.json（按 id 索引，未来检索数据源）
  const db = {}
  for (const [id, c] of cardsMap) {
    db[id] = {
      id: c.id, name: c.name, slug: c.slug,
      classId: c.classId, multiClassIds: c.multiClassIds, minionTypeId: c.minionTypeId, cardTypeId: c.cardTypeId,
      cardSetId: c.cardSetId, setName: c.setName, rarityId: c.rarityId,
      manaCost: c.manaCost, attack: c.attack, health: c.health,
      text: c.text, flavorText: c.flavorText,
      image: c.image, cropImage: c.cropImage,
      ossFull: c.ossFull, ossCrop: c.ossCrop,
      collectible: c.collectible, setPriority: c.setPriority
    }
  }
  await mkdir(DATA_DIR, { recursive: true })
  if (DRY_RUN) {
    log(`[DRY-RUN] cards-db.json 将写入 ${cardsMap.size} 条（未实际写入）`)
  } else {
    await writeFile(join(DATA_DIR, 'cards-db.json'), JSON.stringify(db))
    log(`cards-db.json 写入 ${cardsMap.size} 条`)
  }

  // 成就相关卡名集合：成就清单只放这些卡，避免把全量卡牌灌进 achievement-card-images.json
  const relatedNames = collectRelatedNames()

  // 重生两份 name 索引清单（与旧文件合并，避免非收藏卡回退「暂无图」）
  const newDeck = {}, newAch = {}
  for (const [name, c] of byName) {
    newDeck[name] = { crop: c.ossCrop, full: c.ossFull, rarityId: c.rarityId }
    if (relatedNames.has(name)) newAch[name] = { crop: c.ossCrop, full: c.ossFull }
  }
  const mergedDeck = mergeManifest(join(DATA_DIR, 'deck-card-images.json'), newDeck)
  const mergedAch = mergeManifest(join(DATA_DIR, 'achievement-card-images.json'), newAch)
  if (DRY_RUN) {
    log(`[DRY-RUN] deck-card-images.json 将写入 ${Object.keys(mergedDeck).length} 条；achievement-card-images.json 将写入 ${Object.keys(mergedAch).length} 条（均未实际写入）`)
  } else {
    await writeFile(join(DATA_DIR, 'deck-card-images.json'), JSON.stringify(mergedDeck))
    await writeFile(join(DATA_DIR, 'achievement-card-images.json'), JSON.stringify(mergedAch))
    log(`deck-card-images.json（${Object.keys(mergedDeck).length}）+ achievement-card-images.json（${Object.keys(mergedAch).length}）已重写`)
  }

  const missing = checkRelatedCards(byName)
  log(`\n卡牌总数(去重 id)：${cardsMap.size}；卡名数(去重)：${byName.size}`)
  log(`输出目录：${DATA_DIR}`)
  if (missing.length) log(`⚠️ 成就 relatedCards 未匹配到卡牌的卡名（${missing.length}）：${[...missing].slice(0, 60).join('、')}${missing.length > 60 ? ' …' : ''}`)
  else log('✅ 所有成就 relatedCards 均在卡牌库中找到对应卡牌')
  const secs = ((Date.now() - t0) / 1000).toFixed(1)
  log(`=== 完成，耗时 ${secs}s，日志见 ${LOG_PATH} ===`)
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
