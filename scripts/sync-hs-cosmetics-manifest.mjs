#!/usr/bin/env node
/** 根据三份客户端映射表生成字段一致的前端外观清单。 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const dataDirectory = join(repoRoot, 'src/features/hearthstone/data')
const manifestPath = join(dataDirectory, 'cosmetics.json')

function previousItemsById(items) {
  return new Map(items.map((item) => [item.id, item]))
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

const previous = JSON.parse(await readFile(manifestPath, 'utf8'))
const heroSkins = JSON.parse(await readFile(join(dataDirectory, 'hero-skin-map.json'), 'utf8'))
const coins = JSON.parse(await readFile(join(dataDirectory, 'cosmetic-coin-map.json'), 'utf8'))
const cardBacks = JSON.parse(await readFile(join(dataDirectory, 'card-back-map.json'), 'utf8'))
const previousHeroSkins = previousItemsById(previous.heroSkins)
const previousCoins = previousItemsById(previous.coins)
const previousCardBacks = previousItemsById(previous.cardBacks)

const manifest = {
  heroSkins: heroSkins.map((mapping) => {
    const id = `hero-skins-${mapping.cardId.toLocaleLowerCase()}`
    return {
      id,
      cardId: mapping.cardId,
      dbfId: mapping.dbfId,
      cosmeticHeroId: mapping.cosmeticHeroId,
      heroClass: mapping.heroClass,
      officialName: mapping.officialName,
      ...sharedDetails(mapping, previousHeroSkins.get(id))
    }
  }),
  coins: coins.map((mapping) => {
    const id = `coins-${mapping.cardId.toLocaleLowerCase()}`
    return {
      id,
      cardId: mapping.cardId,
      dbfId: mapping.dbfId,
      cosmeticCoinId: mapping.cosmeticCoinId,
      officialName: mapping.officialName,
      ...sharedDetails(mapping, previousCoins.get(id))
    }
  }),
  cardBacks: cardBacks.filter((mapping) => mapping.imageUrl).map((mapping) => {
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
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`外观清单已同步：英雄皮肤 ${manifest.heroSkins.length}、幸运币 ${manifest.coins.length}、卡背 ${manifest.cardBacks.length}`)
