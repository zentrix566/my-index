#!/usr/bin/env node
/**
 * 从 HearthstoneJSON 全量卡牌库刷新卡组解析使用的唯一 dbfId 索引。
 *
 * 默认直接读取 latest/zhCN/cards.json，包含可收藏卡、衍生卡、英雄和历史卡牌。
 * 使用 --source 可以从已下载的 cards.json 离线重建，避免依赖过期的隐式缓存。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(scriptPath), '..')
const defaultOut = path.join(
  repoRoot,
  'src/features/hearthstone/data/dbfid-cardnames.json'
)

const classNames = {
  DEMONHUNTER: '恶魔猎手',
  DRUID: '德鲁伊',
  SHAMAN: '萨满祭司',
  HUNTER: '猎人',
  MAGE: '法师',
  PALADIN: '圣骑士',
  PRIEST: '牧师',
  ROGUE: '潜行者',
  WARLOCK: '术士',
  WARRIOR: '战士',
  DEATHKNIGHT: '死亡骑士',
  NEUTRAL: '中立',
  WHIZBANG: '中立',
  DREAM: '中立'
}

const rarityNames = {
  FREE: '基础',
  COMMON: '普通',
  RARE: '稀有',
  EPIC: '史诗',
  LEGENDARY: '传说'
}

const deckCardTypes = new Set(['MINION', 'SPELL', 'WEAPON', 'LOCATION', 'HERO'])

function parseArgs(argv) {
  const args = {
    version: 'latest',
    locale: 'zhCN',
    out: defaultOut,
    source: ''
  }
  for (let i = 2; i < argv.length; i++) {
    const argument = argv[i]
    if (argument === '--version') args.version = argv[++i]
    else if (argument === '--locale') args.locale = argv[++i]
    else if (argument === '--out') args.out = path.resolve(argv[++i])
    else if (argument === '--source') args.source = path.resolve(argv[++i])
    else throw new Error(`未知参数：${argument}`)
  }
  return args
}

/** 将 HearthstoneJSON 全量数组转换为卡组解析所需的 dbfId 索引。 */
export function buildDbfIdIndex(sourceCards) {
  const cards = {}
  const heroClasses = {}

  for (const card of sourceCards) {
    if (card.dbfId == null || !card.name || !deckCardTypes.has(card.type)) continue

    const dbfId = String(card.dbfId)
    const cardClass = classNames[card.cardClass] ?? card.cardClass ?? ''
    const rarity = rarityNames[card.rarity] ?? card.rarity ?? ''
    cards[dbfId] = {
      name: card.name,
      cost: card.cost ?? 0,
      rarity
    }

    if (card.type === 'HERO') {
      heroClasses[dbfId] = cardClass || '中立'
    }
  }

  return { cards, heroClasses }
}

async function loadCards(args) {
  if (args.source) {
    console.log(`读取本地全量卡牌库：${args.source}`)
    return JSON.parse(fs.readFileSync(args.source, 'utf8'))
  }

  const url =
    `https://api.hearthstonejson.com/v1/${args.version}/${args.locale}/cards.json`
  console.log(`下载全量卡牌库：${url}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HearthstoneJSON 请求失败：HTTP ${response.status}`)
  return response.json()
}

async function main() {
  const args = parseArgs(process.argv)
  const sourceCards = await loadCards(args)
  if (!Array.isArray(sourceCards)) throw new Error('HearthstoneJSON 响应不是数组')

  const index = buildDbfIdIndex(sourceCards)
  fs.mkdirSync(path.dirname(args.out), { recursive: true })
  fs.writeFileSync(args.out, JSON.stringify(index) + '\n')

  const sizeMiB = (fs.statSync(args.out).size / 1024 / 1024).toFixed(2)
  console.log(
    `刷新完成：上游=${sourceCards.length}，卡牌索引=${Object.keys(index.cards).length}，` +
      `英雄索引=${Object.keys(index.heroClasses).length}，文件=${sizeMiB} MiB`
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
