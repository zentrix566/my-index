#!/usr/bin/env node
/** 从本机 Hearthstone Unity 资源中提取简体中文卡背资料和主纹理。 */
import { existsSync, readFileSync } from 'node:fs'
import { copyFile, cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const manifestPath = join(repoRoot, 'src/features/hearthstone/data/card-backs.json')
const mappingPath = join(repoRoot, 'src/features/hearthstone/data/card-back-map.json')
const defaultGameDirectory = 'E:/Hearthstone'
const defaultSourceDirectory = 'E:/github/my-heartstone/hearthstone_cosmetics'
const defaultAssetStudioPath = join(
  repoRoot,
  '.local-tools/assetstudio-net472/AssetStudioModCLI_net472_win32_64/AssetStudioModCLI.exe'
)
const defaultWorkDirectory = join(repoRoot, '.hs-extract/card-backs')
const zhCnIndex = 12
const prefabTextureAliases = {
  BCLegendaryQuest: 'Card_Back_Legendary_Quests_Blizzcon',
  February2025: 'Card_Back_February2025',
  Gelbin_Makkatorque: 'Card_Back_GelbinMekkatorque',
  JimRaynor: 'Card_Back_JimRaynor',
  Murgulus: 'Card_Back_Murgulus',
  Card_Back_Draka: 'Card_Back_Warlord_Draka',
  'Card_Back_Koi _With_Lily': 'Card_Back_Koi',
  Card_Back_Maiev_DFT: 'Card_Back_Maiev'
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
  const args = {
    force: false,
    gameDirectory: '',
    sourceDirectory: '',
    assetStudioPath: '',
    workDirectory: ''
  }
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--force') args.force = true
    else if (argument === '--game-dir') args.gameDirectory = resolve(argv[++index])
    else if (argument === '--source') args.sourceDirectory = resolve(argv[++index])
    else if (argument === '--asset-studio') args.assetStudioPath = resolve(argv[++index])
    else if (argument === '--work-dir') args.workDirectory = resolve(argv[++index])
    else throw new Error(`未知参数：${argument}`)
  }
  return args
}

async function walkFiles(directory, predicate = () => true) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walkFiles(entryPath, predicate))
    else if (predicate(entryPath)) files.push(entryPath)
  }
  return files
}

function runAssetStudio(executable, input, output, assetType, filter = '') {
  const args = [
    input,
    '--mode', 'export',
    '--asset-type', assetType,
    '--group-option', 'fileName',
    '--filename-format', 'assetName_pathID',
    '--output', output,
    '--overwrite-existing',
    '--unity-version', '6000.3.11f1',
    '--log-level', 'warning'
  ]
  if (filter) args.push('--filter-by-name', filter, '--filter-with-regex')
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit', windowsHide: true })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`AssetStudio 执行失败，退出码：${code}`))
    })
  })
}

function assetName(filePath) {
  return basename(filePath, extname(filePath)).replace(/ @-?\d+$/, '')
}

function normalizeAssetName(value) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '')
}

function scoreTexture(prefabName, texturePath) {
  const name = assetName(texturePath)
  const normalizedPrefab = normalizeAssetName(prefabTextureAliases[prefabName] || prefabName)
  const normalizedName = normalizeAssetName(name)
  if (!normalizedName.startsWith(normalizedPrefab)) return -1

  let score = normalizedPrefab.length * 10 - (normalizedName.length - normalizedPrefab.length)
  if (normalizedName === `${normalizedPrefab}comp`) score += 1000
  else if (normalizedName === `${normalizedPrefab}texture`) score += 950
  else if (normalizedName === `${normalizedPrefab}diffuse`) score += 900
  else if (normalizedName === normalizedPrefab) score += 850
  else if (/(mask|echo|flowmap|normalmap|vat|glow|fx|ripple|dissolve|emissive|alpha)$/i.test(normalizedName)) return -1
  else if (/(comp|texture|diffuse|base|premium)$/i.test(normalizedName)) score += 500
  return score
}

function chooseTexture(prefabName, texturePaths) {
  return texturePaths
    .map((path) => ({ path, score: scoreTexture(prefabName, path) }))
    .filter((candidate) => candidate.score >= 0)
    .sort((left, right) => right.score - left.score)[0]?.path || ''
}

function cleanText(value = '') {
  return value
    .replace(/\[b\]/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .trim()
}

function splitDescription(value = '') {
  const sections = cleanText(value).split(/\n\s*\n/).map((part) => part.replace(/\n/g, ' ').trim()).filter(Boolean)
  return {
    flavorText: sections[0] || '',
    howToGet: sections.slice(1).join(' ') || ''
  }
}

async function stageClientBundles(gameDirectory, stagingDirectory) {
  const winDirectory = join(gameDirectory, 'Data/Win')
  if (!existsSync(winDirectory)) throw new Error(`没有找到游戏资源目录：${winDirectory}`)
  await rm(stagingDirectory, { recursive: true, force: true })
  await mkdir(stagingDirectory, { recursive: true })

  const bundleNames = (await readdir(winDirectory)).filter((name) => (
    name === 'dbf.unity3d' || /^initial_base_global-34be6ac6-texture-\d+\.unity3d$/i.test(name)
  ))
  if (!bundleNames.includes('dbf.unity3d')) throw new Error('游戏目录中缺少 dbf.unity3d')
  for (const name of bundleNames) {
    await copyFile(join(winDirectory, name), join(stagingDirectory, name))
  }
  return bundleNames.length
}

async function prepareExtractedAssets(options) {
  const stagingDirectory = join(options.workDirectory, 'bundles')
  const dbfDirectory = join(options.workDirectory, 'dbf')
  const textureDirectory = join(options.workDirectory, 'textures')
  const bundleCount = await stageClientBundles(options.gameDirectory, stagingDirectory)
  await rm(dbfDirectory, { recursive: true, force: true })
  await rm(textureDirectory, { recursive: true, force: true })
  await mkdir(dbfDirectory, { recursive: true })
  await mkdir(textureDirectory, { recursive: true })

  console.log(`正在解码 ${bundleCount} 个客户端资源包……`)
  await runAssetStudio(options.assetStudioPath, join(stagingDirectory, 'dbf.unity3d'), dbfDirectory, 'monoBehaviour', '^CARD_BACK$')
  await runAssetStudio(options.assetStudioPath, stagingDirectory, textureDirectory, 'tex2d', '(?i)^card.?back')
  return { dbfDirectory, textureDirectory }
}

async function importCardBacks(options, extracted) {
  const dbfFiles = await walkFiles(extracted.dbfDirectory, (path) => basename(path).startsWith('CARD_BACK') && path.endsWith('.json'))
  if (dbfFiles.length !== 1) throw new Error(`应当找到 1 个 CARD_BACK 数据表，实际找到 ${dbfFiles.length} 个`)
  const table = JSON.parse(await readFile(dbfFiles[0], 'utf8'))
  const records = table.Records.filter((record) => record.m_enabled && record.m_prefabName)
  const texturePaths = await walkFiles(extracted.textureDirectory, (path) => path.endsWith('.png'))
  const cardBackDirectory = join(options.sourceDirectory, 'card-backs')
  await mkdir(cardBackDirectory, { recursive: true })

  const cardBacks = []
  const mappings = []
  const unmatched = []
  let copied = 0
  for (const record of records) {
    const [prefabName, prefabGuid = ''] = record.m_prefabName.split('.prefab:')
    const texturePath = chooseTexture(prefabName, texturePaths)
    const name = cleanText(record.m_name?.m_locValues?.[zhCnIndex]) || prefabName
    const description = splitDescription(record.m_description?.m_locValues?.[zhCnIndex])
    const relativeImagePath = texturePath ? `card-backs/${record.m_ID}.png` : null
    const ossObjectKey = relativeImagePath ? `hearthstone-cosmetics/${relativeImagePath}` : null
    mappings.push({
      cardBackId: record.m_ID,
      officialName: name,
      prefabName,
      prefabGuid,
      textureName: texturePath ? assetName(texturePath) : null,
      flavorText: description.flavorText,
      howToGet: description.howToGet,
      localImagePath: relativeImagePath,
      ossObjectKey,
      imageUrl: ossObjectKey ? `/${ossObjectKey.split('/').map(encodeURIComponent).join('/')}` : null,
      source: 'Hearthstone 客户端 CARD_BACK'
    })
    if (!texturePath) {
      unmatched.push({ id: record.m_ID, name, prefabName })
      continue
    }

    const cardBackId = String(record.m_ID)
    const imageFileName = `${cardBackId}.png`
    const imagePath = join(cardBackDirectory, imageFileName)
    const metadata = {
      name,
      cardBackId: record.m_ID,
      prefabName,
      prefabGuid,
      flavorText: description.flavorText,
      howToGet: description.howToGet,
      availability: '',
      source: 'Hearthstone 本地客户端'
    }
    if (options.force || !existsSync(imagePath)) {
      await cp(texturePath, imagePath)
      copied += 1
    }
    await writeFile(join(cardBackDirectory, `${cardBackId}.json`), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
    cardBacks.push({
      id: `card-backs-${cardBackId}`,
      cardBackId: record.m_ID,
      officialName: name,
      prefabName,
      prefabGuid,
      textureName: assetName(texturePath),
      flavorText: description.flavorText,
      howToGet: description.howToGet,
      availability: '',
      localImagePath: relativeImagePath,
      ossObjectKey,
      imageUrl: `/${ossObjectKey.split('/').map(encodeURIComponent).join('/')}`,
      source: 'Hearthstone 客户端 CARD_BACK',
      sourceUrl: ''
    })
  }

  cardBacks.sort((left, right) => Number(left.id.split('-').at(-1)) - Number(right.id.split('-').at(-1)))
  mappings.sort((left, right) => left.cardBackId - right.cardBackId)
  await writeFile(mappingPath, `${JSON.stringify(mappings, null, 2)}\n`, 'utf8')
  await writeFile(manifestPath, `${JSON.stringify(cardBacks, null, 2)}\n`, 'utf8')
  const report = {
    gameDirectory: options.gameDirectory,
    clientRecords: records.length,
    imported: cardBacks.length,
    copied,
    unmatched
  }
  await writeFile(join(options.workDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`卡背提取完成：导入 ${cardBacks.length}/${records.length}，本次复制 ${copied} 张图片`)
  console.log(`本地目录：${cardBackDirectory}`)
  console.log(`未匹配报告：${join(options.workDirectory, 'report.json')}`)
  console.log(`映射表：${mappingPath}`)
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv)
  const options = {
    force: args.force,
    gameDirectory: resolve(args.gameDirectory || process.env.HS_GAME_DIR || defaultGameDirectory),
    sourceDirectory: resolve(args.sourceDirectory || process.env.HS_COSMETICS_SOURCE_DIR || defaultSourceDirectory),
    assetStudioPath: resolve(args.assetStudioPath || process.env.HS_ASSET_STUDIO_PATH || defaultAssetStudioPath),
    workDirectory: resolve(args.workDirectory || defaultWorkDirectory)
  }
  if (!existsSync(options.assetStudioPath)) {
    throw new Error(`没有找到 AssetStudioModCLI：${options.assetStudioPath}`)
  }
  await mkdir(options.workDirectory, { recursive: true })
  const extracted = await prepareExtractedAssets(options)
  await importCardBacks(options, extracted)
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
