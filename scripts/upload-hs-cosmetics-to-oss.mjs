#!/usr/bin/env node
/** 上传炉石外观图片并生成前端清单。 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const dataDirectory = join(repoRoot, 'src/features/hearthstone/data')
const prefix = 'hearthstone-cosmetics'
const supportedImage = /\.(?:avif|gif|jpe?g|png|webp)$/i

try {
  const envPath = join(repoRoot, '.env')
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  }
} catch {}

const sourceRoot = resolve(process.env.HS_COSMETICS_SOURCE_DIR || 'E:/github/my-heartstone/hearthstone_cosmetics')

function itemId(type, relativePath) {
  return `${type}-${createHash('sha1').update(relativePath).digest('hex').slice(0, 16)}`
}

function displayName(filePath) {
  return basename(filePath, extname(filePath)).replace(/[_-]+/g, ' ').trim()
}

async function readMetadata(filePath) {
  const metadataPath = filePath.slice(0, -extname(filePath).length) + '.json'
  if (!existsSync(metadataPath)) return {}
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  return {
    ...(typeof metadata.name === 'string' ? { name: metadata.name.trim() } : {}),
    ...(typeof metadata.cardId === 'string' ? { cardId: metadata.cardId.trim() } : {}),
    ...(Number.isInteger(metadata.cardBackId) ? { cardBackId: metadata.cardBackId } : {}),
    ...(Number.isInteger(metadata.dbfId) ? { dbfId: metadata.dbfId } : {}),
    ...(Number.isInteger(metadata.cosmeticHeroId) ? { cosmeticHeroId: metadata.cosmeticHeroId } : {}),
    ...(Number.isInteger(metadata.cosmeticCoinId) ? { cosmeticCoinId: metadata.cosmeticCoinId } : {}),
    ...(typeof metadata.prefabName === 'string' ? { prefabName: metadata.prefabName.trim() } : {}),
    ...(typeof metadata.prefabGuid === 'string' ? { prefabGuid: metadata.prefabGuid.trim() } : {}),
    ...(typeof metadata.flavorText === 'string' ? { flavorText: metadata.flavorText.trim() } : {}),
    ...(typeof metadata.howToGet === 'string' ? { howToGet: metadata.howToGet.trim() } : {}),
    ...(typeof metadata.availability === 'string' ? { availability: metadata.availability.trim() } : {}),
    ...(typeof metadata.sourceUrl === 'string' ? { sourceUrl: metadata.sourceUrl.trim() } : {})
  }
}

async function collectFiles(directory) {
  if (!existsSync(directory)) return []
  const output = []
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const filePath = join(current, entry.name)
      if (entry.isDirectory()) await walk(filePath)
      else if (entry.isFile() && supportedImage.test(entry.name)) output.push(filePath)
    }
  }
  await walk(directory)
  return output
}

const definitions = [
  { id: 'heroSkins', folder: 'hero-skins', nested: true },
  { id: 'coins', folder: 'coins', nested: false },
  { id: 'cardBacks', folder: 'card-backs', nested: false }
]
const heroClassByFolder = {
  'death-knight': '死亡骑士', 'demon-hunter': '恶魔猎手', druid: '德鲁伊', hunter: '猎人',
  mage: '法师', paladin: '圣骑士', priest: '牧师', rogue: '潜行者', shaman: '萨满祭司',
  warlock: '术士', warrior: '战士'
}
const targets = []
const manifest = { heroSkins: [], coins: [], cardBacks: [] }

for (const definition of definitions) {
  for (const filePath of await collectFiles(join(sourceRoot, definition.folder))) {
    const relativePath = relative(sourceRoot, filePath).split('\\').join('/')
    const pathParts = relativePath.split('/')
    if (definition.nested && pathParts.length < 3) {
      throw new Error(`英雄皮肤必须放在“hero-skins/职业英文目录/图片”：${filePath}`)
    }
    if (!definition.nested && pathParts.length !== 2) {
      throw new Error(`${definition.folder}图片必须直接放在“${definition.folder}/”下：${filePath}`)
    }
    const key = `${prefix}/${relativePath}`
    targets.push({ filePath, key })
    const metadata = await readMetadata(filePath)
    manifest[definition.id].push({
      id: metadata.cardId
        ? `${definition.id === 'heroSkins' ? 'hero-skins' : 'coins'}-${metadata.cardId.toLocaleLowerCase()}`
        : Number.isInteger(metadata.cardBackId)
          ? `card-backs-${metadata.cardBackId}`
          : itemId(definition.id, relativePath),
      ...(typeof metadata.cardId === 'string' ? { cardId: metadata.cardId } : {}),
      ...(Number.isInteger(metadata.cardBackId) ? { cardBackId: metadata.cardBackId } : {}),
      ...(Number.isInteger(metadata.dbfId) ? { dbfId: metadata.dbfId } : {}),
      ...(Number.isInteger(metadata.cosmeticHeroId) ? { cosmeticHeroId: metadata.cosmeticHeroId } : {}),
      ...(Number.isInteger(metadata.cosmeticCoinId) ? { cosmeticCoinId: metadata.cosmeticCoinId } : {}),
      ...(typeof metadata.prefabName === 'string' ? { prefabName: metadata.prefabName } : {}),
      ...(typeof metadata.prefabGuid === 'string' ? { prefabGuid: metadata.prefabGuid } : {}),
      ...(definition.nested ? { heroClass: heroClassByFolder[pathParts[1]] || pathParts[1] } : {}),
      officialName: metadata.name || displayName(filePath),
      flavorText: metadata.flavorText || '',
      howToGet: metadata.howToGet || '',
      availability: metadata.availability || '',
      localImagePath: relativePath,
      ossObjectKey: key,
      imageUrl: `/${key.split('/').map(encodeURIComponent).join('/')}`,
      source: '本地外观元数据',
      sourceUrl: metadata.sourceUrl || ''
    })
  }
}

for (const list of Object.values(manifest)) {
  list.sort((a, b) => `${a.heroClass || ''}${a.officialName}`.localeCompare(`${b.heroClass || ''}${b.officialName}`, 'zh-CN'))
}
await writeFile(join(dataDirectory, 'hero-skins.json'), `${JSON.stringify(manifest.heroSkins, null, 2)}\n`, 'utf8')
await writeFile(join(dataDirectory, 'coins.json'), `${JSON.stringify(manifest.coins, null, 2)}\n`, 'utf8')
await writeFile(join(dataDirectory, 'card-backs.json'), `${JSON.stringify(manifest.cardBacks, null, 2)}\n`, 'utf8')
console.log(`已生成收藏清单：英雄皮肤 ${manifest.heroSkins.length}、幸运币 ${manifest.coins.length}、卡背 ${manifest.cardBacks.length}`)

if (process.env.OSS_DRY_RUN === '1') {
  for (const target of targets) console.log(`[DRY-RUN] ${target.key}`)
  process.exit(0)
}

const { OSS_BUCKET: bucket, OSS_ACCESS_KEY_ID: accessKeyId, OSS_ACCESS_KEY_SECRET: accessKeySecret } = process.env
const region = process.env.OSS_REGION || 'cn-beijing'
if (!bucket || !accessKeyId || !accessKeySecret) {
  throw new Error('缺少 OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET')
}
const ossModule = await import('ali-oss')
const Client = ossModule.default || ossModule
const client = new Client({ region: `oss-${region}`, accessKeyId, accessKeySecret, bucket })
let uploaded = 0
for (const target of targets) {
  await stat(target.filePath)
  if (process.env.OSS_SKIP_EXISTING !== '0') {
    try {
      await client.head(target.key)
      continue
    } catch (error) {
      if (error.code !== 'NoSuchKey' && error.status !== 404) throw error
    }
  }
  await client.put(target.key, target.filePath, { headers: { 'x-oss-object-acl': 'public-read' } })
  uploaded += 1
}
console.log(`上传完成：新增 ${uploaded}，总清单 ${targets.length}`)
