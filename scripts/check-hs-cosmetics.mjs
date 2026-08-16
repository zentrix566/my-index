#!/usr/bin/env node
/** 检查炉石外观映射、清单、元数据和本地图片的一致性。 */
import { existsSync, readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const dataDirectory = join(repoRoot, 'src/features/hearthstone/data')
const publicCatalogDir = join(repoRoot, 'public/hearthstone')
const reportPath = join(dataDirectory, 'cosmetics-audit.json')

function loadEnv() {
  const envPath = join(repoRoot, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}

function decodedImagePath(sourceRoot, imageUrl) {
  const prefix = '/hearthstone-cosmetics/'
  if (!imageUrl?.startsWith(prefix)) return ''
  return join(sourceRoot, ...imageUrl.slice(prefix.length).split('/').map(decodeURIComponent))
}

function summarize(items, sourceRoot) {
  return {
    total: items.length,
    withOssObjectKey: items.filter((item) => Boolean(item.ossObjectKey)).length,
    withImageUrl: items.filter((item) => Boolean(item.imageUrl)).length,
    localImageExists: items.filter((item) => {
      const path = decodedImagePath(sourceRoot, item.imageUrl)
      return path && existsSync(path)
    }).length,
    withFlavorText: items.filter((item) => Boolean(item.flavorText)).length,
    withHowToGet: items.filter((item) => Boolean(item.howToGet)).length
  }
}

loadEnv()
const sourceRoot = resolve(process.env.HS_COSMETICS_SOURCE_DIR || 'E:/github/my-heartstone/hearthstone_cosmetics')
const heroSkins = JSON.parse(await readFile(join(publicCatalogDir, 'hero-skins.json'), 'utf8'))
const coins = JSON.parse(await readFile(join(dataDirectory, 'cosmetic-coin-map.json'), 'utf8'))
const cardBacks = JSON.parse(await readFile(join(dataDirectory, 'card-back-map.json'), 'utf8'))
const manifestHeroSkins = JSON.parse(await readFile(join(publicCatalogDir, 'hero-skins.json'), 'utf8'))
const manifestCoins = JSON.parse(await readFile(join(publicCatalogDir, 'coins.json'), 'utf8'))
const manifestCardBacks = JSON.parse(await readFile(join(publicCatalogDir, 'card-backs.json'), 'utf8'))
const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot,
  mappings: {
    heroSkins: summarize(heroSkins, sourceRoot),
    coins: summarize(coins, sourceRoot),
    cardBacks: summarize(cardBacks, sourceRoot)
  },
  manifest: {
    heroSkins: manifestHeroSkins.length,
    coins: manifestCoins.length,
    cardBacks: manifestCardBacks.length,
    missingLocalImages: [...manifestHeroSkins, ...manifestCoins, ...manifestCardBacks].filter((item) => {
      const path = decodedImagePath(sourceRoot, item.imageUrl)
      return !path || !existsSync(path)
    }).map((item) => item.id)
  },
  missingHeroFlavorText: heroSkins.filter((item) => !item.flavorText).map((item) => item.cardId),
  missingHeroHowToGet: heroSkins.filter((item) => !item.howToGet).map((item) => item.cardId),
  cardBacksWithoutImages: cardBacks.filter((item) => !item.ossObjectKey).map((item) => ({
    cardBackId: item.cardBackId,
    officialName: item.officialName,
    prefabName: item.prefabName
  }))
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report.mappings, null, 2))
console.log(`前端清单缺少本地图片：${report.manifest.missingLocalImages.length}`)
console.log(`检查报告：${reportPath}`)
if (report.manifest.missingLocalImages.length) process.exitCode = 1
