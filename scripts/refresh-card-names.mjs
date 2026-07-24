// 重建 dbfid-cardnames.json（卡牌 dbfId → 中文信息 / 英雄 dbfId → 职业）
//
// 根因：原缓存只用 collectible=true 的卡生成，导致卡组码里常见的衍生/变身
// token 卡（如半兽人迦罗娜的「莱恩国王」「弑君者」）被过滤掉，解码后显示成
// "#119815"。本脚本改为从【全量】卡牌库重建，并保留中文 职业/稀有度 映射，
// 同时把 token 卡也纳入，彻底解决"本地库未收录"。
//
// 数据源（优先级）：
//   1. 环境变量 HS_CARDS_FILE 指定的本地全量 JSON
//   2. 本地临时文件 .workbuddy/scratch/hs_cards_zhCN.json（首次离线可用）
//   3. 联网拉取 HearthstoneJSON 最新 zhCN 全量库（cards.json 含 token；
//      失败回退 cards.collectible.json，仅含可收藏卡）
//
// 用法：
//   node scripts/refresh-card-names.mjs
//   HS_CARDS_FILE=path/to/cards.json node scripts/refresh-card-names.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'src/hearthstone-achievements/data/dbfid-cardnames.json')

// 英文枚举 → 中文（与历史缓存风格一致）
const CLASS_CN = {
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
  NEUTRAL: '中立',
  DEATHKNIGHT: '死亡骑士',
  WHIZBANG: '中立',
  DREAM: '中立'
}
const RARITY_CN = {
  FREE: '基础',
  COMMON: '普通',
  RARE: '稀有',
  EPIC: '史诗',
  LEGENDARY: '传说'
}
// 卡组码里可能出现的卡类型（英雄单独进 heroClasses），其余（ENCHANT 等）排除以控体积
const DECKABLE = new Set(['MINION', 'SPELL', 'WEAPON', 'LOCATION', 'HERO'])

async function loadSource() {
  if (process.env.HS_CARDS_FILE && fs.existsSync(process.env.HS_CARDS_FILE)) {
    console.log('数据源：HS_CARDS_FILE', process.env.HS_CARDS_FILE)
    return JSON.parse(fs.readFileSync(process.env.HS_CARDS_FILE, 'utf8'))
  }
  const local = path.join(ROOT, '.workbuddy/scratch/hs_cards_zhCN.json')
  if (fs.existsSync(local)) {
    console.log('数据源：本地临时全量库', local)
    return JSON.parse(fs.readFileSync(local, 'utf8'))
  }
  const urls = [
    'https://api.hearthstonejson.com/v1/latest/zhCN/cards.json',
    'https://api.hearthstonejson.com/v1/latest/zhCN/cards.collectible.json'
  ]
  for (const url of urls) {
    try {
      console.log('联网拉取：', url)
      const res = await fetch(url)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return await res.json()
    } catch (e) {
      console.warn('  拉取失败：', e.message)
    }
  }
  throw new Error('无可用数据源（本地无全量库且联网失败）')
}

function build(arr) {
  const cards = {}
  const heroClasses = {}
  for (const c of arr) {
    const dbfId = c.dbfId
    if (dbfId == null || !c.name) continue
    const type = c.type
    if (!DECKABLE.has(type)) continue
    const cls = CLASS_CN[c.cardClass] ?? c.cardClass ?? ''
    const rar = RARITY_CN[c.rarity] ?? c.rarity ?? ''
    if (type === 'HERO') {
      heroClasses[String(dbfId)] = cls || '中立'
    }
    cards[String(dbfId)] = {
      name: c.name,
      cost: c.cost ?? 0,
      type,
      cardClass: cls,
      rarity: rar,
      id: c.id || ''
    }
  }
  return { cards, heroClasses }
}

async function main() {
  const arr = await loadSource()
  console.log('原始卡牌数：', arr.length)
  const { cards, heroClasses } = build(arr)
  const out = { cards, heroClasses }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log('已写入：', OUT)
  console.log('cards 条目：', Object.keys(cards).length, '| heroClasses 条目：', Object.keys(heroClasses).length)
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0)
  console.log('文件大小：', kb, 'KB')

  // 验证：用户提到的 token 卡现在能否解析
  const check = (id) => {
    const c = cards[String(id)]
    console.log(`  dbfId ${id} ->`, c ? c.name + ' / ' + c.cardClass : '仍缺失')
  }
  console.log('验证 token 卡：')
  check(119815)
  check(119816)
}

main().catch((e) => { console.error(e); process.exit(1) })
