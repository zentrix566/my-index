// 炉石卡组代码（deckstring）线格式纯解析，零依赖，前端（atob）与服务端（Buffer）共用。
// 字节流结构（Blizzard deckstring 规范）：
//   [保留字节(1B, 固定 0)] [版本(1B, 固定 1)] [format(varint)] [heroCount(varint)]
//   [hero dbfId(varint)...] [x1Count(varint)] [card dbfId(varint)...]              // 各 1 张
//   [x2Count(varint)] [card dbfId(varint)...]             // 各 2 张
//   [xNCount(varint)] [(card dbfId, count)(varint 对)...] // 各 N 张
//   [可选: nameLen(varint)] [name(bytes)]                 // UTF-8 卡组名（此处忽略）
// dbfId 是卡牌在游戏数据库中的 ID，名称/费用/稀有度等由调用方结合 dbfid-cardnames.json 解析。

export const MAX_DECK_CODE_LENGTH = 4096
export const MAX_VARINT_BYTES = 8

// format 取值对应 Blizzard 规范：1 标准 / 2 狂野 / 3 经典
export const FORMAT_LABELS = { 1: '标准', 2: '狂野', 3: '经典' }

// 极端情况（JSON 未覆盖的双职业英雄等）兜底，取自在用推荐卡组代码实测推导
export const HERO_CLASS_FALLBACK = {
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

/** 校验卡组代码字符串形似 base64（不含解码），供解码前快速拒绝。 */
export function isPlausibleDeckCode(code) {
  if (typeof code !== 'string' || code.length === 0 || code.length > MAX_DECK_CODE_LENGTH) {
    return false
  }
  return /^[A-Za-z0-9+/_-]+={0,2}$/.test(code) && code.length % 4 !== 1
}

export function readVarint(bytes, i) {
  let result = 0
  let multiplier = 1
  for (let count = 0; count < MAX_VARINT_BYTES; count++) {
    if (i >= bytes.length) throw new Error('truncated varint')
    const byte = bytes[i++]
    result += (byte & 0x7f) * multiplier
    if (!Number.isSafeInteger(result)) throw new Error('varint overflow')
    if ((byte & 0x80) === 0) return { value: result, next: i }
    multiplier *= 128
  }
  throw new Error('varint too long')
}

/**
 * 解析卡组字节流为结构化数据（不含卡牌名称等富化信息）。
 * @param {Uint8Array} bytes
 * @returns {{ format:number, heroes:number[], cards:Array<{dbfId:number,count:number}>, total:number }}
 * @throws 结构非法时抛错，由调用方决定如何兜底
 */
export function parseDeckBytes(bytes) {
  if (bytes.length < 3 || bytes[0] !== 0 || bytes[1] !== 1) {
    throw new Error('bad header')
  }
  let i = 2 // 跳过保留字节(0)与版本字节(1)
  const fmt = readVarint(bytes, i); i = fmt.next
  if (fmt.value < 1 || fmt.value > 3) throw new Error('bad format')
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

  const cards = [
    ...singles.map((dbfId) => ({ dbfId, count: 1 })),
    ...doubles.map((dbfId) => ({ dbfId, count: 2 })),
    ...multis
  ]
  const total = cards.reduce((a, c) => a + c.count, 0)
  if (total < 1 || total > 40) throw new Error('bad total')
  return { format: fmt.value, heroes, cards, total }
}
