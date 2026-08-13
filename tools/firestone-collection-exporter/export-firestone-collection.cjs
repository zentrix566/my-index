#!/usr/bin/env node
'use strict'

const fs = require('fs')
const fsp = require('fs/promises')
const os = require('os')
const path = require('path')
const { ClassicLevel } = require('classic-level')

const sourceDirectory = process.env.FIRESTONE_LEVELDB_DIR || path.join(process.env.LOCALAPPDATA || '', 'Overwolf', 'BrowserCache', 'Local Storage', 'leveldb')
const desktop = path.join(process.env.USERPROFILE || os.homedir(), 'Desktop')
const outputPath = path.join(desktop, 'Firestone收藏导出.json')
const snapshotDirectory = path.join(os.tmpdir(), `firestone-collection-${process.pid}`)
const keys = new Set(['card-backs', 'coins', 'bgs-owned-hero-skin-dbf-ids'])

function decode(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value)
  const offset = buffer.length > 1 && buffer[0] === 0 && buffer[1] === 0x5b ? 1 : 0
  try { return JSON.parse(buffer.subarray(offset).toString('utf16le')) } catch { return null }
}

function ids(items, key, owned = () => true) {
  return Array.isArray(items) ? items.filter(owned).map((item) => item?.[key]).filter((id) => id !== undefined && id !== null) : []
}

async function main() {
  if (!fs.existsSync(sourceDirectory)) throw new Error('未找到 Firestone 缓存。请先安装并打开 Firestone。')
  await fsp.rm(snapshotDirectory, { recursive: true, force: true })
  await fsp.cp(sourceDirectory, snapshotDirectory, { recursive: true, force: true })
  const db = new ClassicLevel(snapshotDirectory, { valueEncoding: 'buffer', createIfMissing: false })
  const cached = {}
  try {
    for await (const [rawKey, value] of db.iterator()) {
      const name = Buffer.from(rawKey).toString('utf8')
      const cacheKey = [...keys].find((key) => name.endsWith(`\u0000\u0001${key}`))
      if (cacheKey) cached[cacheKey] = decode(value)
    }
  } finally {
    await db.close()
    await fsp.rm(snapshotDirectory, { recursive: true, force: true })
  }
  const cardBackIds = [...new Set(ids(cached['card-backs'], 'id', (item) => item?.owned !== false))].sort((a, b) => a - b)
  const coinDbfIds = [...new Set(ids(cached.coins, 'CoinId'))].sort((a, b) => a - b)
  const battlegroundsHeroSkinDbfIds = [...new Set(Array.isArray(cached['bgs-owned-hero-skin-dbf-ids']) ? cached['bgs-owned-hero-skin-dbf-ids'].filter(Number.isFinite) : [])].sort((a, b) => a - b)
  const payload = { generatedAt: new Date().toISOString(), source: 'Firestone local cache', cardBackIds, coinDbfIds, battlegroundsHeroSkinDbfIds, counts: { cardBacks: cardBackIds.length, coins: coinDbfIds.length, battlegroundsHeroSkins: battlegroundsHeroSkinDbfIds.length } }
  await fsp.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`导出完成：${outputPath}`)
  console.log(`卡背 ${cardBackIds.length}，幸运币 ${coinDbfIds.length}，战棋英雄皮肤 ${battlegroundsHeroSkinDbfIds.length}`)
}

main().catch((error) => {
  console.error(`导出失败：${error.message}`)
  process.exitCode = 1
})
