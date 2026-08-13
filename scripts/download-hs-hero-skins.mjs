#!/usr/bin/env node
/** 下载 HearthstoneJSON 的中文对战英雄皮肤与本地收藏元数据。 */
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const manifestPath = join(repoRoot, 'src/features/hearthstone/data/hero-skins.json')
const sourceUrl = 'https://api.hearthstonejson.com/v1/latest/zhCN/cards.json'
const imageBaseUrl = 'https://art.hearthstonejson.com/v1/render/latest/zhCN/512x'
const acquisitionPattern = /(?:购买|获得|解锁|拥有|完成|参与|达到|预购|奖励|商店|活动|通行证)/
const classNames = {
  DEATHKNIGHT: '死亡骑士', DEMONHUNTER: '恶魔猎手', DRUID: '德鲁伊', HUNTER: '猎人',
  MAGE: '法师', PALADIN: '圣骑士', PRIEST: '牧师', ROGUE: '潜行者', SHAMAN: '萨满祭司',
  WARLOCK: '术士', WARRIOR: '战士'
}
const classFolders = {
  死亡骑士: 'death-knight', 恶魔猎手: 'demon-hunter', 德鲁伊: 'druid', 猎人: 'hunter',
  法师: 'mage', 圣骑士: 'paladin', 牧师: 'priest', 潜行者: 'rogue', 萨满祭司: 'shaman',
  术士: 'warlock', 战士: 'warrior'
}

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

function parseArgs(argv) {
  const args = { force: false, source: '' }
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--force') args.force = true
    else if (argv[index] === '--source') args.source = resolve(argv[++index])
    else throw new Error(`未知参数：${argv[index]}`)
  }
  return args
}

function stripMarkup(value = '') {
  return value.replace(/<i>(.*?)<\/i>/g, '《$1》').replace(/<[^>]+>/g, '').trim()
}

export function isConstructedHeroSkin(card) {
  return card?.set === 'HERO_SKINS' && card.type === 'HERO' && Boolean(classNames[card.cardClass])
}

export function splitHeroFlavor(value = '') {
  const parts = value.split(/\r?\n/).map(stripMarkup).filter(Boolean)
  if (parts.length === 1 && acquisitionPattern.test(parts[0])) {
    return { flavorText: '', howToGet: parts[0] }
  }
  return { flavorText: parts[0] || '', howToGet: parts.slice(1).join(' ') || '' }
}

async function downloadImage(cardId, outputPath, force) {
  if (!force && existsSync(outputPath)) return { available: true, downloaded: false }
  const url = `${imageBaseUrl}/${encodeURIComponent(cardId)}.png`
  const response = await fetch(url)
  if (response.status === 404) return { available: false, downloaded: false }
  if (!response.ok) throw new Error(`${cardId}：HTTP ${response.status}`)
  if (!(response.headers.get('content-type') || '').startsWith('image/')) throw new Error(`${cardId}：响应不是图片`)
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()))
  return { available: true, downloaded: true }
}

async function runPool(items, concurrency, worker) {
  let cursor = 0
  const runners = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      await worker(items[index], index)
    }
  })
  await Promise.all(runners)
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv)
  const sourceRoot = resolve(args.source || process.env.HS_COSMETICS_SOURCE_DIR || 'E:/github/my-heartstone/hearthstone_cosmetics')
  const heroRoot = join(sourceRoot, 'hero-skins')
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`中文英雄皮肤资料请求失败：HTTP ${response.status}`)
  const cards = (await response.json()).filter(isConstructedHeroSkin).sort((a, b) => a.dbfId - b.dbfId)
  const results = new Array(cards.length)
  const missingImages = []
  let downloaded = 0

  await runPool(cards, 8, async (card, index) => {
    const heroClass = classNames[card.cardClass]
    const heroFolder = classFolders[heroClass]
    const directory = join(heroRoot, heroFolder)
    await mkdir(directory, { recursive: true })
    const details = splitHeroFlavor(card.flavor)
    const metadata = {
      name: card.name, hero: heroClass, cardId: card.id, dbfId: card.dbfId,
      flavorText: details.flavorText, howToGet: details.howToGet, availability: '',
      sourceUrl: `https://hearthstone.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(card.id)}`
    }
    const imageResult = await downloadImage(card.id, join(directory, `${card.id}.png`), args.force)
    if (!imageResult.available) {
      missingImages.push(card.id)
      results[index] = null
      return
    }
    if (imageResult.downloaded) downloaded += 1
    await writeFile(join(directory, `${card.id}.json`), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
    results[index] = {
      id: `hero-skins-${card.id.toLocaleLowerCase()}`,
      cardId: card.id,
      dbfId: card.dbfId,
      cosmeticHeroId: null,
      heroClass,
      officialName: card.name,
      flavorText: metadata.flavorText, howToGet: metadata.howToGet,
      availability: metadata.availability,
      localImagePath: `hero-skins/${heroFolder}/${card.id}.png`,
      ossObjectKey: `hearthstone-cosmetics/hero-skins/${heroFolder}/${card.id}.png`,
      imageUrl: `/hearthstone-cosmetics/hero-skins/${heroFolder}/${card.id}.png`,
      source: 'HearthstoneJSON',
      sourceUrl: metadata.sourceUrl
    }
    if ((index + 1) % 25 === 0 || index + 1 === cards.length) console.log(`英雄皮肤进度：${index + 1}/${cards.length}`)
  })

  const newHeroSkins = results.filter(Boolean)
  let finalHeroSkins = newHeroSkins
  try {
    const previous = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (Array.isArray(previous)) {
      const newCardIds = new Set(newHeroSkins.map((item) => item.cardId))
      const preserved = previous.filter((item) => !newCardIds.has(item.cardId))
      if (preserved.length) {
        finalHeroSkins = [...newHeroSkins, ...preserved]
        console.log(`保留上游未收录的手动皮肤：${preserved.map((item) => item.officialName).join('、')}`)
      }
    }
  } catch {}
  await writeFile(manifestPath, `${JSON.stringify(finalHeroSkins, null, 2)}\n`, 'utf8')
  console.log(`英雄皮肤下载完成：可用 ${finalHeroSkins.length}，缺图 ${missingImages.length}，本次新增或覆盖 ${downloaded}`)
  if (missingImages.length) console.log(`上游缺图：${missingImages.join(', ')}`)
  console.log(`本地目录：${heroRoot}`)
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
