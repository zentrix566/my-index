/**
 * 炉石卡组分享路由（/api/hearthstone/decks）。
 * 用户登录后可保存卡组并设为私密/公开；公开卡组进入广场，所有人可浏览。
 * 保存时服务端解析 deck code 并生成卡牌快照（dbfId/名称/费用/稀有度），
 * 快照保证 dbfId 日后退役时卡组仍可完整渲染；卡组代码仅用于复制导入游戏。
 * 业务数据在主业务库 hs_decks 表（user_id 普通整数列，不引用认证库）。
 */
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { requireAuth, requireOwner, getUserIdFromReq, trackModuleAccessMiddleware } from '../auth.js'
import { getUserById } from '../db/auth-db.js'
import {
  createDeck,
  getDeckById,
  listUserDecks,
  countUserDecks,
  countUserDecksByAchievement,
  updateDeckMeta,
  updateDeckVisibilityByAdmin,
  deleteDeck,
  listPublicDecks,
  listPublicDecksByAchievements,
  listAllDecksAdmin
} from '../db/business-db.js'
import { sendInternalError } from '../validation.js'
import { hasAchievementMeta } from '../achievements-meta.js'

const router = express.Router()
const trackHearthstoneDecks = trackModuleAccessMiddleware('hearthstone')

const NAME_MAX = 50
const DESCRIPTION_MAX = 200
const DECKS_PER_USER = 50
const DECKS_PER_ACHIEVEMENT = 3
const PAGE_SIZE = 20
const BY_ACHIEVEMENT_MAX_IDS = 200
const OWNER_VISIBILITY = new Set(['private', 'public'])
const ALL_VISIBILITY = new Set(['private', 'public', 'hidden'])

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// deckstringCore.js 同时被前端（src/…）与服务端引用。生产镜像里没有 src/
// （Dockerfile 仅复制 server/ + 数据文件到 server/achievements-data/），
// 故优先从 server/achievements-data/ 加载，本地开发回退到 ../src/…。
// 候选路径动态 import，模式同 ai-advisor.js 的 core-expansion-ids 加载。
let deckstringCorePromise = null
function loadDeckstringCore() {
  if (!deckstringCorePromise) {
    deckstringCorePromise = import(
      pathToFileURL(path.resolve(__dirname, '../achievements-data/deckstringCore.js')).href
    ).catch(() =>
      import(
        pathToFileURL(path.resolve(__dirname, '../../src/features/hearthstone/utils/deckstringCore.js')).href
      )
    ).catch((error) => {
      deckstringCorePromise = null // 加载失败清空缓存，下次请求重试
      throw error
    })
  }
  return deckstringCorePromise
}

// dbfid-cardnames.json 与前端同源（deckstring.js 用同一份），懒加载 + 模块级缓存。
// 候选路径同上：生产镜像在 server/achievements-data/，本地开发在 src/。
const CARD_NAME_INDEX_CANDIDATES = [
  path.resolve(__dirname, '../achievements-data/dbfid-cardnames.json'),
  path.resolve(__dirname, '../../src/features/hearthstone/data/dbfid-cardnames.json')
]
let cardNameIndex = null
function getCardNameIndex() {
  if (!cardNameIndex) {
    const filePath = CARD_NAME_INDEX_CANDIDATES.find((candidate) => fs.existsSync(candidate))
    if (!filePath) throw new Error('找不到 dbfid-cardnames.json（卡组解析索引缺失）')
    cardNameIndex = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  }
  return cardNameIndex
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (error) {
      sendInternalError(res, '卡组操作失败，请稍后重试')
    }
  }
}

function clampText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function parsePage(query) {
  const page = parseInt(query.page, 10)
  return Number.isInteger(page) && page > 0 ? page : 1
}

/** 列表轻量结构：不含卡组代码与快照。 */
function toListDeck(deck) {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    heroClass: deck.heroClass,
    gameFormat: deck.gameFormat,
    cardCount: deck.cardCount,
    achievementId: deck.achievementId,
    visibility: deck.visibility,
    authorName: deck.authorName,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt
  }
}

/** 详情结构：含代码与快照，仅返回给有权限的请求方。 */
function toDetailDeck(deck) {
  return {
    ...toListDeck(deck),
    deckCode: deck.deckCode,
    cards: deck.cards,
    isOwner: true
  }
}

/** 解析卡组代码并生成保存所需字段；失败返回 { error }。 */
async function buildDeckFromCode(code) {
  const { isPlausibleDeckCode, parseDeckBytes, HERO_CLASS_FALLBACK } = await loadDeckstringCore()
  if (!isPlausibleDeckCode(code)) return { error: '卡组代码格式不正确' }
  let parsed
  try {
    parsed = parseDeckBytes(new Uint8Array(Buffer.from(code, 'base64')))
  } catch {
    return { error: '无法解析卡组代码，请确认复制完整' }
  }
  const index = getCardNameIndex()
  const cards = parsed.cards.map((card) => {
    const info = index.cards?.[card.dbfId] || null
    return info
      ? { dbfId: card.dbfId, count: card.count, name: info.name, cost: info.cost || 0, rarity: info.rarity || '', type: info.type || 'MINION' }
      : { dbfId: card.dbfId, count: card.count, name: null, cost: 0, rarity: '', type: 'MINION' }
  })
  const unknownCount = cards.filter((card) => !card.name).length
  if (unknownCount > 0) {
    return { error: `卡组中有 ${unknownCount} 张卡牌暂未收录，暂时无法保存，请稍后重试` }
  }
  const heroClasses = index.heroClasses || {}
  const heroClass = parsed.heroes
    .map((h) => heroClasses[h] || HERO_CLASS_FALLBACK[h])
    .find(Boolean) || '未知'
  return { cards, heroClass, total: parsed.total, format: parsed.format }
}

// 保存卡组（登录）
router.post('/', requireAuth, trackHearthstoneDecks, asyncRoute(async (req, res) => {
  const body = req.body || {}
  const code = typeof body.deckCode === 'string' ? body.deckCode.trim() : ''
  if (!code) return res.status(400).json({ error: '缺少卡组代码' })

  const built = await buildDeckFromCode(code)
  if (built.error) return res.status(400).json({ error: built.error })

  // 关联成就（可选）：必须是站内成就 slug；每成就每人限 DECKS_PER_ACHIEVEMENT 套
  const achievementId = typeof body.achievementId === 'string' ? body.achievementId.trim() : ''
  if (achievementId) {
    if (!hasAchievementMeta(achievementId)) {
      return res.status(400).json({ error: '关联的成就不存在' })
    }
    const achievementCount = await countUserDecksByAchievement(req.userId, achievementId)
    if (achievementCount >= DECKS_PER_ACHIEVEMENT) {
      return res.status(400).json({ error: `该成就下你已分享 ${DECKS_PER_ACHIEVEMENT} 套卡组，可先删除旧的再分享` })
    }
  }

  const count = await countUserDecks(req.userId)
  if (count >= DECKS_PER_USER) {
    return res.status(400).json({ error: `卡组保存数量已达上限（${DECKS_PER_USER} 套），请先删除部分卡组` })
  }

  const visibility = OWNER_VISIBILITY.has(body.visibility) ? body.visibility : 'private'
  const name = clampText(body.name, NAME_MAX) || `「${built.heroClass}」卡组`
  const user = await getUserById(req.userId)
  const deck = await createDeck(req.userId, {
    name,
    description: clampText(body.description, DESCRIPTION_MAX),
    deckCode: code,
    cards: built.cards,
    heroClass: built.heroClass,
    gameFormat: built.format,
    cardCount: built.total,
    achievementId: achievementId || null,
    visibility,
    authorName: user?.display_name || user?.username || ''
  })
  res.status(201).json({ deck: toDetailDeck(deck) })
}))

// 我的卡组列表（登录，含私密的全部）
router.get('/mine', requireAuth, asyncRoute(async (req, res) => {
  const decks = await listUserDecks(req.userId)
  res.json({ decks: decks.map(toDetailDeck) })
}))

// 公开卡组广场（无需登录）
router.get('/public', asyncRoute(async (req, res) => {
  const page = parsePage(req.query)
  const gameFormatRaw = parseInt(req.query.format, 10)
  const result = await listPublicDecks({
    heroClass: clampText(req.query.class, 20) || undefined,
    gameFormat: gameFormatRaw >= 1 && gameFormatRaw <= 3 ? gameFormatRaw : undefined,
    keyword: clampText(req.query.q, 50) || undefined,
    achievementId: clampText(req.query.achievement, 60) || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE
  })
  res.json({ decks: result.decks.map(toListDeck), total: result.total, page, pageSize: PAGE_SIZE })
}))

// 批量拉取一批成就的玩家分享卡组（成就页「玩家分享」区，无需登录）
router.get('/public/by-achievements', asyncRoute(async (req, res) => {
  const ids = (req.query.ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, BY_ACHIEVEMENT_MAX_IDS)
  if (!ids.length) return res.json({})
  const grouped = await listPublicDecksByAchievements(ids, DECKS_PER_ACHIEVEMENT)
  const out = {}
  for (const [achievementId, decks] of grouped) {
    // 附带 deck_code：卡片点击后与推荐卡组一致，直接用代码打开详情弹窗/复制
    out[achievementId] = decks.map((deck) => ({ ...toListDeck(deck), deckCode: deck.deckCode }))
  }
  res.json(out)
}))

// 管理列表（所有者，含被隐藏卡组）
router.get('/admin/all', requireOwner, asyncRoute(async (req, res) => {
  const visibility = ALL_VISIBILITY.has(req.query.visibility) ? req.query.visibility : undefined
  const page = parsePage(req.query)
  const result = await listAllDecksAdmin({ visibility, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  res.json({ decks: result.decks.map(toListDeck), total: result.total, page, pageSize: PAGE_SIZE })
}))

// 管理员隐藏/恢复
router.patch('/:id/moderation', requireOwner, asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '参数错误' })
  const visibility = req.body?.visibility
  if (visibility !== 'hidden' && visibility !== 'public') {
    return res.status(400).json({ error: 'visibility 只能为 hidden 或 public' })
  }
  const deck = await updateDeckVisibilityByAdmin(id, visibility)
  if (!deck) return res.status(404).json({ error: '卡组不存在' })
  res.json({ deck: toListDeck(deck) })
}))

// 卡组详情：公开卡组所有人可看，私密/被隐藏的仅作者可见（不存在时不泄露区别，统一 404）
router.get('/:id', asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '参数错误' })
  const deck = await getDeckById(id)
  if (!deck) return res.status(404).json({ error: '卡组不存在或未公开' })
  const isMine = deck.userId === getUserIdFromReq(req)
  if (deck.visibility !== 'public' && !isMine) {
    return res.status(404).json({ error: '卡组不存在或未公开' })
  }
  res.json({ deck: toDetailDeck(deck) })
}))

// 修改名称/描述/可见性（仅作者）
router.patch('/:id', requireAuth, trackHearthstoneDecks, asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '参数错误' })
  const existing = await getDeckById(id)
  if (!existing || existing.userId !== req.userId) return res.status(404).json({ error: '卡组不存在' })

  const body = req.body || {}
  const patch = {}
  if (body.name !== undefined) {
    const name = clampText(body.name, NAME_MAX)
    if (!name) return res.status(400).json({ error: '卡组名称不能为空' })
    patch.name = name
  }
  if (body.description !== undefined) {
    patch.description = clampText(body.description, DESCRIPTION_MAX)
  }
  if (body.visibility !== undefined) {
    if (!OWNER_VISIBILITY.has(body.visibility)) {
      return res.status(400).json({ error: 'visibility 只能为 private 或 public' })
    }
    // 被管理员隐藏的卡组不允许作者自行改回公开，需管理员恢复
    if (existing.visibility === 'hidden') {
      return res.status(403).json({ error: '卡组已被管理员隐藏，暂不能修改可见性' })
    }
    patch.visibility = body.visibility
  }
  if (!Object.keys(patch).length) return res.status(400).json({ error: '没有需要修改的字段' })

  const deck = await updateDeckMeta(req.userId, id, patch)
  if (!deck) return res.status(404).json({ error: '卡组不存在' })
  res.json({ deck: toDetailDeck(deck) })
}))

// 删除卡组（仅作者）
router.delete('/:id', requireAuth, trackHearthstoneDecks, asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '参数错误' })
  const removed = await deleteDeck(req.userId, id)
  if (!removed) return res.status(404).json({ error: '卡组不存在' })
  res.json({ ok: true })
}))

export default router
