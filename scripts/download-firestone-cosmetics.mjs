#!/usr/bin/env node
/**
 * 从 Firestone / HearthstoneJSON 下载本地调试用外观资源；不修改项目清单，也不上传 OSS。
 * 输出结构：<source>/coins、<source>/card-backs、<source>/hero-skins/<hero-class>。
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const sourceRoot = resolve(process.argv[2] || 'E:/github/my-heartstone')
const cardDataUrl = 'https://api.hearthstonejson.com/v1/latest/zhCN/cards.json'
const artBaseUrl = 'https://art.hearthstonejson.com/v1/render/latest/zhCN/512x'
const firestoneCardBackDataUrl = 'https://static.zerotoheroes.com/hearthstone/data/card-backs.json'
const firestoneCardBackImageUrl = (id) => `https://static.firestoneapp.com/cardbacks/512/${id}.png`
const localCardBackMapPath = new URL('../src/features/hearthstone/data/card-back-map.json', import.meta.url)
const localHeroSkinMapPath = new URL('../public/hearthstone/hero-skins.json', import.meta.url)
const localCoinMapPath = new URL('../src/features/hearthstone/data/cosmetic-coin-map.json', import.meta.url)

const heroFolders = {
  DEATHKNIGHT: 'death-knight', DEMONHUNTER: 'demon-hunter', DRUID: 'druid', HUNTER: 'hunter',
  MAGE: 'mage', PALADIN: 'paladin', PRIEST: 'priest', ROGUE: 'rogue', SHAMAN: 'shaman',
  WARLOCK: 'warlock', WARRIOR: 'warrior'
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.json()
}

async function saveImage(url, path) {
  if (existsSync(path)) return false
  const response = await fetch(url)
  if (response.status === 404 || response.status === 403) return null
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  if (!(response.headers.get('content-type') || '').startsWith('image/')) throw new Error(`${url}: response is not an image`)
  await writeFile(path, Buffer.from(await response.arrayBuffer()))
  return true
}

async function pool(items, worker, concurrency = 10) {
  let cursor = 0
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) await worker(items[cursor++])
  }))
}

async function readMapping(path, key) {
  const entries = JSON.parse(await readFile(path, 'utf8'))
  return new Map(entries.map((item) => [String(item[key]), item]))
}

function localizedMetadata(item, fallback, imageUrl) {
  return {
    ...fallback,
    name: item?.officialName || fallback.name,
    flavorText: item?.flavorText || fallback.flavorText || '',
    howToGet: item?.howToGet || '',
    source: item ? 'Hearthstone 简体中文客户端资料 + Firestone/HearthstoneJSON 图片' : fallback.source,
    imageUrl
  }
}

async function main() {
  const [cards, cardBacks, localCardBacks, localHeroes, localCoins] = await Promise.all([
    fetchJson(cardDataUrl), fetchJson(firestoneCardBackDataUrl),
    readMapping(localCardBackMapPath, 'cardBackId'), readMapping(localHeroSkinMapPath, 'cardId'), readMapping(localCoinMapPath, 'cardId')
  ])
  const heroes = cards.filter((card) => card.set === 'HERO_SKINS' && card.type === 'HERO' && heroFolders[card.cardClass])
  const coins = cards.filter((card) => card.type === 'SPELL' && card.cost === 0 && card.name === '幸运币' && /COIN/i.test(card.id || ''))
  const targets = [
    ...heroes.map((card) => ({
      kind: 'hero', id: card.id, directory: join(sourceRoot, 'hero-skins', heroFolders[card.cardClass]),
      url: `${artBaseUrl}/${encodeURIComponent(card.id)}.png`, metadata: localizedMetadata(localHeroes.get(card.id), { name: card.name, cardId: card.id, dbfId: card.dbfId, heroClass: card.cardClass, source: 'HearthstoneJSON 512x' }, `${artBaseUrl}/${encodeURIComponent(card.id)}.png`)
    })),
    ...coins.map((card) => ({
      kind: 'coin', id: card.id, directory: join(sourceRoot, 'coins'),
      url: `${artBaseUrl}/${encodeURIComponent(card.id)}.png`, metadata: localizedMetadata(localCoins.get(card.id), { name: card.name, cardId: card.id, dbfId: card.dbfId, source: 'HearthstoneJSON 512x' }, `${artBaseUrl}/${encodeURIComponent(card.id)}.png`)
    })),
    ...cardBacks.map((cardBack) => ({
      kind: 'cardBack', id: String(cardBack.id), directory: join(sourceRoot, 'card-backs'),
      url: firestoneCardBackImageUrl(cardBack.id), metadata: localizedMetadata(localCardBacks.get(String(cardBack.id)), { name: cardBack.name, cardBackId: cardBack.id, flavorText: cardBack.text || '', source: 'Firestone 512x' }, firestoneCardBackImageUrl(cardBack.id))
    }))
  ]

  const totals = { hero: 0, coin: 0, cardBack: 0 }
  const downloaded = { hero: 0, coin: 0, cardBack: 0 }
  const missing = { hero: [], coin: [], cardBack: [] }
  await pool(targets, async (target) => {
    totals[target.kind] += 1
    await mkdir(target.directory, { recursive: true })
    const imagePath = join(target.directory, `${target.id}.png`)
    const result = await saveImage(target.url, imagePath)
    if (result === null) {
      missing[target.kind].push(target.id)
      return
    }
    if (result) downloaded[target.kind] += 1
    await writeFile(join(target.directory, `${target.id}.json`), `${JSON.stringify(target.metadata, null, 2)}\n`, 'utf8')
  })
  console.log(JSON.stringify({ sourceRoot, totals, downloaded, missing }, null, 2))
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
