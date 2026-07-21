// 炉石传说卡组码（deckstring）解码工具
// 卡组码是 base64 编码的字节流，标准结构（Blizzard deckstring 规范）：
//   [保留字节(1B, 固定 0)] [版本(1B, 固定 1)] [format(varint)] [heroCount(varint)]
//   [hero dbfId(varint)...] [x1Count(varint)] [card dbfId(varint)...]              // 各 1 张
//   [x2Count(varint)] [card dbfId(varint)...]             // 各 2 张
//   [xNCount(varint)] [(card dbfId, count)(varint 对)...] // 各 N 张
//   [可选: nameLen(varint)] [name(bytes)]                 // UTF-8 卡组名
// 因此读取 varint 时需从索引 2 开始（跳过保留字节与版本字节）。
// dbfId 是卡牌在游戏数据库中的 ID；本应用内置 dbfid-cardnames.json（数据来自 HearthstoneJSON 的 zhCN 卡牌库）
// 将 dbfId 解析为中文牌名与英雄职业，无需联网。

import cardNameData from '../data/dbfid-cardnames.json' with { type: 'json' }
const { cards: cardNames, heroClasses } = cardNameData

// 极端情况（JSON 未覆盖的双职业英雄等）兜底，取自在用推荐卡组码实测推导
const HERO_CLASS_FALLBACK = {
  71723: '法师',
  82519: '法师',
  83406: '德鲁伊',
  83410: '恶魔猎手',
  83411: '萨满祭司',
  84146: '中立',
  84156: '战士',
  89937: '牧师',
  89938: '圣骑士',
  89941: '潜行者',
  89942: '猎人',
  108417: '法师',
  110718: '死亡骑士',
  114324: '术士',
  119030: '潜行者'
}

function base64ToBytes(b64) {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(norm)
  const bytes = new Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function readVarint(bytes, i) {
  let result = 0
  let shift = 0
  let byte
  do {
    byte = bytes[i++]
    result += (byte & 0x7f) << shift
    shift += 7
  } while (byte & 0x80)
  return { value: result, next: i }
}

/**
 * 从 dbfId 查找卡牌信息（中文名/费用/类型/职业/稀有度/图片ID）
 * @param {number} dbfId
 * @returns {{ name:string, cost:number, type:string, cardClass:string, rarity:string, id:string }}
 */
function getCardInfo(dbfId) {
  return (cardNames && cardNames[dbfId]) || { name: `#${dbfId}`, cost: 0, type: '', cardClass: '', rarity: '', id: '' }
}

/**
 * 解码卡组码为结构化数据（含中文牌名、费用、类型等）
 * @returns {{ valid:boolean, heroClass:string, heroes:number[], cards:Array<{dbfId:number,count:number,name:string,cost:number,type:string,cardClass:string,rarity:string,id:string}>, total:number }}
 */
export function decodeDeck(code) {
  try {
    const bytes = base64ToBytes(code)
    let i = 2 // 跳过保留字节(0)与版本字节(1)
    const fmt = readVarint(bytes, i); i = fmt.next
    if (i > bytes.length || fmt.value > 3) throw new Error('bad format')
    const nh = readVarint(bytes, i); i = nh.next
    if (i > bytes.length || nh.value < 1 || nh.value > 3) throw new Error('bad hero count')
    const heroes = []
    for (let h = 0; h < nh.value; h++) { const r = readVarint(bytes, i); i = r.next; heroes.push(r.value) }
    const nx = readVarint(bytes, i); i = nx.next
    if (i > bytes.length || nx.value > 40) throw new Error('bad single count')
    const singles = []
    for (let k = 0; k < nx.value; k++) { const r = readVarint(bytes, i); i = r.next; singles.push(r.value) }
    const n2 = readVarint(bytes, i); i = n2.next
    if (i > bytes.length || n2.value > 40) throw new Error('bad double count')
    const doubles = []
    for (let k = 0; k < n2.value; k++) { const r = readVarint(bytes, i); i = r.next; doubles.push(r.value) }
    const nn = readVarint(bytes, i); i = nn.next
    if (i > bytes.length || nn.value > 40) throw new Error('bad multi count')
    const multis = []
    for (let k = 0; k < nn.value; k++) {
      const d = readVarint(bytes, i); i = d.next
      const c = readVarint(bytes, i); i = c.next
      multis.push({ dbfId: d.value, count: c.value })
    }

    const resolve = (dbfId, count) => ({ ...getCardInfo(dbfId), dbfId, count })

    const cards = [
      ...singles.map((dbfId) => resolve(dbfId, 1)),
      ...doubles.map((dbfId) => resolve(dbfId, 2)),
      ...multis.map((m) => resolve(m.dbfId, m.count))
    ]
    const total = cards.reduce((a, c) => a + c.count, 0)
    if (total < 1 || total > 40) throw new Error('bad total')
    const heroClassList = heroes.map((h) => heroClasses[h] || HERO_CLASS_FALLBACK[h]).filter(Boolean)
    const heroClass = heroClassList[0] || '未知'
    return { valid: true, heroClass, heroes, cards, total }
  } catch {
    return { valid: false, heroClass: '未知', heroes: [], cards: [], total: 0 }
  }
}
