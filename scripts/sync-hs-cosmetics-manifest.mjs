#!/usr/bin/env node
/** 根据客户端映射表生成字段一致的前端外观清单（幸运币、卡背各自独立文件；英雄皮肤已并入 hero-skins.json 单一真源）。 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const dataDirectory = join(repoRoot, 'src/features/hearthstone/data')
const coinsPath = join(dataDirectory, 'coins.json')
const cardBacksPath = join(dataDirectory, 'card-backs.json')
const coinMapPath = join(dataDirectory, 'cosmetic-coin-map.json')
const cardBackMapPath = join(dataDirectory, 'card-back-map.json')

function previousItemsById(items) {
  return new Map(items.map((item) => [item.id, item]))
}

async function readJsonSafe(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return []
  }
}

function sharedDetails(mapping, previous = {}) {
  return {
    flavorText: mapping.flavorText || '',
    howToGet: mapping.howToGet || '',
    availability: previous.availability || '',
    localImagePath: mapping.localImagePath,
    ossObjectKey: mapping.ossObjectKey,
    imageUrl: mapping.imageUrl,
    source: mapping.source || '',
    sourceUrl: previous.sourceUrl || ''
  }
}

const coinsMap = JSON.parse(await readFile(coinMapPath, 'utf8'))
const cardBacksMap = JSON.parse(await readFile(cardBackMapPath, 'utf8'))

const previousCoins = previousItemsById(await readJsonSafe(coinsPath))
const previousCardBacks = previousItemsById(await readJsonSafe(cardBacksPath))

const coins = coinsMap.map((mapping) => {
  const id = `coins-${mapping.cardId.toLocaleLowerCase()}`
  return {
    id,
    cardId: mapping.cardId,
    dbfId: mapping.dbfId,
    cosmeticCoinId: mapping.cosmeticCoinId,
    officialName: mapping.officialName,
    ...sharedDetails(mapping, previousCoins.get(id))
  }
})
const cardBacks = cardBacksMap.filter((mapping) => mapping.imageUrl).map((mapping) => {
  const id = `card-backs-${mapping.cardBackId}`
  return {
    id,
    cardBackId: mapping.cardBackId,
    officialName: mapping.officialName,
    prefabName: mapping.prefabName,
    prefabGuid: mapping.prefabGuid,
    textureName: mapping.textureName,
    ...sharedDetails(mapping, previousCardBacks.get(id))
  }
})

// 保留映射表里没有、但手动加入的条目，避免同步时被整体覆盖丢弃
function preserve(previous, fresh) {
  const freshIds = new Set(fresh.map((item) => item.id))
  const kept = [...previous.values()].filter((item) => !freshIds.has(item.id))
  return kept.length ? [...fresh, ...kept] : fresh
}

const finalCoins = preserve(previousCoins, coins)
const finalCardBacks = preserve(previousCardBacks, cardBacks)

await writeFile(coinsPath, `${JSON.stringify(finalCoins, null, 2)}\n`, 'utf8')
await writeFile(cardBacksPath, `${JSON.stringify(finalCardBacks, null, 2)}\n`, 'utf8')
console.log(`外观清单已同步：幸运币 ${finalCoins.length}、卡背 ${finalCardBacks.length}`)
