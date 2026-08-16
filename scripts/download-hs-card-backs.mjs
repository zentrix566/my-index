#!/usr/bin/env node
/** 通过暴雪官方 Hearthstone Game Data API 下载中文卡背与元数据。 */
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const manifestPath = join(repoRoot, 'public/hearthstone/card-backs.json')

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

async function getAccessToken(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })
  if (!response.ok) throw new Error(`暴雪 OAuth 请求失败：HTTP ${response.status}`)
  return (await response.json()).access_token
}

async function main() {
  loadEnv()
  const clientId = process.env.BLIZZARD_CLIENT_ID
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('缺少 BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET，请在暴雪开发者门户创建 OAuth 客户端后填写到 .env')
  }
  const sourceRoot = resolve(process.env.HS_COSMETICS_SOURCE_DIR || 'E:/github/my-heartstone/hearthstone_cosmetics')
  const directory = join(sourceRoot, 'card-backs')
  await mkdir(directory, { recursive: true })
  const token = await getAccessToken(clientId, clientSecret)
  const cardBacks = []
  let page = 1
  let pageCount = 1
  do {
    const response = await fetch(`https://us.api.blizzard.com/hearthstone/cardbacks?locale=zh_CN&pageSize=100&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok) throw new Error(`暴雪卡背请求失败：HTTP ${response.status}`)
    const payload = await response.json()
    cardBacks.push(...(payload.cardBacks || []))
    pageCount = payload.pageCount || 1
    page += 1
  } while (page <= pageCount)
  const manifestItems = []

  for (let index = 0; index < cardBacks.length; index += 1) {
    const item = cardBacks[index]
    if (!item.image) continue
    const extension = extname(new URL(item.image).pathname) || '.png'
    const fileName = `${item.id}${extension}`
    const imageResponse = await fetch(item.image)
    if (!imageResponse.ok) throw new Error(`卡背 ${item.id} 图片下载失败：HTTP ${imageResponse.status}`)
    await writeFile(join(directory, fileName), Buffer.from(await imageResponse.arrayBuffer()))
    const metadata = {
      name: item.name || `卡背 ${item.id}`, cardBackId: item.id,
      flavorText: item.text || item.description || '',
      howToGet: item.howToGet || item.sourceDescription || '',
      availability: item.enabled === false ? '当前未启用' : '',
      sourceUrl: `https://develop.battle.net/documentation/hearthstone/game-data-apis`
    }
    await writeFile(join(directory, `${item.id}.json`), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
    manifestItems.push({
      id: `card-backs-${item.id}`,
      cardBackId: item.id,
      officialName: metadata.name,
      flavorText: metadata.flavorText, howToGet: metadata.howToGet,
      availability: metadata.availability,
      localImagePath: `card-backs/${fileName}`,
      ossObjectKey: `hearthstone-cosmetics/card-backs/${fileName}`,
      imageUrl: `/hearthstone-cosmetics/card-backs/${fileName}`,
      source: '暴雪 Hearthstone Game Data API',
      sourceUrl: metadata.sourceUrl
    })
    if ((index + 1) % 25 === 0) console.log(`卡背进度：${index + 1}/${cardBacks.length}`)
  }

  await writeFile(manifestPath, `${JSON.stringify(manifestItems, null, 2)}\n`, 'utf8')
  console.log(`卡背下载完成：${manifestItems.length}`)
  console.log(`本地目录：${directory}`)
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
