// 炉石传说卡组代码（deckstring）解码工具
// 线格式解析在 ./deckstringCore.js（前后端共用），本文件负责浏览器侧 base64 解码
// 与卡牌信息富化（中文名/费用/稀有度/本地图片路径），数据来自内置 dbfid-cardnames.json
// （HearthstoneJSON 的 zhCN 卡牌库），无需联网。

import cardNameData from '../data/dbfid-cardnames.json' with { type: 'json' }
import { getLocalCardImages, normalizeRarity } from './cardImages.js'
import {
  isPlausibleDeckCode,
  parseDeckBytes,
  HERO_CLASS_FALLBACK,
  FORMAT_LABELS
} from './deckstringCore.js'

const { cards: cardNames, heroClasses } = cardNameData

/**
 * 从 dbfId 查找卡组展示需要的最小卡牌信息。
 * @param {number} dbfId
 * @returns {{ name:string, cost:number, rarity:string }}
 */
function getCardInfo(dbfId) {
  return (cardNames && cardNames[dbfId]) || { name: `#${dbfId}`, cost: 0, rarity: '' }
}

/**
 * 为卡牌补充本地图片路径与标准化稀有度
 * @param {{name:string, id:string, rarity:string}} card
 * @returns {{cropImage?:string, fullImage?:string, rarityKey:string}}
 */
function enrichCardImages(card) {
  const local = getLocalCardImages(card.name)
  // 始终返回本站相对路径（经反代到 OSS、带本站域名、强制 inline），不拼 OSS 直链
  return {
    cropImage: local?.crop || '',
    fullImage: local?.full || '',
    rarityKey: normalizeRarity(card.rarity)
  }
}

function base64ToBytes(b64) {
  if (!isPlausibleDeckCode(b64)) throw new Error('bad deck code')
  let norm = b64.replace(/-/g, '+').replace(/_/g, '/')
  norm += '='.repeat((4 - (norm.length % 4)) % 4)
  const bin = atob(norm)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/**
 * 解码卡组代码为结构化数据（含中文牌名、费用、类型、稀有度、本地图片路径等）
 * @returns {{ valid:boolean, format:number, heroClass:string, heroes:number[], cards:Array<{dbfId:number,count:number,name:string,cost:number,rarity:string,rarityKey:string,cropImage:string,fullImage:string}>, total:number }}
 */
export function decodeDeck(code) {
  try {
    const parsed = parseDeckBytes(base64ToBytes(code))
    const resolve = (dbfId, count) => {
      const base = getCardInfo(dbfId)
      return { ...base, ...enrichCardImages(base), dbfId, count }
    }
    const cards = parsed.cards.map((c) => resolve(c.dbfId, c.count))
    const heroClassList = parsed.heroes.map((h) => heroClasses[h] || HERO_CLASS_FALLBACK[h]).filter(Boolean)
    const heroClass = heroClassList[0] || '未知'
    return { valid: true, format: parsed.format, heroClass, heroes: parsed.heroes, cards, total: parsed.total }
  } catch {
    return { valid: false, format: 0, heroClass: '未知', heroes: [], cards: [], total: 0 }
  }
}

/**
 * 富化服务端快照卡牌（cards_json：dbfId/count/name/cost/rarity），
 * 补齐本地图片路径与标准化稀有度，供 DeckDetailModal 快照渲染使用。
 * @param {Array<{dbfId:number,count:number,name:string,cost:number,rarity:string}>} snapshotCards
 */
export function enrichSnapshotCards(snapshotCards) {
  if (!Array.isArray(snapshotCards)) return []
  return snapshotCards.map((card) => ({ ...card, ...enrichCardImages(card) }))
}

export { HERO_CLASS_FALLBACK, FORMAT_LABELS }
