#!/usr/bin/env node
/** 下载 HearthstoneJSON 的中文幸运币渲染图与本地收藏元数据。 */
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const manifestPath = join(repoRoot, 'public/hearthstone/coins.json')
const coinMappingPath = join(repoRoot, 'src/features/hearthstone/data/cosmetic-coin-map.json')
const sourceUrl = 'https://api.hearthstonejson.com/v1/latest/zhCN/cards.json'
const imageBaseUrl = 'https://art.hearthstonejson.com/v1/render/latest/zhCN/512x'

const setNames = {
  TGT: '冠军的试炼', ALTERAC_VALLEY: '奥特兰克的决裂', THE_BARRENS: '贫瘠之地的锤炼',
  SCHOLOMANCE: '通灵学园', BLACK_TEMPLE: '外域的灰烬', CATACLYSM: '大地的裂变',
  DALARAN: '暗影崛起', DRAGONS: '巨龙降临', EMERALD_DREAM: '漫游翡翠梦境',
  BATTLE_OF_THE_BANDS: '传奇音乐节', NAXX: '纳克萨玛斯的诅咒', SPACE: '深暗领域',
  GVG: '地精大战侏儒', ESCAPEFROM_VIOLET_HOLD: '逃离紫罗兰监狱', LOE: '探险者协会',
  REVENDRETH: '纳斯利亚堡的悬案', RETURN_OF_THE_LICH_KING: '巫妖王的进军',
  STORMWIND: '暴风城下的集结', TIME_TRAVEL: '穿越时间流', THE_LOST_CITY: '安戈洛龟途',
  WHIZBANGS_WORKSHOP: '威兹班的工坊', THE_SUNKEN_CITY: '探寻沉没之城', TITANS: '泰坦诸神',
  ULDUM: '奥丹姆奇兵', ISLAND_VACATION: '胜地历险记', WILD_WEST: '决战荒芜之地',
  DARKMOON_FAIRE: '疯狂的暗月马戏团', EVENT: '活动'
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
  return value.replace(/<i>(.*?)<\/i>/g, '《$1》').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export function isCosmeticCoin(card) {
  return card?.type === 'SPELL' && card.cost === 0 && card.name === '幸运币' && /COIN/i.test(card.id || '')
}

export function splitCoinFlavor(value = '') {
  const parts = value.split(/\r?\n/).map(stripMarkup).filter(Boolean)
  return { flavorText: parts[0] || '', howToGet: parts.slice(1).join(' ') || '' }
}

function buildDisplayNames(cards) {
  const officialNames = existsSync(coinMappingPath)
    ? new Map(JSON.parse(readFileSync(coinMappingPath, 'utf8')).map((item) => [item.cardId, item.officialName]))
    : new Map()
  const totals = new Map()
  const used = new Map()
  for (const card of cards) totals.set(card.set, (totals.get(card.set) || 0) + 1)
  return cards.map((card) => {
    const sequence = (used.get(card.set) || 0) + 1
    used.set(card.set, sequence)
    const officialName = officialNames.get(card.id)
    if (officialName) return officialName
    const baseName = `${setNames[card.set] || card.set || '特殊活动'}幸运币`
    return totals.get(card.set) > 1 ? `${baseName} ${sequence}` : baseName
  })
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`数据请求失败：HTTP ${response.status}`)
  return response.json()
}

async function downloadImage(url, outputPath, force) {
  if (!force && existsSync(outputPath)) return false
  const response = await fetch(url)
  if (!response.ok) throw new Error(`图片下载失败：${url}（HTTP ${response.status}）`)
  if (!(response.headers.get('content-type') || '').startsWith('image/')) throw new Error(`响应不是图片：${url}`)
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()))
  return true
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv)
  const sourceRoot = resolve(args.source || process.env.HS_COSMETICS_SOURCE_DIR || 'E:/github/my-heartstone/hearthstone_cosmetics')
  const coinDirectory = join(sourceRoot, 'coins')
  await mkdir(coinDirectory, { recursive: true })

  console.log(`读取中文幸运币资料：${sourceUrl}`)
  const sourceCards = await fetchJson(sourceUrl)
  const cards = sourceCards.filter(isCosmeticCoin).sort((a, b) => a.dbfId - b.dbfId)
  const displayNames = buildDisplayNames(cards)
  const coins = []
  let downloaded = 0

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index]
    const fileName = `${card.id}.png`
    const imageUrl = `${imageBaseUrl}/${encodeURIComponent(card.id)}.png`
    const imagePath = join(coinDirectory, fileName)
    const details = splitCoinFlavor(card.flavor)
    const metadata = {
      name: displayNames[index], cardId: card.id, dbfId: card.dbfId,
      flavorText: details.flavorText, howToGet: details.howToGet, availability: '',
      sourceUrl: `https://hearthstone.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(card.id)}`
    }
    if (await downloadImage(imageUrl, imagePath, args.force)) downloaded += 1
    await writeFile(join(coinDirectory, `${card.id}.json`), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
    coins.push({
      id: `coins-${card.id.toLocaleLowerCase()}`,
      cardId: card.id,
      dbfId: card.dbfId,
      cosmeticCoinId: null,
      officialName: metadata.name,
      flavorText: metadata.flavorText, howToGet: metadata.howToGet,
      availability: metadata.availability,
      localImagePath: `coins/${fileName}`,
      ossObjectKey: `hearthstone-cosmetics/coins/${fileName}`,
      imageUrl: `/hearthstone-cosmetics/coins/${fileName}`,
      source: 'HearthstoneJSON',
      sourceUrl: metadata.sourceUrl
    })
    console.log(`[${index + 1}/${cards.length}] ${metadata.name}（${card.id}）`)
  }

  await writeFile(manifestPath, `${JSON.stringify(coins, null, 2)}\n`, 'utf8')
  console.log(`幸运币下载完成：总计 ${coins.length}，本次新增或覆盖 ${downloaded}`)
  console.log(`本地目录：${coinDirectory}`)
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
