#!/usr/bin/env node
/**
 * 只读导出 Firestone 的本地收藏缓存。不会修改 Firestone、游戏或网站数据。
 * 使用：node scripts/export-firestone-collection.mjs [输出文件]
 */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { ClassicLevel } from 'classic-level'

const repoRoot = resolve(new URL('..', import.meta.url).pathname.slice(1))
const sourceDirectory = process.env.FIRESTONE_LEVELDB_DIR ||
  'C:/Users/admin/AppData/Local/Overwolf/BrowserCache/Local Storage/leveldb'
const defaultOutputDirectory = process.env.USERPROFILE ? join(process.env.USERPROFILE, 'Desktop') : join(repoRoot, '.hs-extract')
const outputPath = resolve(process.argv[2] || join(defaultOutputDirectory, 'Firestone收藏导出.json'))
const snapshotDirectory = process.env.FIRESTONE_EXPORT_TEMP_DIR || join(repoRoot, '.hs-extract/firestone-leveldb-snapshot')
const keys = new Set(['card-backs', 'coins', 'bgs-owned-hero-skin-dbf-ids'])

function decode(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value)
  const offset = buffer.length > 1 && buffer[0] === 0 && buffer[1] === 0x5b ? 1 : 0
  const text = buffer.subarray(offset).toString('utf16le')
  try { return JSON.parse(text) } catch { return null }
}

function ids(items, key, owned = () => true) {
  return Array.isArray(items)
    ? items.filter(owned).map((item) => item?.[key]).filter((value) => value !== undefined && value !== null)
    : []
}

async function main() {
  if (!existsSync(sourceDirectory)) throw new Error(`未找到 Firestone 缓存目录：${sourceDirectory}`)
  await rm(snapshotDirectory, { recursive: true, force: true })
  await mkdir(dirname(snapshotDirectory), { recursive: true })
  // Firestone 可能正在运行；复制快照后再读取，避免触碰其正在使用的数据库文件。
  await cp(sourceDirectory, snapshotDirectory, { recursive: true, force: true })
  const db = new ClassicLevel(snapshotDirectory, { valueEncoding: 'buffer', createIfMissing: false })
  const cached = {}
  try {
    for await (const [rawKey, value] of db.iterator()) {
      const name = Buffer.isBuffer(rawKey) ? rawKey.toString('utf8') : String(rawKey)
      const cacheKey = [...keys].find((candidate) => name.endsWith(`\u0000\u0001${candidate}`))
      if (cacheKey) cached[cacheKey] = decode(value)
    }
  } finally {
    await db.close()
  }

  const cardBacks = ids(cached['card-backs'], 'id', (item) => item?.owned !== false)
  const coins = ids(cached.coins, 'CoinId')
  const battlegroundsHeroSkinDbfIds = Array.isArray(cached['bgs-owned-hero-skin-dbf-ids'])
    ? cached['bgs-owned-hero-skin-dbf-ids'].filter(Number.isFinite)
    : []
  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'Firestone Overwolf Local Storage snapshot',
    note: '仅导出缓存。cardBackIds 与 coinDbfIds 可直接映射；heroSkinDbfIds 是战棋英雄皮肤，不等同于构筑英雄皮肤。',
    cardBackIds: [...new Set(cardBacks)].sort((a, b) => Number(a) - Number(b)),
    coinDbfIds: [...new Set(coins)].sort((a, b) => Number(a) - Number(b)),
    battlegroundsHeroSkinDbfIds: [...new Set(battlegroundsHeroSkinDbfIds)].sort((a, b) => a - b),
    counts: { cardBacks: new Set(cardBacks).size, coins: new Set(coins).size, battlegroundsHeroSkins: new Set(battlegroundsHeroSkinDbfIds).size },
    cacheKeysFound: Object.keys(cached)
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`已导出：${outputPath}`)
  console.log(JSON.stringify(payload.counts))
}

main().catch((error) => {
  console.error(`导出失败：${error.message}`)
  process.exit(1)
})
