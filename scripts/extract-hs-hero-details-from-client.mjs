#!/usr/bin/env node
/** 从本机 Hearthstone 客户端补全英雄皮肤的简体中文描述、获取方式与客户端内部 ID，并直接写回 hero-skins.json。 */
import { existsSync, readFileSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const manifestPath = join(repoRoot, 'src/features/hearthstone/data/hero-skins.json')
const defaultGameDirectory = 'E:/Hearthstone'
const defaultSourceDirectory = 'E:/github/my-heartstone/hearthstone_cosmetics'
const defaultAssetStudioPath = join(
  repoRoot,
  '.local-tools/assetstudio-net472/AssetStudioModCLI_net472_win32_64/AssetStudioModCLI.exe'
)
const defaultWorkDirectory = join(repoRoot, '.hs-extract/hero-details')
const zhCnIndex = 12
const acquisitionPattern = /^(?:获得|获取|参与|参加|完成|购买|达到|通过|使用|解锁|预购|可以|可通过|可在|在.+(?:获得|购买)|拥有)/
const heroClassByFolder = {
  'death-knight': '死亡骑士', 'demon-hunter': '恶魔猎手', druid: '德鲁伊', hunter: '猎人',
  mage: '法师', paladin: '圣骑士', priest: '牧师', rogue: '潜行者', shaman: '萨满祭司',
  warlock: '术士', warrior: '战士'
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
  const args = { gameDirectory: '', sourceDirectory: '', assetStudioPath: '', workDirectory: '' }
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--game-dir') args.gameDirectory = resolve(argv[++index])
    else if (argv[index] === '--source') args.sourceDirectory = resolve(argv[++index])
    else if (argv[index] === '--asset-studio') args.assetStudioPath = resolve(argv[++index])
    else if (argv[index] === '--work-dir') args.workDirectory = resolve(argv[++index])
    else throw new Error(`未知参数：${argv[index]}`)
  }
  return args
}

function runAssetStudio(executable, input, output) {
  const args = [
    input,
    '--mode', 'export',
    '--asset-type', 'monoBehaviour',
    '--group-option', 'none',
    '--filename-format', 'assetName_pathID',
    '--output', output,
    '--overwrite-existing',
    '--unity-version', '6000.3.11f1',
    '--filter-by-name', '^CARD_HERO$',
    '--filter-with-regex',
    '--log-level', 'warning'
  ]
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit', windowsHide: true })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`AssetStudio 执行失败，退出码：${code}`))
    })
  })
}

function cleanText(value = '') {
  return value.replace(/\[b\]/gi, '').replace(/<[^>]+>/g, '').replace(/\r/g, '').trim()
}

export function splitHeroClientDescription(value = '') {
  const parts = cleanText(value)
    .split(/\n\s*\n|\n/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) {
    return acquisitionPattern.test(parts[0] || '')
      ? { flavorText: '', howToGet: parts[0] }
      : { flavorText: parts[0] || '', howToGet: '' }
  }
  const lastPart = parts.at(-1)
  if (acquisitionPattern.test(lastPart)) {
    return { flavorText: parts.slice(0, -1).join(' '), howToGet: lastPart }
  }
  return { flavorText: parts.join(' '), howToGet: '' }
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv)
  const gameDirectory = resolve(args.gameDirectory || process.env.HS_GAME_DIR || defaultGameDirectory)
  const sourceDirectory = resolve(args.sourceDirectory || process.env.HS_COSMETICS_SOURCE_DIR || defaultSourceDirectory)
  const assetStudioPath = resolve(args.assetStudioPath || process.env.HS_ASSET_STUDIO_PATH || defaultAssetStudioPath)
  const workDirectory = resolve(args.workDirectory || defaultWorkDirectory)
  const dbfBundlePath = join(gameDirectory, 'Data/Win/dbf.unity3d')
  const stagedBundlePath = join(workDirectory, 'dbf.unity3d')
  const outputDirectory = join(workDirectory, 'dbf')
  if (!existsSync(assetStudioPath)) throw new Error(`没有找到 AssetStudioModCLI：${assetStudioPath}`)
  if (!existsSync(dbfBundlePath)) throw new Error(`没有找到游戏数据：${dbfBundlePath}`)

  await rm(workDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })
  await copyFile(dbfBundlePath, stagedBundlePath)
  await runAssetStudio(assetStudioPath, stagedBundlePath, outputDirectory)
  const tableFile = (await readdir(outputDirectory)).find((name) => name.startsWith('CARD_HERO') && name.endsWith('.json'))
  if (!tableFile) throw new Error('没有从客户端提取到 CARD_HERO 数据表')

  const table = JSON.parse(await readFile(join(outputDirectory, tableFile), 'utf8'))
  const recordsByDbfId = new Map(table.Records.map((record) => [record.m_cardId, record]))
  const heroRoot = join(sourceDirectory, 'hero-skins')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const manifestByCardId = new Map(manifest.map((item) => [item.id.replace(/^hero-skins-/, '').toLocaleUpperCase(), item]))
  let updated = 0
  let withFlavorText = 0
  let withHowToGet = 0

  for (const heroFolder of await readdir(heroRoot)) {
    const heroClass = heroClassByFolder[heroFolder]
    if (!heroClass) continue
    const heroDirectory = join(heroRoot, heroFolder)
    const metadataFiles = (await readdir(heroDirectory)).filter((name) => name.endsWith('.json'))
    for (const fileName of metadataFiles) {
      const metadataPath = join(heroDirectory, fileName)
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
      const record = recordsByDbfId.get(metadata.dbfId)
      const details = record
        ? splitHeroClientDescription(record.m_description?.m_locValues?.[zhCnIndex])
        : { flavorText: metadata.flavorText || '', howToGet: metadata.howToGet || '' }
      if (!record) continue
      metadata.flavorText = details.flavorText
      metadata.howToGet = details.howToGet
      metadata.source = 'Hearthstone 本地客户端'
      await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
      const manifestItem = manifestByCardId.get(metadata.cardId.toLocaleUpperCase())
      if (manifestItem) {
        manifestItem.flavorText = details.flavorText
        manifestItem.howToGet = details.howToGet
        manifestItem.cosmeticHeroId = record?.m_ID ?? null
      }
      updated += 1
      if (details.flavorText) withFlavorText += 1
      if (details.howToGet) withHowToGet += 1
    }
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`英雄皮肤资料补全完成：更新 ${updated}，风味描述 ${withFlavorText}，获取方式 ${withHowToGet}`)
  console.log(`本地目录：${heroRoot}`)
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
